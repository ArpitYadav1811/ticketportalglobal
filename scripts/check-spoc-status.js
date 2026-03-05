#!/usr/bin/env node

/**
 * Check SPOC Status Script
 * 
 * This script checks:
 * 1. Which business groups have SPOC names assigned
 * 2. Whether matching users exist in the users table
 * 3. Shows all users for reference
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkSpocStatus() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n' + '='.repeat(80));
    console.log('SPOC STATUS CHECK');
    console.log('='.repeat(80) + '\n');

    await client.connect();
    console.log('✓ Connected to database\n');

    // Check business groups and their SPOC status
    console.log('1️⃣  Business Groups and SPOC Status:\n');
    const spocStatus = await client.query(`
      SELECT 
        bug.name as business_group,
        bug.spoc_name as assigned_spoc_name,
        CASE 
          WHEN u.id IS NOT NULL THEN '✅ User found'
          WHEN bug.spoc_name IS NOT NULL THEN '⚠️  User NOT found'
          ELSE '❌ No SPOC assigned'
        END as status,
        u.id as user_id,
        u.full_name as user_full_name,
        u.email as user_email
      FROM business_unit_groups bug
      LEFT JOIN users u ON u.full_name = bug.spoc_name
      ORDER BY bug.name
    `);

    if (spocStatus.rows.length === 0) {
      console.log('❌ No business groups found\n');
    } else {
      console.log('Business Group          | SPOC Name           | Status              | User ID | Email');
      console.log('-'.repeat(80));
      spocStatus.rows.forEach(row => {
        const bg = (row.business_group || '').padEnd(22);
        const spoc = (row.assigned_spoc_name || 'N/A').padEnd(20);
        const status = (row.status || '').padEnd(20);
        const userId = (row.user_id || 'N/A').toString().padEnd(8);
        const email = row.user_email || 'N/A';
        console.log(`${bg} | ${spoc} | ${status} | ${userId} | ${email}`);
      });
    }

    // Show all users
    console.log('\n\n2️⃣  All Users in System:\n');
    const users = await client.query(`
      SELECT 
        id,
        full_name,
        email,
        role,
        business_unit_group_id
      FROM users
      ORDER BY full_name
    `);

    if (users.rows.length === 0) {
      console.log('❌ No users found\n');
    } else {
      console.log('ID  | Full Name           | Email                    | Role  | Business Group ID');
      console.log('-'.repeat(80));
      users.rows.forEach(user => {
        const id = user.id.toString().padEnd(4);
        const name = (user.full_name || 'N/A').padEnd(20);
        const email = (user.email || 'N/A').padEnd(24);
        const role = (user.role || 'N/A').padEnd(6);
        const bgId = (user.business_unit_group_id || 'N/A').toString();
        console.log(`${id} | ${name} | ${email} | ${role} | ${bgId}`);
      });
    }

    // Summary
    console.log('\n\n3️⃣  Summary:\n');
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_groups,
        COUNT(bug.spoc_name) as groups_with_spoc_name,
        COUNT(u.id) as groups_with_matching_user
      FROM business_unit_groups bug
      LEFT JOIN users u ON u.full_name = bug.spoc_name
    `);

    const s = summary.rows[0];
    console.log(`Total Business Groups: ${s.total_groups}`);
    console.log(`Groups with SPOC Name: ${s.groups_with_spoc_name}`);
    console.log(`Groups with Matching User: ${s.groups_with_matching_user}`);
    
    if (s.groups_with_spoc_name > s.groups_with_matching_user) {
      const missing = s.groups_with_spoc_name - s.groups_with_matching_user;
      console.log(`\n⚠️  ${missing} business group(s) have SPOC names but no matching users found.`);
      console.log('   Make sure users exist with exact full_name matching the spoc_name.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('CHECK COMPLETE');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

checkSpocStatus()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
