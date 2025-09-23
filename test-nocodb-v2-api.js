#!/usr/bin/env node

/**
 * Comprehensive NocoDB API v2 Test - Based on Latest Documentation
 * Tests all the updated API endpoints and methods
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testNocoDBV2API() {
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing environment variables');
    console.log('Please check your .env.local file');
    return;
  }

  console.log('🔍 NocoDB v2 API Comprehensive Test');
  console.log('==================================');
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
    // Step 1: Get a test record with basic fields first
    console.log('📥 Step 1: Fetching test record...');
    const basicResponse = await client.get(
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
      {
        params: {
          limit: 1,
          fields: 'Id,Title,ImportanceRating,PersonalComment'
        }
      }
    );

    if (!basicResponse.data?.list || basicResponse.data.list.length === 0) {
      console.error('❌ No records found for testing');
      return;
    }

    const testRecord = basicResponse.data.list[0];
    console.log(`✅ Found record: "${testRecord.Title}" (ID: ${testRecord.Id})`);
    console.log(`   Rating: ${testRecord.ImportanceRating || 'null'}`);
    console.log(`   Comment: ${testRecord.PersonalComment ? '✅ Has comment' : '❌ No comment'}`);

    // Step 1b: Try to get system fields separately
    console.log('📋 Step 1b: Checking available system fields...');
    let rowId = null;
    try {
      const systemResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testRecord.Id}`,
        {
          params: {
            fields: 'Id,rowId,RowId,__rowId,CreatedAt,UpdatedAt'
          }
        }
      );
      const systemRecord = systemResponse.data;
      rowId = systemRecord.rowId || systemRecord.RowId || systemRecord.__rowId;
      console.log(`   Row ID: ${rowId ? '✅ ' + rowId : '❌ Not available'}`);
    } catch (error) {
      console.log(`   Row ID: ❌ Could not fetch system fields - ${error.response?.status || error.message}`);
    }

    // Step 2: Test different update approaches based on latest NocoDB v2 docs
    console.log('\n🔄 Step 2: Testing Update Methods (Latest v2 API)...');

    const testRating = testRecord.ImportanceRating === 5 ? 4 : 5;
    const testComment = `Test comment - ${new Date().toISOString()}`;

    // Method 1: Row ID based update (recommended approach)
    if (testRecord.rowId || testRecord.RowId || testRecord.__rowId) {
      const rowId = testRecord.rowId || testRecord.RowId || testRecord.__rowId;
      console.log(`   📝 Method 1: Row ID Update (PATCH /records/{rowId})`);

      try {
        const response = await client.patch(
          `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${encodeURIComponent(rowId)}`,
          {
            ImportanceRating: testRating,
            PersonalComment: testComment
          }
        );
        console.log(`   ✅ Method 1: SUCCESS (${response.status})`);
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
      const response = await client.patch(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testRecord.Id}`,
        {
          ImportanceRating: testRating
        }
      );
      console.log(`   ✅ Method 2: SUCCESS (${response.status})`);
    } catch (error) {
      console.log(`   ❌ Method 2: FAILED - ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`      Error: ${JSON.stringify(error.response.data)}`);
      }
      // Method 1: Row ID based update (recommended approach)
      if (rowId) {
        console.log('   📝 Method 1: Row ID Update (PATCH /records/{rowId})');
        try {
          const response = await client.patch(
            `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${encodeURIComponent(rowId)}`,
            {
              ImportanceRating: testRating,
              PersonalComment: testComment
            }
          );
          console.log(`   ✅ Method 1: SUCCESS (${response.status})`);
        } catch (error) {
          console.log(`   ❌ Method 1: FAILED - ${error.response?.status || error.message}`);
          if (error.response?.data) {
            console.log(`      Error: ${JSON.stringify(error.response.data)}`);
          }
        }
      }

      // Method 4: PUT with row ID (alternative approach)
      if (rowId) {
        console.log('   📝 Method 4: Row ID Update (PUT /records/{rowId})');
        try {
          const response = await client.put(
            `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${encodeURIComponent(rowId)}`,
            {
              Id: testRecord.Id,
              ImportanceRating: testRating,
              PersonalComment: testComment
            }
          );
          console.log(`   ✅ Method 4: SUCCESS (${response.status})`);
        } catch (error) {
          console.log(`   ❌ Method 4: FAILED - ${error.response?.status || error.message}`);
          if (error.response?.data) {
            console.log(`      Error: ${JSON.stringify(error.response.data)}`);
          }
        }
      }
    }

    // Method 3: Bulk update with filter (v2 API standard)
    console.log('   📝 Method 3: Bulk Update with Filter (PATCH /records?filter)');
    try {
      const response = await client.patch(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          filter: `(Id,eq,${testRecord.Id})`,
          data: {
            ImportanceRating: testRating,
            PersonalComment: testComment
          }
        }
      );
      console.log(`   ✅ Method 3: SUCCESS (${response.status})`);
    } catch (error) {
      console.log(`   ❌ Method 3: FAILED - ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log(`      Error: ${JSON.stringify(error.response.data)}`);
      }
    }

    // Method 4: PUT with row ID (alternative approach)
    if (rowId) {
      console.log('   📝 Method 4: Row ID Update (PUT /records/{rowId})');

      try {
        const response = await client.put(
          `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${encodeURIComponent(rowId)}`,
          {
            Id: testRecord.Id,
            ImportanceRating: testRating,
            PersonalComment: testComment
          }
        );
        console.log(`   ✅ Method 4: SUCCESS (${response.status})`);
      } catch (error) {
        console.log(`   ❌ Method 4: FAILED - ${error.response?.status || error.message}`);
        if (error.response?.data) {
          console.log(`      Error: ${JSON.stringify(error.response.data)}`);
        }
      }
    }

    // Step 3: Verify the updates
    console.log('\n🔍 Step 3: Verifying Updates...');
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

    } catch (error) {
      console.log(`❌ Verification failed: ${error.response?.status || error.message}`);
    }

    // Step 4: Test the actual API endpoints that should be working
    console.log('\n📋 Step 4: API Endpoint Analysis...');
    console.log('Based on latest NocoDB v2 documentation, these endpoints should work:');
    console.log(`✅ GET  ${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`);
    console.log(`✅ POST ${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`);
    console.log(`✅ PATCH ${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/{rowId}`);
    console.log(`✅ PATCH ${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records?filter=(Id,eq,X)`);
    console.log(`✅ DELETE ${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/{rowId}`);

    console.log('\n📊 Summary:');
    console.log('If row ID updates work, your NocoDB is properly configured');
    console.log('If only bulk updates work, there may be row ID issues');
    console.log('If all methods fail, check NocoDB permissions or version');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.log('Response status:', error.response?.status);
      console.log('Response data:', error.response?.data);
    }
  }
}

testNocoDBV2API();
