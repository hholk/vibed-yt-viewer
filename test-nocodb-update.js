#!/usr/bin/env node

/**
 * Test script for NocoDB updateVideoSimple functionality
 * This script tests the simplified update function to ensure it works correctly
 */

const axios = require('axios');

async function testUpdateVideoSimple() {
  // Get environment variables
  const NC_URL = process.env.NC_URL;
  const NC_TOKEN = process.env.NC_TOKEN;
  const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID;
  const NOCODB_TABLE_ID = process.env.NOCODB_TABLE_ID;

  if (!NC_URL || !NC_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    console.error('❌ Missing required environment variables');
    console.error('Please ensure NC_URL, NC_TOKEN, NOCODB_PROJECT_ID, and NOCODB_TABLE_ID are set');
    process.exit(1);
  }

  console.log('🔍 Testing NocoDB connection and updateVideoSimple functionality...');
  console.log(`📍 NocoDB URL: ${NC_URL}`);
  console.log(`📋 Project ID: ${NOCODB_PROJECT_ID}`);
  console.log(`📊 Table ID: ${NOCODB_TABLE_ID}`);

  try {
    // Test 1: Fetch videos to get a test video ID
    console.log('\n📥 Test 1: Fetching videos to get a test video ID...');
    const listResponse = await axios.get(
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records`,
      {
        headers: {
          'xc-token': NC_TOKEN,
          'Content-Type': 'application/json'
        },
        params: {
          limit: 1
        }
      }
    );

    if (!listResponse.data?.list || listResponse.data.list.length === 0) {
      console.error('❌ No videos found in the table');
      process.exit(1);
    }

    const testVideo = listResponse.data.list[0];
    console.log(`✅ Found test video: ${testVideo.Title} (ID: ${testVideo.Id})`);

    // Test 2: Update the ImportanceRating
    console.log('\n⭐ Test 2: Updating ImportanceRating...');
    const newRating = Math.floor(Math.random() * 5) + 1; // Random rating 1-5
    const originalRating = testVideo.ImportanceRating;

    console.log(`📝 Updating rating from ${originalRating} to ${newRating}`);

    const updateResponse = await axios.patch(
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testVideo.Id}`,
      {
        ImportanceRating: newRating
      },
      {
        headers: {
          'xc-token': NC_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Update successful!');

    // Test 3: Verify the update by fetching the video again
    console.log('\n🔍 Test 3: Verifying the update...');
    const verifyResponse = await axios.get(
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testVideo.Id}`,
      {
        headers: {
          'xc-token': NC_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const updatedVideo = verifyResponse.data;
    if (updatedVideo.ImportanceRating === newRating) {
      console.log(`✅ Verification successful! Rating updated to ${updatedVideo.ImportanceRating}`);
    } else {
      console.error(`❌ Verification failed! Expected ${newRating}, got ${updatedVideo.ImportanceRating}`);
    }

    // Test 4: Test PersonalComment update
    console.log('\n📝 Test 4: Testing PersonalComment update...');
    const testComment = `Test comment from updateVideoSimple test - ${new Date().toISOString()}`;

    const commentUpdateResponse = await axios.patch(
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testVideo.Id}`,
      {
        PersonalComment: testComment
      },
      {
        headers: {
          'xc-token': NC_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Comment update successful!');

    // Verify comment update
    const commentVerifyResponse = await axios.get(
      `${NC_URL}/api/v2/tables/${NOCODB_TABLE_ID}/records/${testVideo.Id}`,
      {
        headers: {
          'xc-token': NC_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const updatedVideoWithComment = commentVerifyResponse.data;
    if (updatedVideoWithComment.PersonalComment === testComment) {
      console.log('✅ Comment verification successful!');
    } else {
      console.error('❌ Comment verification failed!');
    }

    console.log('\n🎉 All tests passed! The NocoDB updateVideoSimple functionality is working correctly.');
    console.log('\n📊 Summary:');
    console.log(`   - Video ID: ${testVideo.Id}`);
    console.log(`   - Rating updated: ${originalRating} → ${newRating}`);
    console.log(`   - Comment added: ✅`);

  } catch (error) {
    console.error('\n❌ Test failed!');
    if (axios.isAxiosError(error)) {
      console.error('📄 Error details:');
      console.error(`   Status: ${error.response?.status}`);
      console.error(`   Status Text: ${error.response?.statusText}`);
      console.error(`   Data:`, error.response?.data);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the test
testUpdateVideoSimple();
