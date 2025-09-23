#!/usr/bin/env node

/**
 * NocoDB Permission Test & Fix
 * Tests different permission scenarios and provides solutions
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testNocoDBPermissions() {
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing environment variables');
    return;
  }

  console.log('🔐 NocoDB Permissions Test & Fix');
  console.log('=================================');
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
    // Test 1: Check if we can read
    console.log('📖 Test 1: Read permissions...');
    try {
      const readResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        { params: { limit: 1 } }
      );
      console.log('✅ Read permissions: WORKING');
    } catch (error) {
      console.log('❌ Read permissions: FAILED');
      console.log('This suggests the API token or table access is not configured correctly');
      return;
    }

    // Test 2: Try to create a new record
    console.log('\n📝 Test 2: Write permissions (create)...');
    try {
      const createResponse = await client.post(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          Title: 'Permission Test',
          ImportanceRating: 3,
          PersonalComment: 'Testing write permissions'
        }
      );
      console.log('✅ Create permissions: WORKING');
    } catch (error) {
      console.log('❌ Create permissions: FAILED');
      console.log('This indicates write permissions are not granted');
      console.log('SOLUTION: Check API token permissions in NocoDB dashboard');
      return;
    }

    // Test 3: Try to update the created record
    console.log('\n🔄 Test 3: Update permissions...');
    const testRecord = {
      Title: 'Permission Test',
      ImportanceRating: 3,
      PersonalComment: 'Testing write permissions'
    };

    try {
      const createResponse = await client.post(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        testRecord
      );

      if (createResponse.data?.Id) {
        const recordId = createResponse.data.Id;
        console.log(`Created test record with ID: ${recordId}`);

        // Now try to update it
        const updateResponse = await client.patch(
          `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${recordId}`,
          {
            ImportanceRating: 5,
            PersonalComment: 'Updated via API'
          }
        );

        console.log('✅ Update permissions: WORKING');
        console.log('🎉 All permissions are working correctly!');
      }
    } catch (error) {
      console.log('❌ Update permissions: FAILED');
      console.log('SOLUTION: API token needs write permissions');
    }

    // Test 4: Test different update methods
    console.log('\n🧪 Test 4: Different update methods...');
    const methods = [
      {
        name: 'Direct ID Update',
        method: 'patch',
        url: `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/1`,
        data: { ImportanceRating: 4 }
      },
      {
        name: 'Filter-based Update',
        method: 'patch',
        url: `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        data: {
          filter: '(Id,eq,1)',
          data: { ImportanceRating: 4 }
        }
      }
    ];

    for (const method of methods) {
      try {
        const response = await client[method.method](method.url, method.data);
        console.log(`✅ ${method.name}: SUCCESS (${response.status})`);
      } catch (error) {
        console.log(`❌ ${method.name}: FAILED - ${error.response?.status || error.message}`);
      }
    }

    console.log('\n📋 SUMMARY & SOLUTIONS:');
    console.log('1. If reads work but writes fail: Check API token permissions');
    console.log('2. If both fail: Check table access settings');
    console.log('3. If all tests pass: Your API should work for the video app');
    console.log('4. Open NocoDB dashboard at http://localhost:8080 to verify settings');

  } catch (error) {
    console.error('\n💥 Permission test failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.log('Response status:', error.response?.status);
      console.log('Response data:', error.response?.data);
    }
  }
}

testNocoDBPermissions();
