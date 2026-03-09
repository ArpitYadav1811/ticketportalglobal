#!/usr/bin/env node

/**
 * Fix SPOC User Mismatches
 * 
 * This script:
 * 1. Finds all business groups with SPOC names that don't have matching users
 * 2. Creates missing users OR suggests fixes
 * 3. Fixes case mismatches (e.g., "sachin kumar" -> "Sachin Kumar")
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function fixSpocMismatches() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('\n' + '='.repeat(100));
    console.log('FIXING SPOC USER MISMATCHES');
    console.log('='.repeat(100) + '\n');

    // Find all mismatches
    const mismatches = await client.query(`
      SELECT 
        bug.id as group_id,
        bug.name as business_group,
        bug.spoc_name,
        u.id as user_id,
        u.full_name as user_full_name
      FROM business_unit_groups bug
      LEFT JOIN users u ON u.full_name = bug.spoc_name
      WHERE bug.spoc_name IS NOT NULL AND u.id IS NULL
      ORDER BY bug.name
    `);

    if (mismatches.rows.length === 0) {
      console.log('✅ No mismatches found! All SPOC assignments have matching users.\n');
      return;
    }

    console.log(`Found ${mismatches.rows.length} SPOC assignment(s) without matching users:\n`);

    for (const mismatch of mismatches.rows) {
      console.log(`\n📋 Business Group: ${mismatch.business_group}`);
      console.log(`   SPOC Name in DB: "${mismatch.spoc_name}"`);
      
      // Check for case-insensitive match
      const similarUser = await client.query(`
        SELECT id, full_name, email
        FROM users
        WHERE LOWER(full_name) = LOWER($1)
        LIMIT 1
      `, [mismatch.spoc_name]);

      if (similarUser.rows.length > 0) {
        const user = similarUser.rows[0];
        console.log(`   ⚠️  Found user with similar name (different case): "${user.full_name}"`);
        console.log(`   🔧 Fixing: Updating user full_name to match SPOC name...`);
        
        await client.query(`
          UPDATE users
          SET full_name = $1
          WHERE id = $2
        `, [mismatch.spoc_name, user.id]);
        
        console.log(`   ✅ Fixed: User "${user.full_name}" updated to "${mismatch.spoc_name}"`);
      } else {
        console.log(`   ❌ No user found (even with case-insensitive search)`);
        console.log(`   💡 Solution: Create user with full_name = "${mismatch.spoc_name}"`);
        console.log(`      You can create this user via Master Settings > Users`);
      }
    }

    // Verify fixes
    console.log('\n' + '='.repeat(100));
    console.log('VERIFYING FIXES');
    console.log('='.repeat(100) + '\n');

    const remaining = await client.query(`
      SELECT 
        bug.name as business_group,
        bug.spoc_name
      FROM business_unit_groups bug
      LEFT JOIN users u ON u.full_name = bug.spoc_name
      WHERE bug.spoc_name IS NOT NULL AND u.id IS NULL
      ORDER BY bug.name
    `);

    if (remaining.rows.length === 0) {
      console.log('✅ All SPOC assignments now have matching users!\n');
    } else {
      console.log(`⚠️  ${remaining.rows.length} SPOC assignment(s) still need users created:\n`);
      remaining.rows.forEach(r => {
        console.log(`   - ${r.business_group}: Needs user with full_name = "${r.spoc_name}"`);
      });
      console.log('\n   Create these users via Master Settings > Users\n');
    }

    console.log('='.repeat(100) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

fixSpocMismatches()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
