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
    const data = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    // Parse data
    const categoriesMap = new Map();
    let skippedRows = 0;

    data.forEach((row: any, index: number) => {
      const category = row['Category'] || row['category'] || row['CATEGORY'];
      const subcategory = row['Sub Category'] || row['SubCategory'] || row['Subcategory'] || 
                         row['sub_category'] || row['subcategory'] || row['SUB CATEGORY'];
      const description = row['Input'] || row['Description'] || row['input'] || 
                         row['description'] || row['INPUT'] || row['Desc'] || '';
      const estimatedHrs = row['Estimated hrs'] || row['Estimated Hrs'] || row['EstimatedHrs'] || 
                          row['estimated_hrs'] || row['ESTIMATED HRS'] || '';

      if (!category || !subcategory) {
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

      // Parse estimated hours
      let estimatedDuration = 1;
      if (estimatedHrs) {
        const parsed = parseFloat(estimatedHrs.toString().trim());
        if (!isNaN(parsed) && parsed > 0) {
          estimatedDuration = parsed;
        }
      }

      let fullDescription = description.toString().trim();
      if (estimatedHrs) {
        fullDescription += (fullDescription ? ' | ' : '') + `Est. ${estimatedHrs} hrs`;
      }

      categoriesMap.get(catKey).subcategories.push({
        name: subcategory.toString().trim(),
        description: fullDescription,
        estimatedDuration: estimatedDuration
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
          if (subcat.description) {
            await sql`
              UPDATE subcategories 
              SET description = ${subcat.description} 
              WHERE id = ${subcategoryId}
            `;
          }
        } else {
          const subcatResult = await sql`
            INSERT INTO subcategories (name, category_id, description) 
            VALUES (${subcat.name}, ${categoryId}, ${subcat.description || null}) 
            RETURNING id
          `;
          subcategoryId = subcatResult[0].id;
          console.log(`  Created subcategory "${subcat.name}" (ID: ${subcategoryId})`);
          totalSubcategories++;
        }

        // Create mapping if it doesn't exist
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
            VALUES (${parseInt(businessGroupId)}, ${parseInt(businessGroupId)}, ${categoryId}, ${subcategoryId}, ${subcat.estimatedDuration})
          `;
          console.log(`  Created mapping for "${subcat.name}" (Est: ${subcat.estimatedDuration} hrs)`);
          totalMappings++;
        } else {
          console.log(`  Mapping for "${subcat.name}" already exists`);
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
