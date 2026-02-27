#!/usr/bin/env node

/**
 * Diagnostic Script: Check Functional Areas Table State
 * 
 * This script checks the current state of the database to determine
 * which migration script needs to be run to fix the missing functional_areas table.
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

async function diagnoseFunctionalAreas() {
  console.log('🔍 Diagnosing Functional Areas Table State...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    console.error('   Please ensure .env.local exists and contains DATABASE_URL');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Check if organizations table exists
    const orgTableCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations'
      ) as exists
    `;
    const organizationsExists = orgTableCheck[0]?.exists || false;

    // Check if functional_areas table exists (in any schema)
    const faTableCheckAnySchema = await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables 
      WHERE table_name = 'functional_areas'
    `;
    
    // Check specifically in public schema
    const faTableCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'functional_areas'
      ) as exists
    `;
    const functionalAreasExists = faTableCheck[0]?.exists || false;
    
    // Get current schema
    const currentSchema = await sql`SELECT current_schema() as schema`;
    const schemaName = currentSchema[0]?.schema || 'public';

    // Check if mapping tables exist
    const orgMappingCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'organization_target_business_group_mapping'
      ) as exists
    `;
    const orgMappingExists = orgMappingCheck[0]?.exists || false;

    const faMappingCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'functional_area_business_group_mapping'
      ) as exists
    `;
    const faMappingExists = faMappingCheck[0]?.exists || false;

    // Get record counts if tables exist
    let organizationsCount = 0;
    let functionalAreasCount = 0;
    let orgMappingCount = 0;
    let faMappingCount = 0;

    if (organizationsExists) {
      const count = await sql`SELECT COUNT(*) as count FROM organizations`;
      organizationsCount = parseInt(count[0]?.count || 0);
    }

    if (functionalAreasExists) {
      const count = await sql`SELECT COUNT(*) as count FROM functional_areas`;
      functionalAreasCount = parseInt(count[0]?.count || 0);
    }

    if (orgMappingExists) {
      const count = await sql`SELECT COUNT(*) as count FROM organization_target_business_group_mapping`;
      orgMappingCount = parseInt(count[0]?.count || 0);
    }

    if (faMappingExists) {
      const count = await sql`SELECT COUNT(*) as count FROM functional_area_business_group_mapping`;
      faMappingCount = parseInt(count[0]?.count || 0);
    }

    // Try to actually query the table to see what error we get
    let queryTestPassed = false;
    let queryError = null;
    if (functionalAreasExists) {
      try {
        const testQuery = await sql`SELECT COUNT(*) as count FROM functional_areas`;
        queryTestPassed = true;
        functionalAreasCount = parseInt(testQuery[0]?.count || 0);
      } catch (error) {
        queryError = error.message;
        console.log('⚠️  Table exists but query failed:', error.message);
      }
    }

    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 DATABASE STATE DIAGNOSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Connection Info:');
    console.log(`  Current Schema: ${schemaName}`);
    if (faTableCheckAnySchema.length > 0) {
      console.log(`  functional_areas found in schemas:`);
      faTableCheckAnySchema.forEach(row => {
        console.log(`    - ${row.table_schema}.${row.table_name}`);
      });
    }

    console.log('\nTables Status:');
    console.log(`  organizations:                          ${organizationsExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (organizationsExists) {
      console.log(`    └─ Records: ${organizationsCount}`);
    }
    console.log(`  functional_areas (public schema):        ${functionalAreasExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (functionalAreasExists) {
      console.log(`    └─ Records: ${functionalAreasCount}`);
      console.log(`    └─ Query Test: ${queryTestPassed ? '✅ PASSED' : '❌ FAILED'}`);
      if (queryError) {
        console.log(`    └─ Error: ${queryError}`);
      }
    }
    console.log(`  organization_target_business_group_mapping: ${orgMappingExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (orgMappingExists) {
      console.log(`    └─ Records: ${orgMappingCount}`);
    }
    console.log(`  functional_area_business_group_mapping:     ${faMappingExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    if (faMappingExists) {
      console.log(`    └─ Records: ${faMappingCount}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('💡 RECOMMENDED ACTION');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (functionalAreasExists && queryTestPassed && functionalAreasCount >= 12) {
      console.log('✅ Database is in good state!');
      console.log('   The functional_areas table exists and has data.');
      console.log('   If you\'re still seeing errors, check:');
      console.log('   1. Application is using the correct database');
      console.log('   2. Database connection is working');
      console.log('   3. No connection pool issues');
      console.log('   4. Restart your Next.js dev server');
    } else if (functionalAreasExists && !queryTestPassed) {
      console.log('📋 ISSUE: Table exists but query fails');
      console.log('');
      console.log('   The functional_areas table exists but queries are failing.');
      console.log('   Possible causes:');
      console.log('   1. Table is in a different schema (not "public")');
      if (faTableCheckAnySchema.length > 0 && faTableCheckAnySchema[0].table_schema !== 'public') {
        console.log(`      → Found in schema: ${faTableCheckAnySchema[0].table_schema}`);
        console.log(`      → Current schema: ${schemaName}`);
        console.log('      → Solution: Update queries to use schema-qualified name');
        console.log(`      → Example: SELECT * FROM ${faTableCheckAnySchema[0].table_schema}.functional_areas`);
      }
      console.log('   2. Permissions issue - user cannot SELECT from table');
      console.log('   3. Connection to wrong database');
      console.log('   4. Table name has different casing');
      console.log('');
      if (queryError) {
        console.log(`   Error details: ${queryError}`);
      }
      console.log('');
      console.log('   Try running this query manually:');
      console.log('   SELECT * FROM functional_areas LIMIT 1;');
    } else if (functionalAreasExists && functionalAreasCount < 12) {
      console.log('📋 MIGRATION PATH: Option C - Seed functional_areas data');
      console.log('');
      console.log('   The functional_areas table exists but is missing data.');
      console.log('   Run this command to seed the data:');
      console.log('   node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
      console.log('');
      console.log('   Or using psql:');
      console.log('   psql $DATABASE_URL -f scripts/027-seed-functional-areas-updated.sql');
      console.log('');
      console.log('   Note: This script uses ON CONFLICT DO NOTHING, so it\'s safe to run multiple times.');
    } else if (organizationsExists && !functionalAreasExists) {
      console.log('📋 MIGRATION PATH: Option A - Rename organizations table');
      console.log('');
      console.log('   The database has the old "organizations" table.');
      console.log('   You need to run the rename migration script.');
      console.log('');
      console.log('   Run this command:');
      console.log('   node scripts/run-sql-file.js scripts/028-rename-organizations-to-functional-areas.sql');
      console.log('');
      console.log('   Or using psql:');
      console.log('   psql $DATABASE_URL -f scripts/028-rename-organizations-to-functional-areas.sql');
    } else if (!organizationsExists && !functionalAreasExists) {
      console.log('📋 MIGRATION PATH: Option B - Create functional_areas table');
      console.log('');
      console.log('   Neither table exists. You need to create functional_areas.');
      console.log('   Run this command:');
      console.log('   node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
      console.log('');
      console.log('   Or using psql:');
      console.log('   psql $DATABASE_URL -f scripts/027-seed-functional-areas-updated.sql');
    } else {
      console.log('⚠️  Unexpected state detected. Please review the table status above.');
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.error('\n   This might indicate a connection issue or the database schema is incomplete.');
      console.error('   Try running the seed script:');
      console.error('   node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
    }
    process.exit(1);
  }
}

diagnoseFunctionalAreas()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to diagnose:', error);
    process.exit(1);
  });
