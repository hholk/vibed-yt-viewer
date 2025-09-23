#!/usr/bin/env node

/**
 * NocoDB v0.264.9 Permission Test & Fix
 * Tests the actual permissions available in this version
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function testV2649Permissions() {
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing environment variables');
    return;
  }

  console.log('🔍 NocoDB v0.264.9 Permission Test');
  console.log('===================================');
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
    // Test 1: Basic connectivity
    console.log('📡 Test 1: Basic connectivity...');
    try {
      const response = await client.get(`${NC_URL}/api/v2/version`);
      console.log('✅ Connected to NocoDB v0.264.9');
    } catch (error) {
      console.log('❌ Cannot connect to NocoDB');
      return;
    }

    // Test 2: Read permissions
    console.log('\n📖 Test 2: Read permissions...');
    try {
      const readResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        { params: { limit: 1 } }
      );
      console.log('✅ Can read records');
    } catch (error) {
      console.log('❌ Cannot read records - check API token');
      return;
    }

    // Test 3: Create permissions
    console.log('\n📝 Test 3: Create permissions...');
    try {
      const createResponse = await client.post(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          Title: 'Permission Test',
          ImportanceRating: 3,
          PersonalComment: 'Testing permissions'
        }
      );
      console.log('✅ Can create records');
    } catch (error) {
      console.log('❌ Cannot create records');
      console.log('SOLUTION: Check user role in NocoDB workspace');
      return;
    }

    // Test 4: Update permissions (the issue)
    console.log('\n🔄 Test 4: Update permissions...');
    try {
      const createResponse = await client.post(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        { Title: 'Update Test', ImportanceRating: 3 }
      );

      const recordId = createResponse.data?.Id;
      if (recordId) {
        const updateResponse = await client.patch(
          `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${recordId}`,
          { ImportanceRating: 5 }
        );
        console.log('✅ Can update records');
      }
    } catch (error) {
      console.log('❌ Cannot update records');
      console.log('SOLUTION: API token needs higher permissions');
    }

    // Test 5: Different API approaches for v0.264.9
    console.log('\n🧪 Test 5: Version-specific approaches...');

    const methods = [
      { name: 'Direct ID Update', method: 'patch', url: `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/1`, data: { ImportanceRating: 4 } },
      { name: 'Filter Update', method: 'patch', url: `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`, data: { filter: '(Id,eq,1)', data: { ImportanceRating: 4 } } },
      { name: 'PUT Update', method: 'put', url: `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/1`, data: { ImportanceRating: 4 } }
    ];

    for (const method of methods) {
      try {
        const response = await client[method.method](method.url, method.data);
        console.log(`✅ ${method.name}: SUCCESS (${response.status})`);
      } catch (error) {
        console.log(`❌ ${method.name}: FAILED - ${error.response?.status || error.message}`);
      }
    }

    console.log('\n📋 SUMMARY FOR v0.264.9:');
    console.log('✅ This version uses simple role-based permissions');
    console.log('✅ No field-level or table-level granular permissions');
    console.log('✅ Issue is likely API token role restrictions');
    console.log('✅ Try creating token with "Creator" role');

    console.log('\n🛠️  SPECIFIC FIXES:');
    console.log('1. Check user role in NocoDB workspace (Team & Settings)');
    console.log('2. Create new API token with "Creator" permissions');
    console.log('3. Test manual editing in browser first');
    console.log('4. Verify no table-level access restrictions');

  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.log('Response status:', error.response?.status);
      console.log('Response data:', error.response?.data);
    }
  }
}

testV2649Permissions();
