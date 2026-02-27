#!/usr/bin/env node

/**
 * Verification Script: Verify Functional Areas Setup
 * 
 * This script verifies that the functional_areas table is properly set up
 * and contains the expected data after migration.
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

async function verifyFunctionalAreas() {
  console.log('🔍 Verifying Functional Areas Setup...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    console.error('   Please ensure .env.local exists and contains DATABASE_URL');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Check if functional_areas table exists
    const faTableCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'functional_areas'
      ) as exists
    `;
    const functionalAreasExists = faTableCheck[0]?.exists || false;

    if (!functionalAreasExists) {
      console.error('❌ functional_areas table does not exist');
      console.error('\n   Please run the migration script:');
      console.error('   node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
      process.exit(1);
    }

    // Check if mapping table exists
    const faMappingCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'functional_area_business_group_mapping'
      ) as exists
    `;
    const faMappingExists = faMappingCheck[0]?.exists || false;

    // Get record counts
    const faCount = await sql`SELECT COUNT(*) as count FROM functional_areas`;
    const functionalAreasCount = parseInt(faCount[0]?.count || 0);

    const faMappingCount = faMappingExists 
      ? parseInt((await sql`SELECT COUNT(*) as count FROM functional_area_business_group_mapping`)[0]?.count || 0)
      : 0;

    // Get list of functional areas
    const functionalAreas = await sql`
      SELECT id, name, description 
      FROM functional_areas 
      ORDER BY name ASC
    `;

    // Check business_unit_groups table exists (required for mappings)
    const bugTableCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'business_unit_groups'
      ) as exists
    `;
    const businessUnitGroupsExists = bugTableCheck[0]?.exists || false;

    // Get sample mappings if they exist
    let sampleMappings = [];
    if (faMappingExists && businessUnitGroupsExists) {
      sampleMappings = await sql`
        SELECT 
          fa.name as functional_area,
          bug.name as business_unit_group
        FROM functional_area_business_group_mapping fabgm
        JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
        JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
        ORDER BY fa.name, bug.name
        LIMIT 10
      `;
    }

    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Table existence checks
    console.log('Table Status:');
    console.log(`  functional_areas:                       ${functionalAreasExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  functional_area_business_group_mapping: ${faMappingExists ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  business_unit_groups:                  ${businessUnitGroupsExists ? '✅ EXISTS' : '❌ MISSING'}`);

    // Data checks
    console.log('\nData Status:');
    console.log(`  Functional Areas:      ${functionalAreasCount} records`);
    console.log(`  Mappings:              ${faMappingCount} records`);

    // Expected values
    const expectedFunctionalAreas = 12;
    const expectedMappings = 11; // 11 functional areas have specific mappings, "Others" maps to all

    // Validation
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 VALIDATION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let allChecksPassed = true;

    if (!functionalAreasExists) {
      console.log('❌ functional_areas table is missing');
      allChecksPassed = false;
    } else {
      console.log('✅ functional_areas table exists');
    }

    if (!faMappingExists) {
      console.log('⚠️  functional_area_business_group_mapping table is missing (may be optional)');
    } else {
      console.log('✅ functional_area_business_group_mapping table exists');
    }

    if (functionalAreasCount < expectedFunctionalAreas) {
      console.log(`⚠️  Expected at least ${expectedFunctionalAreas} functional areas, found ${functionalAreasCount}`);
      if (functionalAreasCount === 0) {
        allChecksPassed = false;
      }
    } else {
      console.log(`✅ Found ${functionalAreasCount} functional areas (expected: ${expectedFunctionalAreas})`);
    }

    if (faMappingExists && faMappingCount === 0) {
      console.log('⚠️  No mappings found (this may be okay if you plan to create them manually)');
    } else if (faMappingExists) {
      console.log(`✅ Found ${faMappingCount} mappings`);
    }

    if (!businessUnitGroupsExists) {
      console.log('⚠️  business_unit_groups table is missing (required for mappings)');
    } else {
      console.log('✅ business_unit_groups table exists');
    }

    // Display functional areas list
    if (functionalAreas.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('📋 FUNCTIONAL AREAS');
      console.log('═══════════════════════════════════════════════════════════════\n');
      functionalAreas.forEach((fa, index) => {
        console.log(`${String(index + 1).padStart(2)}. ${fa.name}`);
        if (fa.description) {
          console.log(`    ${fa.description}`);
        }
      });
    }

    // Display sample mappings
    if (sampleMappings.length > 0) {
      console.log('\n═══════════════════════════════════════════════════════════════');
      console.log('🔗 SAMPLE MAPPINGS (first 10)');
      console.log('═══════════════════════════════════════════════════════════════\n');
      sampleMappings.forEach((mapping, index) => {
        console.log(`${String(index + 1).padStart(2)}. ${mapping.functional_area} → ${mapping.business_unit_group}`);
      });
      if (faMappingCount > 10) {
        console.log(`\n    ... and ${faMappingCount - 10} more mappings`);
      }
    }

    // Final summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    if (allChecksPassed && functionalAreasCount >= expectedFunctionalAreas) {
      console.log('✅ VERIFICATION PASSED');
      console.log('   The functional_areas table is properly set up.');
      console.log('   Your application should be able to query functional areas successfully.');
    } else {
      console.log('⚠️  VERIFICATION INCOMPLETE');
      console.log('   Some checks did not pass. Review the issues above.');
      if (functionalAreasCount === 0) {
        console.log('\n   To fix: Run the seed script:');
        console.log('   node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
      }
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    process.exit(allChecksPassed && functionalAreasCount >= expectedFunctionalAreas ? 0 : 1);

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n   The functional_areas table does not exist.');
      console.error('   Please run the migration script:');
      console.error('   node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
    }
    process.exit(1);
  }
}

verifyFunctionalAreas()
  .catch((error) => {
    console.error('Failed to verify:', error);
    process.exit(1);
  });
