import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/actions/auth';
import { sql } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin can import
    if (user.role?.toLowerCase() !== 'superadmin') {
      return NextResponse.json({ error: 'Only Super Admin can import data' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessGroupId = formData.get('businessGroupId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!businessGroupId) {
      return NextResponse.json({ error: 'No business group selected' }, { status: 400 });
    }

    // Read the Excel file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    // Log first row to see actual column names
    const firstRowKeys = Object.keys(data[0] as object);
    console.log('Excel columns detected:', firstRowKeys);
    console.log('First row data:', data[0]);
    console.log('Total data rows:', data.length);

    // Parse data
    const categoriesMap = new Map();
    let skippedRows = 0;

    data.forEach((row: any, index: number) => {
      // Get all keys from the row to find the right columns
      const keys = Object.keys(row);
      
      // Find category column (case-insensitive, flexible matching)
      const categoryKey = keys.find(k => {
        const lower = k.toLowerCase().trim();
        return lower === 'category' || lower === 'cat';
      });
      
      // Find subcategory column (case-insensitive, flexible matching)
      // Exact match: "Sub Category"
      const subcategoryKey = keys.find(k => {
        const lower = k.toLowerCase().trim();
        return lower === 'sub category' || 
               lower === 'subcategory' || 
               lower === 'sub-category' ||
               lower === 'subcat';
      });
      
      // Find input template column (for ticket auto-fill)
      // Exact match: "Input (Description)" - handle with/without parentheses
      const inputTemplateKey = keys.find(k => {
        const lower = k.toLowerCase().trim();
        // Remove parentheses and extra spaces for matching
        const normalized = lower.replace(/[()]/g, '').trim();
        return lower === 'input' || 
               lower === 'input (description)' ||
               normalized === 'input description' ||
               lower === 'input template' ||
               lower === 'input_template' ||
               lower === 'template' ||
               lower === 'ticket description' ||
               lower === 'ticket template';
      });
      
      // Find description column (for subcategory description)
      // If "Input (Description)" is found, it serves as both input_template and description
      const descriptionKey = keys.find(k => {
        const lower = k.toLowerCase().trim();
        const normalized = lower.replace(/[()]/g, '').trim();
        return lower === 'description' || 
               lower === 'desc' ||
               lower === 'subcategory description' ||
               (normalized === 'input description' && !inputTemplateKey); // Only if input not found
      });
      
      // Find estimated time column
      // Exact match: "Estimated hrs"
      const estimatedKey = keys.find(k => {
        const lower = k.toLowerCase().trim();
        return lower === 'estimated hrs' ||
               lower === 'estimated hrs.' ||
               lower === 'estimated time' ||
               lower === 'estimated_time' ||
               lower === 'estimated_hrs' ||
               lower === 'estimatedtime' ||
               lower === 'est time' ||
               lower === 'est. time';
      });

      let category = categoryKey ? row[categoryKey] : null;
      let subcategory = subcategoryKey ? row[subcategoryKey] : null;
      let description = descriptionKey ? row[descriptionKey] : '';
      let inputTemplate = inputTemplateKey ? row[inputTemplateKey] : '';
      let estimatedHrs = estimatedKey ? row[estimatedKey] : '';
      
      // Debug logging for first row
      if (index === 0) {
        console.log('Column detection results:');
        console.log(`  Category column: ${categoryKey || 'NOT FOUND'} = "${category}"`);
        console.log(`  Subcategory column: ${subcategoryKey || 'NOT FOUND'} = "${subcategory}"`);
        console.log(`  Input Template column: ${inputTemplateKey || 'NOT FOUND'} = "${inputTemplate}"`);
        console.log(`  Description column: ${descriptionKey || 'NOT FOUND'} = "${description}"`);
        console.log(`  Estimated hrs column: ${estimatedKey || 'NOT FOUND'} = "${estimatedHrs}"`);
      }
      
      // If input template not found but description exists, use description as input_template
      if (!inputTemplate && description) {
        inputTemplate = description;
      }

      // Fallback: If columns not found by name, try by position (assuming order: Category, Sub Category, Input/Description, Estimated Time)
      if (!category && keys.length >= 1) {
        category = row[keys[0]]; // First column
      }
      if (!subcategory && keys.length >= 2) {
        subcategory = row[keys[1]]; // Second column
      }
      if (!inputTemplate && keys.length >= 3) {
        inputTemplate = row[keys[2]] || ''; // Third column (Input Template)
      }
      if (!description && keys.length >= 3) {
        description = row[keys[2]] || ''; // Third column (Description fallback)
      }
      if (!estimatedHrs && keys.length >= 4) {
        estimatedHrs = row[keys[3]] || ''; // Fourth column
      }
      
      // Final fallback: if inputTemplate still empty, use description
      if (!inputTemplate && description) {
        inputTemplate = description;
      }

      if (!category || !subcategory) {
        console.log(`Skipping row ${index + 2}: category="${category}", subcategory="${subcategory}", availableKeys:`, keys);
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

      // Parse estimated hours and convert to minutes (database stores minutes)
      let estimatedDurationMinutes = 60; // Default: 1 hour = 60 minutes
      
      if (estimatedHrs) {
        const parsed = parseFloat(estimatedHrs.toString().trim());
        if (!isNaN(parsed) && parsed > 0) {
          // Convert hours to minutes
          estimatedDurationMinutes = Math.round(parsed * 60);
          if (index === 0) {
            console.log(`  Parsed estimated hours: "${estimatedHrs}" -> ${parsed} hrs -> ${estimatedDurationMinutes} minutes`);
          }
        } else {
          if (index === 0) {
            console.log(`  Warning: Could not parse estimated hours value: "${estimatedHrs}"`);
          }
        }
      } else {
        if (index === 0) {
          console.log(`  No estimated hours value found, using default: 60 minutes (1 hour)`);
        }
      }

      let fullDescription = description.toString().trim();
      let fullInputTemplate = inputTemplate.toString().trim();
      
      // Don't append estimated time to input_template (it's used for ticket auto-fill)
      // Only append to description if needed
      if (estimatedHrs && fullDescription) {
        fullDescription += (fullDescription ? ' | ' : '') + `Est. ${estimatedHrs} hrs`;
      }

      categoriesMap.get(catKey).subcategories.push({
        name: subcategory.toString().trim(),
        description: fullDescription,
        inputTemplate: fullInputTemplate,
        estimatedDurationMinutes: estimatedDurationMinutes
      });
    });

    // Process imports
    let totalCategories = 0;
    let totalSubcategories = 0;
    let totalMappings = 0;

    console.log(`Processing ${categoriesMap.size} categories for Business Group ID: ${businessGroupId}`);

    for (const [catName, catData] of categoriesMap.entries()) {
      // Check if category exists
      const existingCat = await sql`
        SELECT id FROM categories 
        WHERE name = ${catName} 
        AND business_unit_group_id = ${parseInt(businessGroupId)}
      `;

      let categoryId;
      if (existingCat.length > 0) {
        categoryId = existingCat[0].id;
        console.log(`Category "${catName}" already exists (ID: ${categoryId})`);
      } else {
        const catResult = await sql`
          INSERT INTO categories (name, business_unit_group_id) 
          VALUES (${catName}, ${parseInt(businessGroupId)}) 
          RETURNING id
        `;
        categoryId = catResult[0].id;
        console.log(`Created category "${catName}" (ID: ${categoryId})`);
        totalCategories++;
      }

      // Insert subcategories
      for (const subcat of catData.subcategories) {
        const existingSubcat = await sql`
          SELECT id FROM subcategories 
          WHERE name = ${subcat.name} 
          AND category_id = ${categoryId}
        `;

        let subcategoryId;
        if (existingSubcat.length > 0) {
          subcategoryId = existingSubcat[0].id;
          console.log(`  Subcategory "${subcat.name}" already exists (ID: ${subcategoryId})`);
          // Update description, input_template, and estimated_duration_minutes
          await sql`
            UPDATE subcategories 
            SET description = ${subcat.description || null},
                input_template = ${subcat.inputTemplate || subcat.description || null},
                estimated_duration_minutes = ${subcat.estimatedDurationMinutes || null},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${subcategoryId}
          `;
        } else {
          const subcatResult = await sql`
            INSERT INTO subcategories (name, category_id, description, input_template, estimated_duration_minutes) 
            VALUES (${subcat.name}, ${categoryId}, ${subcat.description || null}, ${subcat.inputTemplate || subcat.description || null}, ${subcat.estimatedDurationMinutes || null}) 
            RETURNING id
          `;
          subcategoryId = subcatResult[0].id;
          console.log(`  Created subcategory "${subcat.name}" (ID: ${subcategoryId}, Est: ${subcat.estimatedDurationMinutes} mins)`);
          totalSubcategories++;
        }

        // Create or update mapping
        const existingMapping = await sql`
          SELECT id FROM ticket_classification_mapping 
          WHERE target_business_group_id = ${parseInt(businessGroupId)}
          AND category_id = ${categoryId}
          AND subcategory_id = ${subcategoryId}
        `;

        if (existingMapping.length === 0) {
          await sql`
            INSERT INTO ticket_classification_mapping 
            (target_business_group_id, business_unit_group_id, category_id, subcategory_id, estimated_duration) 
            VALUES (${parseInt(businessGroupId)}, ${parseInt(businessGroupId)}, ${categoryId}, ${subcategoryId}, ${subcat.estimatedDurationMinutes})
          `;
          console.log(`  Created mapping for "${subcat.name}" (Est: ${subcat.estimatedDurationMinutes} mins = ${subcat.estimatedDurationMinutes / 60} hrs)`);
          totalMappings++;
        } else {
          // Update existing mapping with new estimated duration
          await sql`
            UPDATE ticket_classification_mapping 
            SET estimated_duration = ${subcat.estimatedDurationMinutes},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${existingMapping[0].id}
          `;
          console.log(`  Updated mapping for "${subcat.name}" (Est: ${subcat.estimatedDurationMinutes} mins = ${subcat.estimatedDurationMinutes / 60} hrs)`);
        }
      }
    }

    console.log(`\nImport Summary: ${totalCategories} categories, ${totalSubcategories} subcategories, ${totalMappings} mappings created`);

    // Count total items processed (including existing ones)
    let totalCategoriesProcessed = 0;
    let totalSubcategoriesProcessed = 0;
    
    for (const catData of categoriesMap.values()) {
      totalCategoriesProcessed++;
      totalSubcategoriesProcessed += catData.subcategories.length;
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: data.length,
        skippedRows,
        categoriesCreated: totalCategories,
        subcategoriesCreated: totalSubcategories,
        mappingsCreated: totalMappings,
        categoriesProcessed: totalCategoriesProcessed,
        subcategoriesProcessed: totalSubcategoriesProcessed
      }
    });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import categories' },
      { status: 500 }
    );
  }
}
