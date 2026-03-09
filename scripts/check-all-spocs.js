#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkAllSpocs() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    console.log('\n' + '='.repeat(90));
    console.log('ALL BUSINESS GROUPS - SPOC ASSIGNMENT STATUS');
    console.log('='.repeat(90) + '\n');

    const result = await client.query(`
      SELECT 
        bug.id,
        bug.name as business_group,
        bug.spoc_name,
        CASE 
          WHEN u.id IS NOT NULL THEN '✅ User EXISTS'
          WHEN bug.spoc_name IS NOT NULL THEN '❌ User NOT FOUND'
          ELSE '⚠️  No SPOC assigned'
        END as user_status,
        u.id as user_id,
        u.full_name as user_full_name,
        u.email as user_email
      FROM business_unit_groups bug
      LEFT JOIN users u ON u.full_name = bug.spoc_name
      ORDER BY bug.name
    `);

    console.log('Business Group          | SPOC Name Assigned    | Status            | User ID | User Email');
    console.log('-'.repeat(90));
    
    result.rows.forEach(row => {
      const bg = (row.business_group || '').padEnd(23);
      const spoc = (row.spoc_name || 'N/A').padEnd(21);
      const status = (row.user_status || '').padEnd(18);
      const userId = (row.user_id || 'N/A').toString().padEnd(8);
      const email = (row.user_email || 'N/A').substring(0, 30);
      console.log(`${bg} | ${spoc} | ${status} | ${userId} | ${email}`);
    });

    const withSpoc = result.rows.filter(r => r.spoc_name).length;
    const withMatchingUser = result.rows.filter(r => r.user_id).length;
    const missingUsers = result.rows.filter(r => r.spoc_name && !r.user_id);

    console.log('\n' + '='.repeat(90));
    console.log('SUMMARY');
    console.log('='.repeat(90));
    console.log(`Total Business Groups: ${result.rows.length}`);
    console.log(`Groups with SPOC Name: ${withSpoc}`);
    console.log(`Groups with Matching User: ${withMatchingUser}`);
    
    if (missingUsers.length > 0) {
      console.log(`\n⚠️  ${missingUsers.length} Business Group(s) have SPOC names but NO matching users:`);
      missingUsers.forEach(m => {
        console.log(`   - ${m.business_group}: SPOC Name = "${m.spoc_name}"`);
        console.log(`     → Need to create user with full_name = "${m.spoc_name}"`);
      });
    } else {
      console.log('\n✅ All SPOC assignments have matching users!');
    }
    
    console.log('='.repeat(90) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkAllSpocs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
