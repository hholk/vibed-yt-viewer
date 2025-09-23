#!/usr/bin/env node

/**
 * Debug script for NocoDB updateVideo functionality
 * This script provides detailed debugging information for troubleshooting
 */

const axios = require('axios');

async function debugNocoDB() {
  // Get environment variables
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  console.log('🔧 NocoDB Debug Script');
  console.log('====================');
  console.log(`📍 URL: ${NC_URL || '❌ NOT SET'}`);
  console.log(`🔑 Token: ${NC_TOKEN ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`📋 Project ID: ${NOCODB_PROJECT_ID || '❌ NOT SET'}`);
  console.log(`📊 Table ID: ${NOCODB_TABLE_ID || '❌ NOT SET'}`);
  console.log('');

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing required environment variables');
    console.log('Please ensure all environment variables are set in your .env.local file');
    process.exit(1);
  }

  const client = axios.create({
    headers: {
      'xc-token': NC_TOKEN,
      'Content-Type': 'application/json'
    },
    timeout: 10000
  });

  try {
    // Test 1: Check basic connectivity
    console.log('🌐 Test 1: Basic connectivity...');
    try {
      await client.get(NC_URL);
      console.log('✅ Basic connectivity: OK');
    } catch (error) {
      console.log('❌ Basic connectivity: FAILED');
      if (axios.isAxiosError(error)) {
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.statusText}`);
      }
    }

    // Test 2: Check project access
    console.log('\n📁 Test 2: Project access...');
    try {
      const projectResponse = await client.get(
        `${NC_URL}/api/v2/meta/projects/${NOCODB_PROJECT_ID}`
      );
      console.log('✅ Project access: OK');
      console.log(`   Project Title: ${projectResponse.data?.title || 'Unknown'}`);
    } catch (error) {
      console.log('❌ Project access: FAILED');
      if (axios.isAxiosError(error)) {
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.statusText}`);
        if (error.response?.data) {
          console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    // Test 3: Check table access
    console.log('\n📊 Test 3: Table access...');
    try {
      const tableResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}`
      );
      console.log('✅ Table access: OK');
      console.log(`   Table Title: ${tableResponse.data?.title || 'Unknown'}`);
    } catch (error) {
      console.log('❌ Table access: FAILED');
      if (axios.isAxiosError(error)) {
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.statusText}`);
        if (error.response?.data) {
          console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    // Test 4: List records
    console.log('\n📋 Test 4: List records...');
    try {
      const recordsResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          params: {
            limit: 3,
            fields: 'Id,VideoID,Title,ImportanceRating,PersonalComment'
          }
        }
      );

      if (recordsResponse.data?.list && recordsResponse.data.list.length > 0) {
        console.log('✅ Records access: OK');
        console.log(`   Found ${recordsResponse.data.list.length} records`);
        console.log('\n📝 Sample records:');
        recordsResponse.data.list.forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.Title || 'Untitled'}`);
          console.log(`      ID: ${record.Id}`);
          console.log(`      VideoID: ${record.VideoID}`);
          console.log(`      Rating: ${record.ImportanceRating || 'N/A'}`);
          console.log(`      Comment: ${record.PersonalComment ? '✅ Has comment' : '❌ No comment'}`);
          console.log('');
        });
      } else {
        console.log('⚠️ Records access: OK but no records found');
      }
    } catch (error) {
      console.log('❌ Records access: FAILED');
      if (axios.isAxiosError(error)) {
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.statusText}`);
        if (error.response?.data) {
          console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    // Test 5: Test update endpoint with a sample record
    console.log('\n🔄 Test 5: Test update endpoint...');
    try {
      const recordsResponse = await client.get(
        `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
        {
          params: {
            limit: 1,
            fields: 'Id,VideoID,Title,ImportanceRating,PersonalComment'
          }
        }
      );

      if (recordsResponse.data?.list && recordsResponse.data.list.length > 0) {
        const testRecord = recordsResponse.data.list[0];
        console.log(`   Testing with record: ${testRecord.Title} (ID: ${testRecord.Id})`);
        console.log(`   Current rating: ${testRecord.ImportanceRating || 'null'}`);

        // Try to update the rating
        const testRating = testRecord.ImportanceRating === 5 ? 4 : 5;
        console.log(`   Attempting to update rating to: ${testRating}`);

        const updateResponse = await client.patch(
          `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testRecord.Id}`,
          {
            ImportanceRating: testRating
          }
        );

        console.log('✅ Update endpoint: OK');
        console.log(`   Response status: ${updateResponse.status}`);

        // Verify the update
        const verifyResponse = await client.get(
          `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testRecord.Id}`,
          {
            params: {
              fields: 'ImportanceRating'
            }
          }
        );

        if (verifyResponse.data.ImportanceRating === testRating) {
          console.log(`✅ Update verification: PASSED (rating is now ${testRating})`);
        } else {
          console.log(`⚠️ Update verification: WARNING (expected ${testRating}, got ${verifyResponse.data.ImportanceRating})`);
        }
      } else {
        console.log('   ⚠️ No records available for update test');
      }
    } catch (error) {
      console.log('❌ Update endpoint: FAILED');
      if (axios.isAxiosError(error)) {
        console.log(`   Status: ${error.response?.status}`);
        console.log(`   Message: ${error.response?.statusText}`);
        if (error.response?.data) {
          console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
        }
      }
    }

    console.log('\n🎯 Debug complete!');
    console.log('\n💡 Next steps:');
    console.log('1. If any tests failed, check your NocoDB configuration');
    console.log('2. Ensure your NocoDB instance is running and accessible');
    console.log('3. Verify that the table ID and project ID are correct');
    console.log('4. Check that your API token has the necessary permissions');

  } catch (error) {
    console.error('\n💥 Unexpected error during debug:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the debug script
debugNocoDB();
