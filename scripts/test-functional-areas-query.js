#!/usr/bin/env node

/**
 * Test Script: Test Functional Areas Query
 * 
 * This script tests the exact query that the application uses
 * to help identify why it's failing even though the table exists.
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

async function testQuery() {
  console.log('🔍 Testing Functional Areas Query...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Test 1: Check current schema
    console.log('Test 1: Checking current schema...');
    const schemaCheck = await sql`SELECT current_schema() as schema, current_database() as database`;
    console.log(`  ✅ Current schema: ${schemaCheck[0].schema}`);
    console.log(`  ✅ Current database: ${schemaCheck[0].database}\n`);

    // Test 2: Check if table exists in public schema
    console.log('Test 2: Checking if table exists in public schema...');
    const tableCheck = await sql`
      SELECT table_schema, table_name
      FROM information_schema.tables 
      WHERE table_name = 'functional_areas'
    `;
    
    if (tableCheck.length === 0) {
      console.log('  ❌ Table not found in any schema');
      console.log('\n   Solution: Run the seed script:');
      console.log('   node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
      process.exit(1);
    }
    
    tableCheck.forEach(row => {
      console.log(`  ✅ Found: ${row.table_schema}.${row.table_name}`);
    });
    
    const inPublicSchema = tableCheck.some(row => row.table_schema === 'public');
    if (!inPublicSchema) {
      console.log('\n  ⚠️  WARNING: Table is NOT in public schema!');
      console.log(`  → Table is in schema: ${tableCheck[0].table_schema}`);
      console.log(`  → Application expects: public`);
      console.log('\n  Solution: Either move the table or update queries to use schema-qualified name\n');
    }
    console.log('');

    // Test 3: Try querying without schema qualification
    console.log('Test 3: Testing query without schema qualification...');
    try {
      const result1 = await sql`SELECT * FROM functional_areas ORDER BY name ASC LIMIT 5`;
      console.log(`  ✅ Query succeeded! Found ${result1.length} records`);
      if (result1.length > 0) {
        console.log('  Sample records:');
        result1.forEach((row, i) => {
          console.log(`    ${i + 1}. ${row.name}`);
        });
      }
    } catch (error) {
      console.log(`  ❌ Query failed: ${error.message}`);
      console.log(`  Error code: ${error.code || 'N/A'}`);
      
      // Test 4: Try with public schema qualification
      console.log('\nTest 4: Testing query with public schema qualification...');
      try {
        const result2 = await sql`SELECT * FROM public.functional_areas ORDER BY name ASC LIMIT 5`;
        console.log(`  ✅ Query with public. succeeded! Found ${result2.length} records`);
        console.log('  → Solution: Update queries to use "public.functional_areas"');
      } catch (error2) {
        console.log(`  ❌ Query with public. also failed: ${error2.message}`);
      }
      
      // Test 5: Try with the actual schema
      if (tableCheck.length > 0 && tableCheck[0].table_schema !== 'public') {
        console.log(`\nTest 5: Testing query with ${tableCheck[0].table_schema} schema...`);
        try {
          const schemaName = tableCheck[0].table_schema;
          const result3 = await sql.unsafe(`SELECT * FROM ${schemaName}.functional_areas ORDER BY name ASC LIMIT 5`);
          console.log(`  ✅ Query with ${schemaName}. succeeded! Found ${result3.length} records`);
          console.log(`  → Solution: Update queries to use "${schemaName}.functional_areas"`);
        } catch (error3) {
          console.log(`  ❌ Query failed: ${error3.message}`);
        }
      }
    }

    // Test 6: Check permissions
    console.log('\nTest 6: Checking table permissions...');
    try {
      const permissions = await sql`
        SELECT 
          grantee, 
          privilege_type
        FROM information_schema.role_table_grants
        WHERE table_schema = 'public' 
        AND table_name = 'functional_areas'
      `;
      if (permissions.length > 0) {
        console.log('  ✅ Permissions found:');
        permissions.forEach(p => {
          console.log(`    - ${p.grantee}: ${p.privilege_type}`);
        });
      } else {
        console.log('  ⚠️  No explicit permissions found (using default)');
      }
    } catch (error) {
      console.log(`  ⚠️  Could not check permissions: ${error.message}`);
    }

    // Test 7: Count total records
    console.log('\nTest 7: Counting total records...');
    try {
      const count = await sql`SELECT COUNT(*) as count FROM functional_areas`;
      const totalCount = parseInt(count[0]?.count || 0);
      console.log(`  ✅ Total records: ${totalCount}`);
      if (totalCount === 0) {
        console.log('  ⚠️  Table is empty - you may need to seed data');
        console.log('  → Run: node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
      } else if (totalCount < 12) {
        console.log(`  ⚠️  Expected 12 records, found ${totalCount}`);
        console.log('  → Run: node scripts/run-sql-file.js scripts/027-seed-functional-areas-updated.sql');
      }
    } catch (error) {
      console.log(`  ❌ Count query failed: ${error.message}`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

testQuery()
  .catch((error) => {
    console.error('Failed to test:', error);
    process.exit(1);
  });
