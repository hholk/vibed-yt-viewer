// File: /home/coder/yt-viewer/src/app/api/nocodb/video/[videoId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

const NOCODB_URL = process.env.NOCODB_URL;
const NOCODB_AUTH_TOKEN = process.env.NOCODB_AUTH_TOKEN;
const NOCODB_PROJECT_ID = process.env.NOCODB_PROJECT_ID || process.env.NC_PROJECT_ID;
// Prefer the more specific Table ID from memory if NC_TABLE_NAME is general
const NOCODB_TABLE_ID = 'm1lyoeqptp7fq5z'; // from memory: Table ID: m1lyoeqptp7fq5z

interface NocoDBRecord {
  Id: number;
  VideoID: string;
  // Add other fields if necessary, but Id and VideoID are key here
}

interface NocoDBListResponse {
  list: NocoDBRecord[];
  pageInfo: {
    totalRows: number;
    page: number;
    pageSize: number;
    isFirstPage: boolean;
    isLastPage: boolean;
  };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  const youtubeVideoId = params.videoId;

  if (!NOCODB_URL || !NOCODB_AUTH_TOKEN || !NOCODB_PROJECT_ID || !NOCODB_TABLE_ID) {
    return NextResponse.json({ error: 'NocoDB environment variables are not configured' }, { status: 500 });
  }

  if (!youtubeVideoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  try {
    // 1. Find the NocoDB record Id using the youtubeVideoId
    const findUrl = `${NOCODB_URL}/api/v1/db/data/noco/${NOCODB_PROJECT_ID}/${NOCODB_TABLE_ID}/records?where=(VideoID,eq,${youtubeVideoId})`;
    
    const findResponse = await fetch(findUrl, {
      method: 'GET',
      headers: {
        'xc-token': NOCODB_AUTH_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!findResponse.ok) {
      const errorData = await findResponse.text();
      console.error('NocoDB find error:', findResponse.status, errorData);
      return NextResponse.json({ error: `Failed to find video in NocoDB: ${findResponse.statusText} - ${errorData}` }, { status: findResponse.status });
    }

    const findResult: NocoDBListResponse = await findResponse.json();

    if (!findResult.list || findResult.list.length === 0) {
      return NextResponse.json({ error: 'Video not found in NocoDB' }, { status: 404 });
    }

    if (findResult.list.length > 1) {
      console.warn(`Multiple records found for VideoID ${youtubeVideoId}. Deleting the first one.`);
    }
    
    const nocoDbRowId = findResult.list[0].Id;

    // 2. Delete the record using its NocoDB Id
    // NocoDB API for deleting records (plural) often takes IDs in the body.
    const deleteUrl = `${NOCODB_URL}/api/v1/db/data/noco/${NOCODB_PROJECT_ID}/${NOCODB_TABLE_ID}/records`;
    
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'xc-token': NOCODB_AUTH_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ Ids: [nocoDbRowId] }), // NocoDB expects an array of Ids
    });

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.text(); 
      console.error('NocoDB delete error:', deleteResponse.status, errorData);
      return NextResponse.json({ error: `Failed to delete video from NocoDB: ${deleteResponse.statusText} - ${errorData}` }, { status: deleteResponse.status });
    }
    
    return NextResponse.json({ message: 'Video deleted successfully', deletedNocoDBId: nocoDbRowId }, { status: 200 });

  } catch (error) {
    console.error('Error processing DELETE request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

// Placeholder for GET and PUT if you need to implement them later based on memory
// export async function GET(request: NextRequest, { params }: { params: { videoId: string } }) {
//   // ... implementation ...
//   return NextResponse.json({ message: `GET video ${params.videoId} - Not implemented` });
// }

// export async function PUT(request: NextRequest, { params }: { params: { videoId: string } }) {
//   // ... implementation ...
//   return NextResponse.json({ message: `PUT video ${params.videoId} - Not implemented` });
// }
