"use server";

import { updateVideoDetails, type VideoUpdatePayload } from './video-service';
import type { Video } from './nocodb';

export async function handleUpdateVideoDetailsAction(
  videoId: string,
  payload: VideoUpdatePayload
): Promise<Video | null> {
  // This function is a Server Action. 
  // It calls updateVideoDetails, which now correctly uses server-side environment variables.
  console.log(`[Server Action - handleUpdateVideoDetailsAction] Called for VideoID: ${videoId}`);
  try {
    const result = await updateVideoDetails(videoId, payload);
    console.log(`[Server Action - handleUpdateVideoDetailsAction] Successfully updated VideoID: ${videoId}`);
    return result;
  } catch (error) {
    console.error(`[Server Action - handleUpdateVideoDetailsAction] Error for VideoID: ${videoId}:`, error);
    // Re-throw the error or return a specific error structure if needed by the client
    if (error instanceof Error) {
      // It's often better to throw a more generic error or a custom error type
      // to avoid leaking too much server-side detail to the client.
      // For now, re-throwing a new error with the message is a common pattern.
      throw new Error(`Server Action failed to update video: ${error.message}`);
    }
    throw new Error('An unknown error occurred while updating video details via server action.');
  }
}
