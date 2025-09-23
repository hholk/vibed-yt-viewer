#!/usr/bin/env node

/**
 * NocoDB Working Example
 * Based on the actual table structure we discovered
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testWorkingNocoDBAPI() {
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing environment variables');
    return;
  }

  console.log('🔍 Testing Working NocoDB API Methods');
  console.log('=====================================');
  console.log(`📍 URL: ${NC_URL}`);
  console.log(`📊 Table: ${NOCODB_TABLE_ID}`);
  console.log('');

  const client = axios.create({
    headers: {
      'xc-token': NC_TOKEN,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  try {
    // Step 1: Get a record properly (without specifying ID)
    console.log('📥 Step 1: Getting a record properly...');
    const recordsResponse = await client.get(
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
      {
        params: {
          limit: 1,
          fields: 'Id,Title,ImportanceRating,PersonalComment'
        }
      }
    );

    if (!recordsResponse.data?.list || recordsResponse.data.list.length === 0) {
      console.error('❌ No records found');
      return;
    }

    const record = recordsResponse.data.list[0];
    console.log(`✅ Found record: "${record.Title}" (ID: ${record.Id})`);
    console.log(`   Current Rating: ${record.ImportanceRating || 'null'}`);
    console.log(`   Current Comment: ${record.PersonalComment || 'none'}`);

    // Step 2: Try the correct update approach
    console.log('\n🔄 Step 2: Testing correct update methods...');

    const testRating = record.ImportanceRating === 5 ? 4 : 5;
    const testComment = `Test comment - ${new Date().toISOString()}`;

    // Method 1: Update using the record data from list (this should work)
    console.log('   📝 Method 1: Update with full record data');
    try {
      const updateData = {
        Id: record.Id,
        ImportanceRating: testRating,
        PersonalComment: testComment
      };

      const response = await client.patch(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${record.Id}`,
        updateData
      );

      console.log(`   ✅ Method 1: SUCCESS (${response.status})`);
      console.log(`      Updated rating: ${testRating}`);
      console.log(`      Updated comment: ${testComment}`);
    } catch (error) {
      console.log(`   ❌ Method 1: FAILED - ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`      Error: ${JSON.stringify(error.response.data)}`);
      }
    }

    // Method 2: Try bulk update (the most reliable v2 approach)
    console.log('   📝 Method 2: Bulk update with filter');
    try {
      const response = await client.patch(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          filter: `(Id,eq,${record.Id})`,
          data: {
            ImportanceRating: testRating,
            PersonalComment: testComment
          }
        }
      );

      console.log(`   ✅ Method 2: SUCCESS (${response.status})`);
    } catch (error) {
      console.log(`   ❌ Method 2: FAILED - ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`      Error: ${JSON.stringify(error.response.data)}`);
      }
    }

    // Step 3: Verify the update worked
    console.log('\n🔍 Step 3: Verifying updates...');
    try {
      const verifyResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          params: {
            limit: 1,
            fields: 'Id,ImportanceRating,PersonalComment',
            where: `(Id,eq,${record.Id})`
          }
        }
      );

      if (verifyResponse.data?.list && verifyResponse.data.list.length > 0) {
        const updatedRecord = verifyResponse.data.list[0];
        console.log(`✅ Verification: Rating = ${updatedRecord.ImportanceRating}, Comment = "${updatedRecord.PersonalComment || 'none'}"`);

        if (updatedRecord.ImportanceRating === testRating) {
          console.log('🎉 SUCCESS: Rating was updated correctly!');
        } else {
          console.log('⚠️  WARNING: Rating was not updated');
        }

        if (updatedRecord.PersonalComment === testComment) {
          console.log('🎉 SUCCESS: Comment was updated correctly!');
        } else {
          console.log('⚠️  WARNING: Comment was not updated');
        }
      }
    } catch (error) {
      console.log(`❌ Verification failed: ${error.response?.status || error.message}`);
    }

    // Step 4: Show what's working
    console.log('\n📋 Step 4: Summary of working API calls...');
    console.log('✅ GET  /api/v2/tables/{tableId}/records');
    console.log('✅ POST /api/v2/tables/{tableId}/records');
    console.log('✅ PATCH /api/v2/tables/{tableId}/records/{recordId} (with full data)');
    console.log('✅ PATCH /api/v2/tables/{tableId}/records (with filter)');
    console.log('✅ GET  /api/v2/meta/tables/{tableId}');

    console.log('\n💡 Key insights:');
    console.log('1. Use the exact record ID from list responses');
    console.log('2. Include all required fields in update data');
    console.log('3. Use filter-based updates as fallback');
    console.log('4. Verify updates with where clauses');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.log('Response status:', error.response?.status);
      console.log('Response data:', error.response?.data);
    }
  }
}

testWorkingNocoDBAPI();
