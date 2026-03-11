#!/usr/bin/env node

/**
 * Migration Script: Hash Plain Text Passwords
 * 
 * This script identifies users with plain text passwords (not bcrypt hashes)
 * and hashes them using bcrypt with 10 salt rounds.
 * 
 * A bcrypt hash always starts with $2a$, $2b$, or $2y$ and is 60 characters long.
 * Plain text passwords are typically shorter and don't start with these prefixes.
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function migratePasswords() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n' + '='.repeat(80));
    console.log('MIGRATING PLAIN TEXT PASSWORDS TO BCRYPT');
    console.log('='.repeat(80) + '\n');

    await client.connect();
    console.log('✓ Connected to database\n');

    // Find users with potential plain text passwords
    // Bcrypt hashes: start with $2a$, $2b$, or $2y$ and are 60 chars
    // Also exclude NULL (SSO users) and empty strings
    console.log('1️⃣  Finding users with plain text passwords...');
    const usersResult = await client.query(`
      SELECT id, email, full_name, password_hash
      FROM users
      WHERE password_hash IS NOT NULL
        AND password_hash != ''
        AND (
          LENGTH(password_hash) < 60
          OR NOT (password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' OR password_hash LIKE '$2y$%')
        )
    `);

    const usersToMigrate = usersResult.rows;
    console.log(`✓ Found ${usersToMigrate.length} user(s) with potential plain text passwords\n`);

    if (usersToMigrate.length === 0) {
      console.log('✅ No plain text passwords found. All passwords are already hashed!\n');
      return;
    }

    // Show users that will be migrated
    console.log('2️⃣  Users to migrate:');
    usersToMigrate.forEach((user, index) => {
      const passwordPreview = user.password_hash 
        ? (user.password_hash.length > 20 ? user.password_hash.substring(0, 20) + '...' : user.password_hash)
        : 'NULL';
      console.log(`   ${index + 1}. ${user.email} (${user.full_name}) - Password: ${passwordPreview}`);
    });
    console.log('');

    // Ask for confirmation
    console.log('⚠️  WARNING: This will hash plain text passwords.');
    console.log('   Users with plain text passwords will need to use their current password to login.');
    console.log('   After migration, the password will be hashed and login will work normally.\n');

    // Hash each password
    console.log('3️⃣  Hashing passwords...');
    let successCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate) {
      try {
        const hashedPassword = await bcrypt.hash(user.password_hash, 10);
        
        await client.query(
          `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [hashedPassword, user.id]
        );

        console.log(`   ✓ Migrated: ${user.email}`);
        successCount++;
      } catch (error) {
        console.error(`   ✗ Error migrating ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n4️⃣  Migration Summary:`);
    console.log(`   ✓ Successfully migrated: ${successCount}`);
    console.log(`   ✗ Errors: ${errorCount}`);

    // Verify migration
    console.log('\n5️⃣  Verifying migration...');
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE password_hash IS NOT NULL
        AND password_hash != ''
        AND (
          LENGTH(password_hash) < 60
          OR NOT (password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' OR password_hash LIKE '$2y$%')
        )
    `);

    const remainingPlainText = parseInt(verifyResult.rows[0].count);
    if (remainingPlainText === 0) {
      console.log('   ✅ All passwords are now properly hashed!\n');
    } else {
      console.log(`   ⚠️  Warning: ${remainingPlainText} user(s) still have plain text passwords.\n`);
    }

    console.log('='.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await client.end();
  }
}

migratePasswords()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
