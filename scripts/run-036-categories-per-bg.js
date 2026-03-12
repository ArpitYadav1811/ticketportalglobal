#!/usr/bin/env node

/**
 * Run Migration 036: Make Categories Belong to Business Groups
 * 
 * This script adds business_unit_group_id to categories table,
 * making each category belong to a specific business group.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { neon } = require('@neondatabase/serverless');

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

  try {
    console.log('🚀 Starting Migration 036: Make Categories Belong to Business Groups\n');
    console.log('✓ Connected to database\n');

    // Step 1: Add business_unit_group_id column
    console.log('📄 Adding business_unit_group_id column to categories...');
    await sql`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS business_unit_group_id INTEGER REFERENCES business_unit_groups(id) ON DELETE CASCADE
    `;
    console.log('✓ Column added\n');

    // Step 2: Create index
    console.log('🔍 Creating index...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_categories_business_group 
      ON categories(business_unit_group_id)
    `;
    console.log('✓ Index created\n');

    // Step 3: Migrate existing data
    console.log('🔄 Migrating existing categories to be business group specific...');
    console.log('   This will duplicate categories for each business group that uses them\n');
    
    // Get existing mappings
    const mappings = await sql`
      SELECT DISTINCT 
        tcm.business_unit_group_id,
        tcm.category_id,
        c.name as category_name,
        c.description as category_description,
        bug.name as business_group_name
      FROM ticket_classification_mapping tcm
      JOIN categories c ON tcm.category_id = c.id
      JOIN business_unit_groups bug ON tcm.business_unit_group_id = bug.id
      ORDER BY tcm.business_unit_group_id, c.name
    `;
    
    console.log(`   Found ${mappings.length} category-business group combinations to migrate`);
    
    const newCategoryMap = new Map(); // key: "bgId-oldCatId", value: newCatId
    
    for (const mapping of mappings) {
      const key = `${mapping.business_unit_group_id}-${mapping.category_id}`;
      
      // Check if we already created this category for this BG
      if (!newCategoryMap.has(key)) {
        // Check if category already exists for this business group
        const existing = await sql`
          SELECT id FROM categories 
          WHERE name = ${mapping.category_name} 
          AND business_unit_group_id = ${mapping.business_unit_group_id}
        `;
        
        if (existing.length > 0) {
          newCategoryMap.set(key, existing[0].id);
          console.log(`   ✓ Category "${mapping.category_name}" already exists for ${mapping.business_group_name}`);
        } else {
          // Create new category for this business group
          const newCat = await sql`
            INSERT INTO categories (name, description, business_unit_group_id)
            VALUES (${mapping.category_name}, ${mapping.category_description}, ${mapping.business_unit_group_id})
            RETURNING id
          `;
          newCategoryMap.set(key, newCat[0].id);
          console.log(`   ✓ Created category "${mapping.category_name}" for ${mapping.business_group_name}`);
        }
      }
      
      // Update mapping to use the new category
      const newCatId = newCategoryMap.get(key);
      await sql`
        UPDATE ticket_classification_mapping
        SET category_id = ${newCatId}
        WHERE business_unit_group_id = ${mapping.business_unit_group_id}
        AND category_id = ${mapping.category_id}
      `;
    }
    
    console.log(`\n   ✓ Migrated ${newCategoryMap.size} category-business group combinations`);
    
    // Delete old global categories (those without business_unit_group_id)
    const deleted = await sql`
      DELETE FROM categories 
      WHERE business_unit_group_id IS NULL
      RETURNING name
    `;
    console.log(`   ✓ Removed ${deleted.length} old global categories\n`);

    // Step 4: Make business_unit_group_id NOT NULL
    console.log('🔒 Making business_unit_group_id required...');
    await sql`
      ALTER TABLE categories
      ALTER COLUMN business_unit_group_id SET NOT NULL
    `;
    console.log('✓ Column is now required\n');

    // Step 5: Update unique constraint
    console.log('🔑 Updating unique constraint...');
    await sql`
      ALTER TABLE categories
      DROP CONSTRAINT IF EXISTS categories_name_key
    `;
    await sql`
      ALTER TABLE categories
      ADD CONSTRAINT categories_name_business_group_unique 
      UNIQUE (name, business_unit_group_id)
    `;
    console.log('✓ Unique constraint updated (name + business_group)\n');

    // Step 6: Add documentation
    await sql`
      COMMENT ON COLUMN categories.business_unit_group_id IS 'The business group this category belongs to'
    `;
    await sql`
      COMMENT ON TABLE categories IS 'Categories for ticket classification - each category belongs to a specific business group'
    `;

    // Verification
    console.log('🔍 Verifying migration...\n');
    
    const totalCategories = await sql`SELECT COUNT(*) as count FROM categories`;
    const categoriesPerBG = await sql`
      SELECT 
        bug.name as business_group,
        COUNT(c.id) as category_count
      FROM business_unit_groups bug
      LEFT JOIN categories c ON c.business_unit_group_id = bug.id
      GROUP BY bug.id, bug.name
      ORDER BY bug.name
    `;
    
    console.log('============================================================================');
    console.log('MIGRATION 036 COMPLETE: Categories Now Belong to Business Groups');
    console.log('============================================================================');
    console.log(`Total categories: ${totalCategories[0].count}`);
    console.log('');
    console.log('Categories per Business Group:');
    categoriesPerBG.forEach(bg => {
      console.log(`  - ${bg.business_group}: ${bg.category_count} categories`);
    });
    console.log('');
    console.log('✅ SUCCESS: Categories are now business group specific');
    console.log('   - business_unit_group_id column added (NOT NULL)');
    console.log('   - Unique constraint: (name, business_unit_group_id)');
    console.log('   - Same category name can exist in different business groups');
    console.log('');
    console.log('📝 Note: All existing mappings have been preserved');
    console.log('============================================================================');

    // Show sample data
    const sample = await sql`
      SELECT 
        bug.name as business_group,
        c.name as category,
        c.description,
        (SELECT COUNT(*) FROM subcategories s WHERE s.category_id = c.id) as subcategory_count
      FROM categories c
      JOIN business_unit_groups bug ON c.business_unit_group_id = bug.id
      ORDER BY bug.name, c.name
      LIMIT 20
    `;
    
    if (sample.length > 0) {
      console.log('\n📋 Sample Categories:');
      let currentBG = '';
      sample.forEach(row => {
        if (row.business_group !== currentBG) {
          currentBG = row.business_group;
          console.log(`\n  ${currentBG}:`);
        }
        console.log(`    - ${row.category} (${row.subcategory_count} subcategories)`);
      });
    }

    console.log('\n✅ Migration 036 completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
