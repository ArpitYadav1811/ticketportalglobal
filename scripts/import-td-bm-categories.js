#!/usr/bin/env node

/**
 * Import Categories for TD BM (Tech Delivery Business Management)
 * 
 * Expected Excel Format:
 * Column A: Category
 * Column B: Sub Category
 * Column C: Input (Description)
 * Column D: Estimated hrs
 * 
 * This script will import categories for a specific Business Group (TD BM).
 * You'll be prompted to select which Business Group to import for.
 */

require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const { neon } = require('@neondatabase/serverless');
const path = require('path');
const readline = require('readline');

async function promptForBusinessGroup(businessGroups) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n📋 Available Business Groups:');
  businessGroups.forEach((bg, index) => {
    console.log(`  ${index + 1}. ${bg.name} (ID: ${bg.id})`);
  });
  console.log('');

  return new Promise((resolve) => {
    rl.question('Select Business Group number (or press Enter for "Tech Delivery"): ', (answer) => {
      rl.close();
      
      if (!answer || answer.trim() === '') {
        // Default to Tech Delivery
        const techDelivery = businessGroups.find(bg => 
          bg.name.toLowerCase().includes('tech') || 
          bg.name.toLowerCase().includes('delivery')
        );
        resolve(techDelivery || businessGroups[0]);
      } else {
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < businessGroups.length) {
          resolve(businessGroups[index]);
        } else {
          console.log('❌ Invalid selection, using first Business Group');
          resolve(businessGroups[0]);
        }
      }
    });
  });
}

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
    console.log('📋 Detected columns:', Object.keys(data[0]).join(', '));
    console.log('📋 First row sample:', data[0]);
    console.log('');
  }

  // Connect to database using Neon serverless
  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  
  try {
    console.log('✓ Connected to database\n');

    // Get all business groups from database
    const bgResult = await sql`SELECT id, name FROM business_unit_groups ORDER BY name`;
    
    if (bgResult.length === 0) {
      console.log('❌ No business groups found in database!');
      console.log('Please create Business Groups first in the UI.');
      return;
    }

    // Let user select which Business Group to import for
    const selectedBG = await promptForBusinessGroup(bgResult);
    console.log(`\n✅ Selected Business Group: ${selectedBG.name} (ID: ${selectedBG.id})\n`);

    // Parse data
    const categoriesMap = new Map(); // key: category name, value: { name, subcategories[] }
    let skippedRows = 0;
    
    data.forEach((row, index) => {
      // Try to identify columns (flexible column names)
      const category = row['Category'] || row['category'] || row['CATEGORY'];
      const subcategory = row['Sub Category'] || row['SubCategory'] || row['Subcategory'] || 
                         row['sub_category'] || row['subcategory'] || row['SUB CATEGORY'];
      const description = row['Input'] || row['Description'] || row['input'] || 
                         row['description'] || row['INPUT'] || row['Desc'] || '';
      const estimatedHrs = row['Estimated hrs'] || row['Estimated Hrs'] || row['EstimatedHrs'] || 
                          row['estimated_hrs'] || row['ESTIMATED HRS'] || '';

      if (!category || !subcategory) {
        console.log(`⚠️  Row ${index + 2}: Missing required fields - skipping`);
        console.log(`   Category: "${category}", Subcategory: "${subcategory}"`);
        skippedRows++;
        return;
      }

      const catKey = category.toString().trim();
      
      if (!categoriesMap.has(catKey)) {
        categoriesMap.set(catKey, {
          name: catKey,
          subcategories: []
        });
      }

      // Build description with estimated hours if available
      let fullDescription = description.toString().trim();
      if (estimatedHrs) {
        fullDescription += (fullDescription ? ' | ' : '') + `Est. ${estimatedHrs} hrs`;
      }

      // Parse estimated hours to a number (default to 1 if not provided or invalid)
      let estimatedDuration = 1; // Default 1 hour
      if (estimatedHrs) {
        const parsed = parseFloat(estimatedHrs.toString().trim());
        if (!isNaN(parsed) && parsed > 0) {
          estimatedDuration = parsed;
        }
      }

      categoriesMap.get(catKey).subcategories.push({
        name: subcategory.toString().trim(),
        description: fullDescription,
        estimatedDuration: estimatedDuration
      });
    });

    console.log('📊 Data Summary:');
    console.log(`  Total rows processed: ${data.length}`);
    console.log(`  Skipped rows: ${skippedRows}`);
    console.log(`  Unique categories: ${categoriesMap.size}`);
    console.log(`  Business Group: ${selectedBG.name}`);
    console.log('');

    console.log('📋 Categories to be imported:');
    categoriesMap.forEach((cat, catName) => {
      console.log(`  - ${catName} (${cat.subcategories.length} subcategories)`);
    });
    console.log('');

    // Confirmation prompt
    console.log('⚠️  This will ADD categories and subcategories to the selected Business Group.');
    console.log('⚠️  If categories already exist for this BG, they will be updated.');
    console.log('');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // Start transaction
    await client.query('BEGIN');

    try {
      console.log('📥 Inserting categories for Business Group:', selectedBG.name);
      console.log('');

      let totalCategories = 0;
      let totalSubcategories = 0;
      let totalMappings = 0;

      for (const [catName, catData] of categoriesMap.entries()) {
        // Check if category exists for this business group
        const existingCat = await client.query(
          'SELECT id FROM categories WHERE name = $1 AND business_unit_group_id = $2',
          [catName, selectedBG.id]
        );

        let categoryId;
        if (existingCat.rows.length > 0) {
          categoryId = existingCat.rows[0].id;
          console.log(`  ℹ️  Category "${catName}" already exists (ID: ${categoryId})`);
        } else {
          const catResult = await client.query(
            'INSERT INTO categories (name, business_unit_group_id) VALUES ($1, $2) RETURNING id',
            [catName, selectedBG.id]
          );
          categoryId = catResult.rows[0].id;
          console.log(`  ✓ Created category: ${catName} (ID: ${categoryId})`);
          totalCategories++;
        }

        // Insert subcategories
        for (const subcat of catData.subcategories) {
          // Check if subcategory exists
          const existingSubcat = await client.query(
            'SELECT id FROM subcategories WHERE name = $1 AND category_id = $2',
            [subcat.name, categoryId]
          );

          let subcategoryId;
          if (existingSubcat.rows.length > 0) {
            subcategoryId = existingSubcat.rows[0].id;
            // Update description if provided
            if (subcat.description) {
              await client.query(
                'UPDATE subcategories SET description = $1 WHERE id = $2',
                [subcat.description, subcategoryId]
              );
            }
            console.log(`    ℹ️  Subcategory "${subcat.name}" already exists (ID: ${subcategoryId})`);
          } else {
            const subcatResult = await client.query(
              'INSERT INTO subcategories (name, category_id, description) VALUES ($1, $2, $3) RETURNING id',
              [subcat.name, categoryId, subcat.description || null]
            );
            subcategoryId = subcatResult.rows[0].id;
            console.log(`    ✓ Created subcategory: ${subcat.name} (ID: ${subcategoryId})`);
            totalSubcategories++;
          }

          // Create mapping if it doesn't exist
          const existingMapping = await client.query(
            `SELECT id FROM ticket_classification_mapping 
             WHERE target_business_group_id = $1 
             AND category_id = $2 
             AND subcategory_id = $3`,
            [selectedBG.id, categoryId, subcategoryId]
          );

          if (existingMapping.rows.length === 0) {
            await client.query(
              `INSERT INTO ticket_classification_mapping 
               (target_business_group_id, business_unit_group_id, category_id, subcategory_id, estimated_duration) 
               VALUES ($1, $1, $2, $3, $4)`,
              [selectedBG.id, categoryId, subcategoryId, subcat.estimatedDuration]
            );
            totalMappings++;
          }
        }
        console.log('');
      }

      // Commit transaction
      await client.query('COMMIT');
      
      console.log('✅ Import completed successfully!\n');
      console.log('📊 Summary:');
      console.log(`  Business Group: ${selectedBG.name}`);
      console.log(`  New categories created: ${totalCategories}`);
      console.log(`  New subcategories created: ${totalSubcategories}`);
      console.log(`  New mappings created: ${totalMappings}`);
      console.log('');
      console.log('🔄 Next steps:');
      console.log('  1. Clear cache: rm -rf .next');
      console.log('  2. Restart server: npm run dev');
      console.log('  3. Hard refresh browser: Ctrl + Shift + R');
      console.log('');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Import failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Main execution
const excelFilePath = process.argv[2];

if (!excelFilePath) {
  console.log('Usage: node scripts/import-td-bm-categories.js <excel-file-path>');
  console.log('');
  console.log('Example:');
  console.log('  node scripts/import-td-bm-categories.js categories.xlsx');
  console.log('  node scripts/import-td-bm-categories.js /home/user/data/td-categories.xlsx');
  console.log('');
  console.log('Expected Excel columns:');
  console.log('  - Category (required)');
  console.log('  - Sub Category (required)');
  console.log('  - Input/Description (optional)');
  console.log('  - Estimated hrs (optional)');
  process.exit(1);
}

const fullPath = path.isAbsolute(excelFilePath) 
  ? excelFilePath 
  : path.join(process.cwd(), excelFilePath);

importCategoriesByBusinessGroup(fullPath)
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
