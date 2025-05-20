import axios from 'axios';
import { z } from 'zod';
// videoSchema is needed for the data type, fetchVideoByVideoId is for re-fetching
import { videoSchema, fetchVideoByVideoId } from '@/lib/nocodb'; 

// Import and re-export types for backward compatibility (if these are used elsewhere)
import type { Video, VideoListItem, PageInfo, NocoDBResponse } from '@/lib/nocodb';
export type { Video, VideoListItem, PageInfo, NocoDBResponse };

// Define the payload type for updates, derived from videoSchema
export type VideoUpdatePayload = Partial<z.infer<typeof videoSchema>>;

// In-memory cache for record IDs to reduce API calls
const recordIdCache = new Map<string, number>();

/**
 * Gets the internal record ID for a given VideoID.
 * Uses NocoDB v2 API for GET, as it was previously implemented and seems to work for ID retrieval.
 * This function might be called from client or server contexts, so uses NEXT_PUBLIC_ tokens.
 * 
 * @param videoId - The VideoID to look up
 * @param ncProjectIdParam - Optional override for NocoDB project ID (used for v2 GET)
 * @param ncTableNameParam - Optional override for NocoDB table name
 * @returns The internal record ID
 * @throws Error if the lookup fails
 */
async function getRecordIdByVideoId(
  videoId: string,
  ncProjectIdParam?: string, // Kept for potential direct calls, but resolved internally
  ncTableNameParam?: string  // Kept for potential direct calls, but resolved internally
): Promise<number> {
  if (recordIdCache.has(videoId)) {
    console.log(`[getRecordIdByVideoId - ${videoId}] Cache hit for record ID.`);
    return recordIdCache.get(videoId)!;
  }
  console.log(`[getRecordIdByVideoId - ${videoId}] Cache miss. Fetching record ID from NocoDB using V1 API.`);

  const currentNcUrl = process.env.NC_URL;
  const serverToken = process.env.NC_TOKEN;
  // Resolve project ID and table name using server-side environment variables primarily
  const tableName = ncTableNameParam || process.env.NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = ncProjectIdParam || process.env.NOCODB_PROJECT_ID || process.env.NC_PROJECT_ID || 'phk8vxq6f1ev08h';

  if (!currentNcUrl) {
    throw new Error('NocoDB URL (NC_URL) is not configured. Check server environment variables.');
  }
  if (!serverToken) {
    // For V1 API, token is usually mandatory for write operations, but might be for reads too depending on NocoDB setup.
    // Let's assume it's needed for consistency with other server-side calls.
    throw new Error('NocoDB server token (NC_TOKEN) is not configured. Check server environment variables.');
  }
  if (!projectId || !tableName) {
    throw new Error('NocoDB Project ID (NOCODB_PROJECT_ID or NC_PROJECT_ID) or Table Name (NOCODB_TABLE_NAME) is not configured.');
  }

  try {
    // Create a new Axios instance for this specific call to manage headers correctly for V1
    const client = axios.create({
      baseURL: currentNcUrl,
      headers: {
        'Content-Type': 'application/json',
        'xc-token': serverToken, // V1 API typically expects token directly in headers
      },
    });

    const response = await client.get(
      `/api/v1/db/data/noco/${projectId}/${tableName}/find-one`,
      {
        params: {
          where: `(VideoID,eq,${videoId})`,
          fields: 'Id', // Only fetch the internal NocoDB ID
        },
      }
    );

    if (!response.data || Object.keys(response.data).length === 0 || typeof response.data.Id !== 'number') {
      console.warn(`[getRecordIdByVideoId - ${videoId}] No record found with VideoID, or ID is invalid. NocoDB Response:`, response.data);
      throw new Error(`No record found with VideoID: ${videoId}, or ID is invalid.`);
    }

    const recordId = response.data.Id;
    // No need to check typeof recordId again, as it's part of the initial check.

    recordIdCache.set(videoId, recordId);
    console.log(`[getRecordIdByVideoId - ${videoId}] Successfully fetched and cached record ID: ${recordId}`);
    return recordId;
  } catch (error: unknown) {
    recordIdCache.delete(videoId);
    let errorMessage = 'Unknown error';
    if (axios.isAxiosError(error)) {
      errorMessage = JSON.stringify(error.response?.data) || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`[getRecordIdByVideoId - ${videoId}] Error:`, errorMessage);
    throw new Error(`Failed to get record ID for VideoID ${videoId}: ${ (error instanceof Error) ? error.message : 'Unknown cause'}`);
  }
}

