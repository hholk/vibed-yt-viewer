#!/usr/bin/env node

/**
 * NocoDB API v2 vs v3 Comparison Test
 * Tests both API versions to see which works for updates
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testAPIVersions() {
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing environment variables');
    return;
  }

  console.log('🔄 NocoDB API v2 vs v3 Comparison Test');
  console.log('=====================================');
  console.log(`📍 URL: ${NC_URL}`);
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
    console.log('📥 Step 1: Getting test record...');
    const recordResponse = await client.get(
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
      { params: { limit: 1 } }
    );

    if (!recordResponse.data?.list || recordResponse.data.list.length === 0) {
      console.error('❌ No records found');
      return;
    }

    const record = recordResponse.data.list[0];
    console.log(`✅ Found: "${record.Title}" (ID: ${record.Id})`);

    // Step 2: Test API v3 availability
    console.log('\n🔌 Step 2: Testing API v3 availability...');
    let v3Available = false;

    try {
      const v3Response = await client.get(`${NC_URL}/api/v3/version`);
      console.log('✅ API v3 is available');
      v3Available = true;
    } catch (error) {
      console.log('❌ API v3 not available');
    }

    // Step 3: Test v2 API methods (we know these exist)
    console.log('\n📝 Step 3: Testing API v2 methods...');

    const testData = {
      ImportanceRating: 5,
      PersonalComment: `API v2/v3 Test - ${new Date().toISOString()}`
    };

    const v2Attempts = [
      {
        name: 'v2 Direct Update',
        method: 'patch',
        url: `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${record.Id}`,
        data: testData
      },
      {
        name: 'v2 Filter Update',
        method: 'patch',
        url: `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        data: {
          filter: `(Id,eq,${record.Id})`,
          data: testData
        }
      }
    ];

    for (const attempt of v2Attempts) {
      try {
        const response = await client[attempt.method](attempt.url, attempt.data);
        console.log(`✅ ${attempt.name}: SUCCESS (${response.status})`);
      } catch (error) {
        console.log(`❌ ${attempt.name}: FAILED - ${error.response?.status || error.message}`);
      }
    }

    // Step 4: Test API v3 methods if available
    if (v3Available) {
      console.log('\n🔄 Step 4: Testing API v3 methods...');

      const v3Attempts = [
        {
          name: 'v3 Direct Update',
          method: 'patch',
          url: `${NC_URL}/api/v3/data/${NOCODB_PROJECT_ID}/${NOCODB_TABLE_ID}/records/${record.Id}`,
          data: testData
        },
        {
          name: 'v3 Filter Update',
          method: 'patch',
          url: `${NC_URL}/api/v3/data/${NOCODB_PROJECT_ID}/${NOCODB_TABLE_ID}/records`,
          data: {
            filter: `(Id,eq,${record.Id})`,
            data: testData
          }
        }
      ];

      for (const attempt of v3Attempts) {
        try {
          const response = await client[attempt.method](attempt.url, attempt.data);
          console.log(`✅ ${attempt.name}: SUCCESS (${response.status})`);
        } catch (error) {
          console.log(`❌ ${attempt.name}: FAILED - ${error.response?.status || error.message}`);
        }
      }
    }

    // Step 5: Summary and recommendations
    console.log('\n📋 Step 5: Summary & Recommendations...');

    if (v3Available) {
      console.log('🎯 API v3 is available - may have different permission model');
      console.log('💡 Try updating your code to use v3 endpoints');
    } else {
      console.log('📌 Only API v2 is available');
      console.log('🔧 Issue is likely field/table permissions in NocoDB GUI');
    }

    console.log('\n🛠️  Recommended Actions:');
    console.log('1. Check NocoDB Dashboard for field permissions');
    console.log('2. Verify ImportanceRating and PersonalComment field permissions');
    console.log('3. Ensure table permissions allow updates');
    console.log('4. Create new API token with explicit permissions');
    console.log('5. Try API v3 if available');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.log('Response status:', error.response?.status);
      console.log('Response data:', error.response?.data);
    }
  }
}

testAPIVersions();
