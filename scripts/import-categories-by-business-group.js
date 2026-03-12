#!/usr/bin/env node

/**
 * Import Categories and Subcategories for Each Business Group from Excel
 * 
 * Expected Excel Format:
 * Column A: Business Group Name
 * Column B: Category
 * Column C: Subcategory
 * Column D: Description (optional)
 * 
 * OR alternative format:
 * Column A: Category
 * Column B: Subcategory  
 * Column C: Business Group Name
 * Column D: Description (optional)
 */

require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { Client } = require('pg');
const path = require('path');

async function importCategoriesByBusinessGroup(excelFilePath) {
  console.log('📄 Reading Excel file:', excelFilePath);
  
  // Read the Excel file
  const workbook = XLSX.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);

  console.log(`✓ Found ${data.length} rows of data in sheet: ${sheetName}\n`);

  // Show first row to help identify columns
  if (data.length > 0) {
    console.log('📋 First row columns:', Object.keys(data[0]).join(', '));
    console.log('📋 First row data:', data[0]);
    console.log('');
  }

  // Connect to database
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL 
  });
  
  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Get all business groups from database
    const bgResult = await client.query('SELECT id, name FROM business_unit_groups ORDER BY name');
    const businessGroupsMap = new Map();
    bgResult.rows.forEach(bg => {
      businessGroupsMap.set(bg.name.toLowerCase().trim(), bg.id);
    });
    
    console.log(`✓ Found ${businessGroupsMap.size} business groups in database:`);
    bgResult.rows.forEach(bg => console.log(`  - ${bg.name} (ID: ${bg.id})`));
    console.log('');

    // Parse data and organize by business group
    const dataByBusinessGroup = new Map();
    const categoriesSet = new Set();
    const subcategoriesMap = new Map(); // key: "category|subcategory"
    
    let skippedRows = 0;

    // Track functional areas and their SPOCs
    const functionalAreasMap = new Map(); // key: FA name (lowercase), value: { name, spoc }
    
    data.forEach((row, index) => {
      // Try to identify columns (flexible column names)
      const businessGroup = row['Business Group'] || row['BusinessGroup'] || row['Group'] || 
                           row['business_group'] || row['Target Business Group'];
      const category = row['Category'] || row['category'] || row['Cat'];
      const subcategory = row['Subcategory'] || row['Sub Category'] || row['SubCategory'] || 
                         row['subcategory'] || row['sub_category'];
      const description = row['Description'] || row['description'] || row['Desc'] || '';
      const functionalArea = row['Functional Area'] || row['FunctionalArea'] || row['FA'] || 
                            row['functional_area'] || row['Organization'] || '';
      const faSpoc = row['FA SPOC'] || row['SPOC'] || row['FA_SPOC'] || 
                    row['spoc'] || row['fa_spoc'] || '';

      if (!businessGroup || !category || !subcategory) {
        console.log(`⚠️  Row ${index + 2}: Missing required fields - skipping`);
        console.log(`   Business Group: "${businessGroup}", Category: "${category}", Subcategory: "${subcategory}"`);
        skippedRows++;
        return;
      }

      const bgKey = businessGroup.toString().toLowerCase().trim();
      
      if (!businessGroupsMap.has(bgKey)) {
        console.log(`⚠️  Row ${index + 2}: Business group "${businessGroup}" not found in database - skipping`);
        skippedRows++;
        return;
      }

      const bgId = businessGroupsMap.get(bgKey);

      if (!dataByBusinessGroup.has(bgId)) {
        dataByBusinessGroup.set(bgId, {
          name: businessGroup,
          categories: new Map()
        });
      }

      const bgData = dataByBusinessGroup.get(bgId);
      
      if (!bgData.categories.has(category)) {
        bgData.categories.set(category, []);
      }

      bgData.categories.get(category).push({
        name: subcategory,
        description: description || `${subcategory} for ${category}`
      });

      categoriesSet.add(category);
      subcategoriesMap.set(`${bgId}-${category}|${subcategory}`, {
        businessGroupId: bgId,
        category,
        subcategory,
        description
      });

      // Track functional areas
      if (functionalArea) {
        const faKey = functionalArea.toString().toLowerCase().trim();
        if (!functionalAreasMap.has(faKey)) {
          functionalAreasMap.set(faKey, {
            name: functionalArea.toString().trim(),
            spoc: faSpoc ? faSpoc.toString().trim() : null
          });
        }
      }
    });

    console.log(`\n📊 Data Summary:`);
    console.log(`  Total rows processed: ${data.length}`);
    console.log(`  Skipped rows: ${skippedRows}`);
    console.log(`  Unique categories: ${categoriesSet.size}`);
    console.log(`  Unique subcategories: ${subcategoriesMap.size}`);
    console.log(`  Business groups with data: ${dataByBusinessGroup.size}`);
    console.log(`  Functional areas found: ${functionalAreasMap.size}\n`);
    
    if (functionalAreasMap.size > 0) {
      console.log('📋 Functional Areas to be created/updated:');
      functionalAreasMap.forEach((fa, key) => {
        console.log(`  - ${fa.name}${fa.spoc ? ` (SPOC: ${fa.spoc})` : ''}`);
      });
      console.log('');
    }

    // Ask for confirmation
    console.log('⚠️  WARNING: This will DELETE all existing categories, subcategories, and mappings!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Start transaction
    await client.query('BEGIN');

    try {
      // Step 1: Create/Update Functional Areas
      if (functionalAreasMap.size > 0) {
        console.log('📁 Creating/Updating Functional Areas...');
        for (const [faKey, faData] of functionalAreasMap) {
          const checkFA = await client.query(
            'SELECT id FROM functional_areas WHERE LOWER(name) = LOWER($1)',
            [faData.name]
          );
          
          if (checkFA.rows.length > 0) {
            // Update existing FA with SPOC
            await client.query(
              'UPDATE functional_areas SET spoc_name = $1 WHERE id = $2',
              [faData.spoc, checkFA.rows[0].id]
            );
            console.log(`  ✓ Updated FA: ${faData.name}${faData.spoc ? ` (SPOC: ${faData.spoc})` : ''}`);
          } else {
            // Create new FA
            await client.query(
              'INSERT INTO functional_areas (name, spoc_name) VALUES ($1, $2)',
              [faData.name, faData.spoc]
            );
            console.log(`  ✓ Created FA: ${faData.name}${faData.spoc ? ` (SPOC: ${faData.spoc})` : ''}`);
          }
        }
        console.log('✓ Functional Areas processed\n');
      }

      // Step 2: Clear existing data
      console.log('🗑️  Clearing existing data...');
      await client.query('DELETE FROM ticket_classification_mapping');
      await client.query('UPDATE tickets SET category_id = NULL, subcategory_id = NULL');
      await client.query('DELETE FROM subcategories');
      await client.query('DELETE FROM categories');
      console.log('✓ Cleared existing data\n');

      // Step 3: Insert categories per business group
      console.log('📥 Inserting categories (business group specific)...');
      const categoryIds = new Map(); // key: "bgId-categoryName", value: categoryId
      
      // Create categories for each business group
      for (const [bgId, bgData] of dataByBusinessGroup) {
        console.log(`\n  Business Group: ${bgData.name} (ID: ${bgId})`);
        for (const categoryName of bgData.categories.keys()) {
          const result = await client.query(
            'INSERT INTO categories (name, description, business_unit_group_id) VALUES ($1, $2, $3) RETURNING id',
            [categoryName, `${categoryName} related tickets`, bgId]
          );
          const key = `${bgId}-${categoryName}`;
          categoryIds.set(key, result.rows[0].id);
          console.log(`    ✓ ${categoryName} (ID: ${result.rows[0].id})`);
        }
      }
      console.log(`\n  ✓ Total categories created: ${categoryIds.size}`);

      // Step 4: Insert subcategories
      console.log('\n📥 Inserting subcategories...');
      const subcategoryIds = new Map(); // key: "bgId-category|subcategory"
      
      for (const [key, subData] of subcategoriesMap) {
        const categoryKey = `${subData.businessGroupId}-${subData.category}`;
        const categoryId = categoryIds.get(categoryKey);
        
        if (!categoryId) {
          console.log(`  ⚠️  Warning: Category "${subData.category}" not found for BG ID ${subData.businessGroupId} - skipping subcategory "${subData.subcategory}"`);
          continue;
        }
        
        const result = await client.query(
          'INSERT INTO subcategories (category_id, name, description) VALUES ($1, $2, $3) RETURNING id',
          [categoryId, subData.subcategory, subData.description]
        );
        subcategoryIds.set(key, result.rows[0].id);
      }
      console.log(`  ✓ Inserted ${subcategoryIds.size} subcategories`);

      // Step 5: Insert ticket classification mappings
      console.log('\n📥 Creating ticket classification mappings...');
      let mappingCount = 0;

      for (const [bgId, bgData] of dataByBusinessGroup) {
        console.log(`  Processing: ${bgData.name}...`);
        
        for (const [categoryName, subcategories] of bgData.categories) {
          const categoryKey = `${bgId}-${categoryName}`;
          const categoryId = categoryIds.get(categoryKey);
          
          if (!categoryId) {
            console.log(`    ⚠️  Warning: Category "${categoryName}" not found for BG ID ${bgId}`);
            continue;
          }
          
          for (const sub of subcategories) {
            const subKey = `${bgId}-${categoryName}|${sub.name}`;
            const subcategoryId = subcategoryIds.get(subKey);
            
            if (!subcategoryId) {
              console.log(`    ⚠️  Warning: Subcategory "${sub.name}" not found for category "${categoryName}"`);
              continue;
            }
            
            await client.query(
              `INSERT INTO ticket_classification_mapping 
               (target_business_group_id, category_id, subcategory_id, description)
               VALUES ($1, $2, $3, $4)
               ON CONFLICT DO NOTHING`,
              [bgId, categoryId, subcategoryId, sub.description]
            );
            mappingCount++;
          }
        }
        console.log(`    ✓ Created ${bgData.categories.size} category mappings`);
      }

      console.log(`  ✓ Total: ${mappingCount} classification mappings created\n`);

      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully\n');

      // Verify and show results
      console.log('📊 Final Database State:');
      const catCount = await client.query('SELECT COUNT(*) FROM categories');
      const subCount = await client.query('SELECT COUNT(*) FROM subcategories');
      const mapCount = await client.query('SELECT COUNT(*) FROM ticket_classification_mapping');
      
      console.log(`  Categories: ${catCount.rows[0].count}`);
      console.log(`  Subcategories: ${subCount.rows[0].count}`);
      console.log(`  Classification Mappings: ${mapCount.rows[0].count}\n`);

      // Show sample mappings
      console.log('📋 Sample Mappings by Business Group:');
      const sampleMappings = await client.query(`
        SELECT 
          bug.name as business_group,
          c.name as category,
          s.name as subcategory,
          tcm.description
        FROM ticket_classification_mapping tcm
        JOIN business_unit_groups bug ON tcm.target_business_group_id = bug.id
        JOIN categories c ON tcm.category_id = c.id
        JOIN subcategories s ON tcm.subcategory_id = s.id
        ORDER BY bug.name, c.name, s.name
        LIMIT 10
      `);
      
      sampleMappings.rows.forEach(r => {
        console.log(`  ${r.business_group} → ${r.category} → ${r.subcategory}`);
      });

      console.log('\n✅ Import completed successfully!');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('\n❌ Error during import, transaction rolled back');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

// Main execution
const args = process.argv.slice(2);
const excelFile = args[0] || 'categories-data.xlsx';

if (!require('fs').existsSync(excelFile)) {
  console.error(`❌ Error: Excel file not found: ${excelFile}`);
  console.log('\nUsage: node import-categories-by-business-group.js <excel-file-path>');
  console.log('Example: node import-categories-by-business-group.js ./data/categories.xlsx');
  process.exit(1);
}

console.log('🚀 Starting import process...\n');
importCategoriesByBusinessGroup(excelFile);