/**
 * Updates a video record in NocoDB using its YouTube VideoID.
 * This function is intended for server-side use as it utilizes NC_TOKEN for PATCH.
 * It uses NocoDB v1 API for PATCH and then re-fetches using fetchVideoByVideoId (from nocodb.ts).
 * 
 * @param videoId - The YouTube VideoID (string).
 * @param data - Partial video object containing fields to update (e.g., { PersonalComment: "text" }, { DetailedNarrativeFlow: null }).
 * @returns The updated and validated video record.
 * @throws Error if the update fails or response validation fails.
 */
export async function updateVideoDetails(
  videoId: string, // Expects string VideoID for reliable operation with getRecordIdByVideoId and fetchVideoByVideoId
  data: VideoUpdatePayload
): Promise<Video> {
  const currentNcUrl = process.env.NC_URL; 
  const serverNcToken = process.env.NC_TOKEN; 
  // Use NOCODB_PROJECT_ID first, then NC_PROJECT_ID as a fallback, then default
  const projectId = process.env.NOCODB_PROJECT_ID || process.env.NC_PROJECT_ID || 'phk8vxq6f1ev08h'; 
  const tableName = process.env.NOCODB_TABLE_NAME || 'youtubeTranscripts';

  if (!currentNcUrl || !serverNcToken) {
    throw new Error('NocoDB URL (NC_URL) or server token (NC_TOKEN) is not configured. Please check server environment variables.');
  }
  if (!projectId || !tableName) {
    throw new Error('NocoDB Project ID (NOCODB_PROJECT_ID or NC_PROJECT_ID) or Table Name (NOCODB_TABLE_NAME) is not configured. Please check server environment variables.');
  }

  let recordId: number;
  try {
    // Use the locally defined getRecordIdByVideoId which uses NOCODB_PROJECT_ID (or NC_PROJECT_ID) from server environment variables if not overridden
    recordId = await getRecordIdByVideoId(videoId, projectId, tableName);
  } catch (error) {
    console.error(`[updateVideoDetails] Failed to get record ID for VideoID ${videoId}:`, error);
    throw error; 
  }
  
  console.log(`[updateVideoDetails] Updating record. VideoID: ${videoId}, NocoDB RecordID: ${recordId}, Data:`, JSON.stringify(data, null, 2));

  try {
    const client = axios.create({
      baseURL: currentNcUrl,
      headers: {
        'Content-Type': 'application/json',
        'xc-token': serverNcToken, 
      },
    });

    const patchUrl = `/api/v1/db/data/v1/${projectId}/${tableName}/${recordId}`;
    
    const response = await client.patch(patchUrl, data);

    if (response.status !== 200) {
      console.error(`[updateVideoDetails] NocoDB PATCH request failed. Status: ${response.status}, Data:`, response.data);
      throw new Error(`NocoDB PATCH request failed with status ${response.status}`);
    }

    console.log(`[updateVideoDetails] PATCH successful for VideoID ${videoId}. NocoDB Response:`, response.data);

    // Clear caches
    recordIdCache.delete(videoId);
    
    // Fallback to re-fetching the full record if the PATCH response doesn't contain it
    console.log(`[updateVideoDetails] Re-fetching updated video data for VideoID ${videoId}.`);
    const updatedVideo = await fetchVideoByVideoId(videoId, undefined, true);

    if (!updatedVideo) {
      console.error(`[updateVideoDetails] Failed to re-fetch video data for VideoID ${videoId} after update.`);
      // Instead of throwing an error, return the best available data
      if (response.data) {
        console.log(`[updateVideoDetails] Returning partial update data for VideoID ${videoId}.`);
        return { ...response.data, VideoID: videoId } as Video;
      }
      throw new Error(`Failed to re-fetch video data for VideoID ${videoId} after update.`);
    }
    
    console.log(`[updateVideoDetails] Successfully updated and re-fetched video for VideoID ${videoId}.`);
    return updatedVideo;

  } catch (error: unknown) {
    let errorMessage = 'Unknown error';
    if (axios.isAxiosError(error)) {
      errorMessage = JSON.stringify(error.response?.data) || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error(`[updateVideoDetails] Error updating video record for VideoID ${videoId} (RecordID: ${recordId}):`, errorMessage);
    recordIdCache.delete(videoId);
    throw new Error(`Failed to update video (VideoID: ${videoId}): ${ (error instanceof Error) ? error.message : 'Unknown cause'}`);
  }
}


