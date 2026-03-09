#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function verifySpocAssignments() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    console.log('\n' + '='.repeat(100));
    console.log('VERIFYING SPOC ASSIGNMENTS - COMPARING DATABASE vs UI');
    console.log('='.repeat(100) + '\n');

    // Get all business groups with their SPOC assignments
    const result = await client.query(`
      SELECT 
        bug.id,
        bug.name as business_group,
        bug.spoc_name as assigned_spoc_name,
        u.id as user_id,
        u.full_name as user_full_name,
        u.email as user_email,
        CASE 
          WHEN u.id IS NOT NULL THEN '✅ MATCH - User exists'
          WHEN bug.spoc_name IS NOT NULL THEN '❌ NO MATCH - User not found'
          ELSE '⚠️  No SPOC assigned'
        END as match_status
      FROM business_unit_groups bug
      LEFT JOIN users u ON u.full_name = bug.spoc_name
      ORDER BY bug.name
    `);

    console.log('Business Group    | SPOC Name (in DB)    | Status                    | User Found? | User Email');
    console.log('-'.repeat(100));
    
    const issues = [];
    result.rows.forEach(row => {
      const bg = (row.business_group || '').padEnd(17);
      const spoc = (row.assigned_spoc_name || 'N/A').padEnd(20);
      const status = (row.match_status || '').padEnd(25);
      const userFound = row.user_id ? 'YES' : 'NO';
      const email = (row.user_email || 'N/A').substring(0, 30);
      console.log(`${bg} | ${spoc} | ${status} | ${userFound.padEnd(11)} | ${email}`);
      
      if (row.assigned_spoc_name && !row.user_id) {
        issues.push({
          businessGroup: row.business_group,
          spocName: row.assigned_spoc_name
        });
      }
    });

    console.log('\n' + '='.repeat(100));
    console.log('ISSUES FOUND');
    console.log('='.repeat(100));
    
    if (issues.length === 0) {
      console.log('✅ All SPOC assignments have matching users!');
    } else {
      console.log(`❌ ${issues.length} Business Group(s) have SPOC names but NO matching users:\n`);
      issues.forEach(issue => {
        console.log(`   Business Group: ${issue.businessGroup}`);
        console.log(`   SPOC Name in DB: "${issue.spocName}"`);
        console.log(`   Problem: No user found with full_name = "${issue.spocName}"`);
        
        // Check for similar names
        client.query(`
          SELECT id, full_name, email
          FROM users
          WHERE LOWER(full_name) LIKE LOWER($1)
          LIMIT 5
        `, [`%${issue.spocName.split(' ')[0]}%`]).then(similar => {
          if (similar.rows.length > 0) {
            console.log(`   Similar users found:`);
            similar.rows.forEach(u => {
              console.log(`      - "${u.full_name}" (${u.email})`);
            });
          }
        }).catch(() => {});
        
        console.log(`   Solution: Create user with full_name = "${issue.spocName}" OR update spoc_name to match existing user\n`);
      });
    }

    // Check for users that might be intended SPOCs
    console.log('\n' + '='.repeat(100));
    console.log('SUGGESTED SPOC USERS (users with "SPOC" in name or role)');
    console.log('='.repeat(100));
    const spocUsers = await client.query(`
      SELECT id, full_name, email, role
      FROM users
      WHERE LOWER(full_name) LIKE '%spoc%' 
         OR LOWER(email) LIKE '%spoc%'
         OR role = 'admin'
      ORDER BY full_name
      LIMIT 20
    `);
    
    if (spocUsers.rows.length > 0) {
      spocUsers.rows.forEach(u => {
        console.log(`   - "${u.full_name}" (${u.email}) - Role: ${u.role}`);
      });
    } else {
      console.log('   No users found with "SPOC" in name');
    }

    console.log('\n' + '='.repeat(100) + '\n');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

verifySpocAssignments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
