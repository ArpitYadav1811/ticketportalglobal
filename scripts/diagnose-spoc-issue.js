#!/usr/bin/env node

/**
 * Diagnostic Script: Check SPOC Configuration for CS Brand
 * 
 * This script checks:
 * 1. If CS Brand exists in business_unit_groups
 * 2. What ticket_classification_mappings exist for CS Brand
 * 3. What SPOCs are configured
 */

const { neon } = require('@neondatabase/serverless')

async function diagnose() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log('\n' + '='.repeat(80))
  console.log('SPOC DIAGNOSTIC FOR CS BRAND')
  console.log('='.repeat(80) + '\n')

  try {
    // 1. Check if CS Brand exists
    console.log('1️⃣  Checking if CS Brand exists in business_unit_groups...\n')
    const csBrand = await sql`
      SELECT id, name, description
      FROM business_unit_groups
      WHERE name ILIKE '%brand%'
      ORDER BY name
    `
    
    if (csBrand.length === 0) {
      console.log('❌ No business unit groups found with "brand" in the name\n')
      return
    }
    
    console.log('✅ Found business unit groups:')
    csBrand.forEach(bg => {
      console.log(`   - ID: ${bg.id}, Name: "${bg.name}", Description: "${bg.description || 'N/A'}"`)
    })
    console.log()

    // 2. Check ticket_classification_mapping for CS Brand
    console.log('2️⃣  Checking ticket_classification_mapping for CS Brand...\n')
    
    for (const bg of csBrand) {
      console.log(`\n📋 Mappings for "${bg.name}" (ID: ${bg.id}):`)
      console.log('-'.repeat(80))
      
      const mappings = await sql`
        SELECT 
          tcm.id,
          tcm.target_business_group_id,
          tcm.category_id,
          tcm.subcategory_id,
          tcm.spoc_user_id,
          tcm.estimated_duration,
          c.name as category_name,
          s.name as subcategory_name,
          u.id as user_id,
          u.full_name as spoc_name,
          u.email as spoc_email
        FROM ticket_classification_mapping tcm
        LEFT JOIN categories c ON tcm.category_id = c.id
        LEFT JOIN subcategories s ON tcm.subcategory_id = s.id
        LEFT JOIN users u ON tcm.spoc_user_id = u.id
        WHERE tcm.target_business_group_id = ${bg.id}
        ORDER BY c.name, s.name
      `
      
      if (mappings.length === 0) {
        console.log('   ⚠️  No mappings found for this business group')
      } else {
        console.log(`   ✅ Found ${mappings.length} mapping(s):\n`)
        mappings.forEach((m, idx) => {
          console.log(`   ${idx + 1}. Mapping ID: ${m.id}`)
          console.log(`      Category: ${m.category_name} (ID: ${m.category_id})`)
          console.log(`      Subcategory: ${m.subcategory_name} (ID: ${m.subcategory_id})`)
          console.log(`      Duration: ${m.estimated_duration} minutes`)
          console.log(`      SPOC User ID: ${m.spoc_user_id || 'NULL ❌'}`)
          if (m.spoc_user_id) {
            console.log(`      SPOC Name: ${m.spoc_name}`)
            console.log(`      SPOC Email: ${m.spoc_email}`)
          } else {
            console.log(`      ⚠️  NO SPOC CONFIGURED`)
          }
          console.log()
        })
      }
    }

    // 3. Test the getSpocForTargetBusinessGroup query
    console.log('\n3️⃣  Testing getSpocForTargetBusinessGroup query...\n')
    
    for (const bg of csBrand) {
      console.log(`\n🔍 Testing query for "${bg.name}" (ID: ${bg.id}):`)
      console.log('-'.repeat(80))
      
      const spocResult = await sql`
        SELECT 
          tcm.spoc_user_id,
          u.id,
          u.full_name,
          u.email,
          COUNT(*) as mapping_count
        FROM ticket_classification_mapping tcm
        LEFT JOIN users u ON tcm.spoc_user_id = u.id
        WHERE tcm.target_business_group_id = ${bg.id}
          AND tcm.spoc_user_id IS NOT NULL
        GROUP BY tcm.spoc_user_id, u.id, u.full_name, u.email
        ORDER BY mapping_count DESC, u.id ASC
        LIMIT 1
      `
      
      if (spocResult.length === 0) {
        console.log('   ❌ Query returned NO RESULTS')
        console.log('   This means: No mappings with non-null spoc_user_id found')
      } else {
        console.log('   ✅ Query returned SPOC:')
        console.log(`      User ID: ${spocResult[0].spoc_user_id}`)
        console.log(`      Name: ${spocResult[0].full_name}`)
        console.log(`      Email: ${spocResult[0].email}`)
        console.log(`      Mapping Count: ${spocResult[0].mapping_count}`)
      }
    }

    // 4. Show all users for reference
    console.log('\n\n4️⃣  All users in the system (for reference):\n')
    const users = await sql`
      SELECT id, full_name, email, business_unit_group_id
      FROM users
      ORDER BY full_name
    `
    
    users.forEach(u => {
      console.log(`   - ID: ${u.id}, Name: "${u.full_name}", Email: "${u.email}", BG ID: ${u.business_unit_group_id || 'N/A'}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('DIAGNOSTIC COMPLETE')
    console.log('='.repeat(80) + '\n')

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error)
    console.error('\nError details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    })
    process.exit(1)
  }
}

diagnose()
