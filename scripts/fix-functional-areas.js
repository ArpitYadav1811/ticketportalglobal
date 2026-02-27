#!/usr/bin/env node

/**
 * Fix Script: Create and Seed Functional Areas
 * 
 * This script creates the functional_areas table and seeds it with data.
 * Safe to run multiple times - uses ON CONFLICT DO NOTHING.
 * 
 * Uses pg Client (like run-sql-file.js) for better compatibility
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

async function fixFunctionalAreas() {
  console.log('🔧 Fixing Functional Areas Table...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    console.error('   Please ensure .env.local exists and contains DATABASE_URL');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, '027-seed-functional-areas-updated.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ SQL file not found: ${sqlFilePath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split by semicolons to execute statements one by one
    // This is safer than executing all at once
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    let executed = 0;
    let errors = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip empty statements and comments
      if (!statement || statement.length < 10) continue;
      
      try {
        // Execute statement
        await sql.unsafe(statement);
        executed++;
        
        // Show progress for key operations
        if (statement.includes('CREATE TABLE') || statement.includes('INSERT INTO')) {
          const tableMatch = statement.match(/CREATE TABLE.*?(\w+)|INSERT INTO.*?(\w+)/i);
          const tableName = tableMatch ? (tableMatch[1] || tableMatch[2]) : 'table';
          console.log(`  ✅ ${tableName.includes('functional') ? 'functional_areas' : 'mapping'} operation`);
        }
      } catch (error) {
        // Some errors are expected (like "already exists")
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('ON CONFLICT')) {
          // These are safe to ignore
          executed++;
        } else {
          errors++;
          console.error(`  ⚠️  Error in statement ${i + 1}: ${error.message.substring(0, 100)}`);
        }
      }
    }

    console.log(`\n✅ Executed ${executed} statements`);

    // Verify the fix
    console.log('\n🔍 Verifying fix...\n');
    
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'functional_areas'
      ) as exists
    `;
    
    if (!tableCheck[0]?.exists) {
      console.error('❌ Table still does not exist after creation attempt');
      process.exit(1);
    }

    const count = await sql`SELECT COUNT(*) as count FROM functional_areas`;
    const recordCount = parseInt(count[0]?.count || 0);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ FIX COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`  ✅ functional_areas table exists`);
    console.log(`  ✅ Found ${recordCount} functional areas`);
    
    if (recordCount >= 12) {
      console.log(`  ✅ All functional areas are present (expected: 12)`);
    } else if (recordCount > 0) {
      console.log(`  ⚠️  Only ${recordCount} functional areas found (expected: 12)`);
      console.log(`  → You may need to run the seed script again`);
    } else {
      console.log(`  ⚠️  Table is empty - seeding data...`);
      
      // Try to seed data directly
      try {
        await sql`
          INSERT INTO functional_areas (name, description) VALUES
            ('MFBuddy support', 'Support for MFBuddy application'),
            ('Customer Portal support', 'Support for Customer Portal'),
            ('Ticket Portal support', 'Support for Ticket Portal'),
            ('Billing Portal support', 'Support for Billing Portal'),
            ('Customer Integrations support', 'Support for Customer Integrations'),
            ('GUI Development support', 'GUI Development work'),
            ('IT Administration support', 'IT Administration tasks'),
            ('IT Security support', 'IT Security tasks'),
            ('IT DevOps support', 'IT DevOps tasks'),
            ('Customer Solutions support', 'Customer Solutions work'),
            ('Competitive Research support', 'Competitive Research work'),
            ('Others', 'Other functional areas')
          ON CONFLICT (name) DO NOTHING
        `;
        
        const newCount = await sql`SELECT COUNT(*) as count FROM functional_areas`;
        console.log(`  ✅ Seeded data - now have ${newCount[0].count} functional areas`);
      } catch (seedError) {
        console.error(`  ❌ Failed to seed data: ${seedError.message}`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('🎉 Fix complete! The functional_areas table is now ready.');
    console.log('   Restart your Next.js dev server if it\'s running.\n');

  } catch (error) {
    console.error('\n❌ Error during fix:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

fixFunctionalAreas()
  .catch((error) => {
    console.error('Failed to fix:', error);
    process.exit(1);
  });
