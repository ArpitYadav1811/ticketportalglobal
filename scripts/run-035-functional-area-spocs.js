#!/usr/bin/env node

/**
 * Run Migration 035: Add SPOC Support to Functional Areas
 * 
 * This script adds spoc_name column to the functional_areas table.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { neon } = require('@neondatabase/serverless');

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL);

  try {
    console.log('🚀 Starting Migration 035: Add SPOC Support to Functional Areas\n');
    console.log('✓ Connected to database\n');

    // Step 1: Add SPOC column
    console.log('📄 Adding spoc_name column...');
    await sql`
      ALTER TABLE functional_areas
      ADD COLUMN IF NOT EXISTS spoc_name VARCHAR(255)
    `;
    console.log('✓ Column added\n');

    // Step 2: Add comment
    console.log('📝 Adding documentation...');
    await sql`
      COMMENT ON COLUMN functional_areas.spoc_name IS 'SPOC (Single Point of Contact) for this functional area'
    `;
    console.log('✓ Comment added\n');

    // Step 3: Create index
    console.log('🔍 Creating index...');
    await sql`
      CREATE INDEX IF NOT EXISTS idx_functional_areas_spoc 
      ON functional_areas(spoc_name) 
      WHERE spoc_name IS NOT NULL
    `;
    console.log('✓ Index created\n');

    // Step 4: Verification
    console.log('🔍 Verifying changes...');
    const faCount = await sql`SELECT COUNT(*) as count FROM functional_areas`;
    const spocCount = await sql`
      SELECT COUNT(*) as count 
      FROM functional_areas 
      WHERE spoc_name IS NOT NULL
    `;
    
    console.log('============================================================================');
    console.log('MIGRATION 035 COMPLETE: Add SPOC Support to Functional Areas');
    console.log('============================================================================');
    console.log(`Total functional areas: ${faCount[0].count}`);
    console.log(`Functional areas with SPOC: ${spocCount[0].count}`);
    console.log('');
    console.log('✅ SUCCESS: SPOC column added to functional_areas table');
    console.log('   - spoc_name (VARCHAR(255), nullable)');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('   1. Update functional areas with SPOC names in Admin Dashboard');
    console.log('   2. SPOCs can be assigned from the FA Mappings tab');
    console.log('============================================================================');

    // Step 5: Show current structure
    const sample = await sql`
      SELECT 
        id,
        name,
        description,
        spoc_name,
        created_at
      FROM functional_areas
      ORDER BY name
      LIMIT 10
    `;
    
    if (sample.length > 0) {
      console.log('\n📋 Sample Functional Areas:');
      sample.forEach(fa => {
        console.log(`  - ${fa.name}${fa.spoc_name ? ` (SPOC: ${fa.spoc_name})` : ' (No SPOC)'}`);
      });
    }

    console.log('\n✅ Migration 035 completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
