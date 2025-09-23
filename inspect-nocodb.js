#!/usr/bin/env node

/**
 * NocoDB Table Structure Inspector
 * This will help us understand what fields and API endpoints are actually available
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function inspectNocoDBStructure() {
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing environment variables');
    return;
  }

  console.log('🔍 NocoDB Table Structure Inspector');
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
    // Step 1: Get table metadata
    console.log('📋 Step 1: Getting table metadata...');
    try {
      const metaResponse = await client.get(`${NC_URL}/api/v2/meta/tables/${NOCODB_TABLE_ID}`);
      console.log('✅ Table metadata retrieved');
      console.log('Table info:', JSON.stringify(metaResponse.data, null, 2));
    } catch (error) {
      console.log(`❌ Table metadata failed: ${error.response?.status || error.message}`);
    }

    // Step 2: Get a record with all possible fields
    console.log('\n📋 Step 2: Getting record with all fields...');
    try {
      const recordResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/1`,
        {
          params: {
            fields: '*'
          }
        }
      );
      console.log('✅ Record retrieved');
      console.log('Available fields:', Object.keys(recordResponse.data));
      console.log('Full record:', JSON.stringify(recordResponse.data, null, 2));
    } catch (error) {
      console.log(`❌ Record retrieval failed: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log('Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Step 3: List all records to see structure
    console.log('\n📋 Step 3: Listing records...');
    try {
      const listResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          params: {
            limit: 3
          }
        }
      );
      console.log('✅ Records listed');
      console.log('Response structure:', Object.keys(listResponse.data));
      if (listResponse.data.list && listResponse.data.list.length > 0) {
        console.log('First record structure:', Object.keys(listResponse.data.list[0]));
      }
    } catch (error) {
      console.log(`❌ List failed: ${error.response?.status || error.message}`);
      if (error.response?.data) {
        console.log('Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Step 4: Try different API endpoints
    console.log('\n🔌 Step 4: Testing different API endpoints...');

    const endpoints = [
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
      `${NC_URL}/api/v1/tables/${NOCODB_TABLE_ID}/records`,
      `${NC_URL}/api/v2/meta/tables/${NOCODB_TABLE_ID}`,
      `${NC_URL}/api/v1/meta/tables/${NOCODB_TABLE_ID}`,
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await client.get(endpoint);
        console.log(`✅ ${endpoint}: ${response.status}`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
      }
    }

  } catch (error) {
    console.error('\n💥 Inspection failed:', error.message);
    if (axios.isAxiosError(error)) {
      console.log('Response status:', error.response?.status);
      console.log('Response data:', error.response?.data);
    }
  }
}

inspectNocoDBStructure();
