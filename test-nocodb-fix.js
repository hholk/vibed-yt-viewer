#!/usr/bin/env node

/**
 * Simple test to verify NocoDB update functionality
 * This will help diagnose the 404 issues
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testNocoDBUpdate() {
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing environment variables');
    console.log('Please check your .env.local file');
    return;
  }

  console.log('🔍 Testing NocoDB Update Functionality');
  console.log('=====================================');
  console.log(`📍 URL: ${NC_URL}`);
  console.log(`🔑 Token: ${NC_TOKEN ? '✅ Present' : '❌ Missing'}`);
  console.log(`📋 Project: ${NOCODB_PROJECT_ID}`);
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
    // Step 1: Get a test record
    console.log('📥 Step 1: Fetching a test record...');
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
      console.error('❌ No records found for testing');
      return;
    }

    const testRecord = recordsResponse.data.list[0];
    console.log(`✅ Found record: "${testRecord.Title}" (ID: ${testRecord.Id})`);
    console.log(`   Rating: ${testRecord.ImportanceRating || 'null'}`);
    console.log(`   Comment: ${testRecord.PersonalComment ? '✅ Has comment' : '❌ No comment'}`);

    // Step 2: Try different update methods
    console.log('\n🔄 Step 2: Testing update methods...');

    // Test data
    const newRating = testRecord.ImportanceRating === 5 ? 4 : 5;
    const testComment = `Test comment - ${new Date().toISOString()}`;

    // Method 1: Row ID based update (recommended v2 approach)
    if (testRecord.rowId || testRecord.RowId || testRecord.__rowId) {
      const rowId = testRecord.rowId || testRecord.RowId || testRecord.__rowId;
      console.log('   📝 Method 1: Row ID Update (PATCH /records/{rowId})');
      try {
        await client.patch(
          `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${encodeURIComponent(rowId)}`,
          { ImportanceRating: newRating }
        );
        console.log('   ✅ Method 1: SUCCESS');
      } catch (error) {
        console.log(`   ❌ Method 1: FAILED - ${error.response?.status || error.message}`);
        if (error.response?.data) {
          console.log(`      Error: ${JSON.stringify(error.response.data)}`);
        }
      }
    }

    // Method 2: Numeric ID based update
    console.log('   📝 Method 2: Numeric ID Update (PATCH /records/{numericId})');
    try {
      await client.patch(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testRecord.Id}`,
        { ImportanceRating: newRating }
      );
      console.log('   ✅ Method 2: SUCCESS');
    } catch (error) {
      console.log(`   ❌ Method 2: FAILED - ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`      Error: ${JSON.stringify(error.response.data)}`);
      }
    }

    // Method 3: Bulk update with filter (v2 standard)
    console.log('   📝 Method 3: Bulk Update with Filter (PATCH /records?filter)');
    try {
      await client.patch(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          filter: `(Id,eq,${testRecord.Id})`,
          data: { ImportanceRating: newRating }
        }
      );
      console.log('   ✅ Method 3: SUCCESS');
    } catch (error) {
      console.log(`   ❌ Method 3: FAILED - ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`      Error: ${JSON.stringify(error.response.data)}`);
      }
    }

    // Step 3: Verify the update
    console.log('\n🔍 Step 3: Verifying updates...');
    try {
      const verifyResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testRecord.Id}`,
        {
          params: {
            fields: 'Id,ImportanceRating,PersonalComment'
          }
        }
      );

      const updatedRecord = verifyResponse.data;
      console.log(`✅ Verification: Rating = ${updatedRecord.ImportanceRating}, Comment = "${updatedRecord.PersonalComment || 'none'}"`);

      if (updatedRecord.ImportanceRating === newRating) {
        console.log('🎉 SUCCESS: Rating was updated correctly!');
      } else {
        console.log('⚠️  WARNING: Rating was not updated');
      }

      if (updatedRecord.PersonalComment === testComment) {
        console.log('🎉 SUCCESS: Comment was updated correctly!');
      } else {
        console.log('⚠️  WARNING: Comment was not updated');
      }

    } catch (error) {
      console.log(`❌ Verification failed: ${error.response?.status || error.message}`);
    }

    console.log('\n📋 Summary:');
    console.log('If all methods failed, your NocoDB instance might:');
    console.log('1. Not support v2 API updates');
    console.log('2. Require a different endpoint structure');
    console.log('3. Need different authentication');
    console.log('4. Have a different API version');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.log('Response status:', error.response?.status);
      console.log('Response data:', error.response?.data);
    }
  }
}

testNocoDBUpdate();
