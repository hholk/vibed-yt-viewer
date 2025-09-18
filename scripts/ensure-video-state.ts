import { config as loadEnv } from 'dotenv';
import { argv, exit } from 'node:process';

// Load .env.local first (overrides handled explicitly), then fall back to .env.
loadEnv({ path: '.env.local', override: false });
loadEnv();

import {
  fetchVideoByVideoId,
  updateVideo,
} from '../src/features/videos/api/nocodb';

const targetVideoId = argv[2] ?? 'ziLmtuLm-LU';
const desiredRating = Number(argv[3] ?? 5);
const desiredComment = argv[4] ?? 'test';
const maxAttempts = Number(argv[5] ?? 5);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureVideoState() {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const video = await fetchVideoByVideoId(targetVideoId);

    if (!video) {
      console.error(`Attempt ${attempt}: Video ${targetVideoId} not found.`);
      await sleep(1000);
      continue;
    }

    const { Id: numericId, VideoID } = video;
    const commentMatches = (video.PersonalComment ?? '') === desiredComment;
    const ratingMatches = (video.ImportanceRating ?? null) === desiredRating;

    if (commentMatches && ratingMatches) {
      console.log(`Success after ${attempt} attempt(s):`);
      console.log(`  ImportanceRating = ${video.ImportanceRating}`);
      console.log(`  PersonalComment  = ${video.PersonalComment}`);
      return;
    }

    const identifier = typeof numericId === 'number' ? numericId : VideoID ?? targetVideoId;

    console.log(`Attempt ${attempt}: updating video ${targetVideoId} (identifier=${identifier})`);

    await updateVideo(identifier, {
      ImportanceRating: desiredRating,
      PersonalComment: desiredComment,
    });

    await sleep(1500);
  }

  console.error(`Failed to enforce desired state after ${maxAttempts} attempts.`);
  exit(1);
}

ensureVideoState().catch((error) => {
  console.error('Unexpected failure while ensuring video state:', error);
  exit(1);
});
