#!/usr/bin/env node

/**
 * Diagnostic Script: Check TD Apps SPOC Configuration
 * 
 * This script checks:
 * 1. If TD Apps business group exists
 * 2. What SPOC name is assigned to TD Apps
 * 3. If a user with that SPOC name exists
 * 4. Why SPOC lookup might be failing
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function diagnoseTdAppsSpoc() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n' + '='.repeat(80));
    console.log('TD APPS SPOC DIAGNOSTIC');
    console.log('='.repeat(80) + '\n');

    await client.connect();
    console.log('✓ Connected to database\n');

    // 1. Check if TD Apps exists
    console.log('1️⃣  Checking TD Apps Business Group...\n');
    const tdApps = await client.query(`
      SELECT id, name, description, spoc_name
      FROM business_unit_groups
      WHERE name = 'TD Apps'
    `);

    if (tdApps.rows.length === 0) {
      console.log('❌ TD Apps business group NOT FOUND\n');
      console.log('Available business groups:');
      const allGroups = await client.query(`
        SELECT id, name, spoc_name
        FROM business_unit_groups
        ORDER BY name
      `);
      allGroups.rows.forEach(g => {
        console.log(`   - ${g.name} (ID: ${g.id}, SPOC: ${g.spoc_name || 'N/A'})`);
      });
      return;
    }

    const group = tdApps.rows[0];
    console.log('✅ TD Apps found:');
    console.log(`   ID: ${group.id}`);
    console.log(`   Name: ${group.name}`);
    console.log(`   Description: ${group.description || 'N/A'}`);
    console.log(`   SPOC Name: ${group.spoc_name || '❌ NOT SET'}\n`);

    // 2. Check if SPOC name is set
    if (!group.spoc_name) {
      console.log('❌ PROBLEM: spoc_name is NULL or empty in business_unit_groups table\n');
      console.log('   Solution: Set spoc_name in business_unit_groups table');
      console.log('   Run: UPDATE business_unit_groups SET spoc_name = \'Joji Joseph\' WHERE name = \'TD Apps\';\n');
      return;
    }

    // 3. Check if user exists with that SPOC name
    console.log('2️⃣  Checking if user exists with SPOC name...\n');
    console.log(`   Looking for user with full_name = '${group.spoc_name}' (exact match, case-sensitive)\n`);

    const users = await client.query(`
      SELECT id, full_name, email, role
      FROM users
      WHERE full_name = $1
    `, [group.spoc_name]);

    if (users.rows.length === 0) {
      console.log(`❌ PROBLEM: No user found with full_name = '${group.spoc_name}'\n`);
      
      // Show similar names
      console.log('   Checking for similar names (case-insensitive)...\n');
      const similarUsers = await client.query(`
        SELECT id, full_name, email, role
        FROM users
        WHERE LOWER(full_name) = LOWER($1)
      `, [group.spoc_name]);

      if (similarUsers.rows.length > 0) {
        console.log('   ⚠️  Found user(s) with similar name (different case):');
        similarUsers.rows.forEach(u => {
          console.log(`      - ID: ${u.id}, Name: "${u.full_name}", Email: ${u.email}`);
        });
        console.log('\n   Solution: Update user full_name to match exactly:');
        console.log(`   UPDATE users SET full_name = '${group.spoc_name}' WHERE id = ${similarUsers.rows[0].id};\n`);
      } else {
        console.log('   No users found with similar name either.\n');
        console.log('   Solution: Create user or update spoc_name to match existing user:\n');
        
        // Show all users for reference
        const allUsers = await client.query(`
          SELECT id, full_name, email
          FROM users
          ORDER BY full_name
          LIMIT 20
        `);
        console.log('   Available users (first 20):');
        allUsers.rows.forEach(u => {
          console.log(`      - "${u.full_name}" (${u.email})`);
        });
        console.log();
      }
      return;
    }

    const user = users.rows[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Full Name: ${user.full_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}\n`);

    // 4. Test the exact query used by getSpocForTargetBusinessGroup
    console.log('3️⃣  Testing getSpocForTargetBusinessGroup query...\n');
    const spocQuery = await client.query(`
      SELECT 
        bug.spoc_name,
        u.id,
        u.full_name,
        u.email
      FROM business_unit_groups bug
      LEFT JOIN users u ON u.full_name = bug.spoc_name
      WHERE bug.id = $1
      LIMIT 1
    `, [group.id]);

    console.log('Query result:');
    if (spocQuery.rows.length === 0) {
      console.log('   ❌ Query returned NO ROWS (this should not happen)');
    } else {
      const result = spocQuery.rows[0];
      console.log(`   spoc_name: ${result.spoc_name || 'NULL'}`);
      console.log(`   user.id: ${result.id || 'NULL'}`);
      console.log(`   user.full_name: ${result.full_name || 'NULL'}`);
      console.log(`   user.email: ${result.email || 'NULL'}\n`);

      if (result.id) {
        console.log('✅ SUCCESS: Query would return SPOC correctly!');
        console.log(`   The function should work and return user ID: ${result.id}\n`);
      } else {
        console.log('❌ PROBLEM: Query returned row but user.id is NULL');
        console.log('   This means the LEFT JOIN did not match.\n');
        console.log('   Possible causes:');
        console.log('   1. User full_name does not match spoc_name exactly (case-sensitive)');
        console.log('   2. User full_name has extra spaces');
        console.log('   3. User full_name has special characters\n');
      }
    }

    // 5. Show functional area mappings for reference
    console.log('4️⃣  Functional Area Mappings (for reference)...\n');
    const faMappings = await client.query(`
      SELECT 
        fa.name as functional_area,
        bug.name as business_group
      FROM functional_area_business_group_mapping fabgm
      JOIN functional_areas fa ON fabgm.functional_area_id = fa.id
      JOIN business_unit_groups bug ON fabgm.target_business_group_id = bug.id
      WHERE bug.name = 'TD Apps'
      ORDER BY fa.name
    `);

    if (faMappings.rows.length > 0) {
      console.log('   Functional areas mapped to TD Apps:');
      faMappings.rows.forEach(m => {
        console.log(`      - ${m.functional_area}`);
      });
    } else {
      console.log('   ⚠️  No functional areas mapped to TD Apps');
    }
    console.log();

    console.log('='.repeat(80));
    console.log('DIAGNOSTIC COMPLETE');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

diagnoseTdAppsSpoc()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
