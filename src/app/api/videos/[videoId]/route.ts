import { NextRequest, NextResponse } from 'next/server';
import { updateVideo, deleteVideo } from '@/features/videos/api/nocodb';
import { z } from 'zod';

const linkedRecordItemSchema = z
  .object({
    Id: z.union([z.number().int(), z.string()]).optional(),
    Title: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
  })
  .passthrough();

export const videoUpdateSchema = z
  .object({
    ImportanceRating: z.number().int().min(1).max(5).optional().nullable(),
    PersonalComment: z.string().optional().nullable(),
    Watched: z.boolean().optional().nullable(),
    Notes: z.string().optional().nullable(),
    Tags: z.array(linkedRecordItemSchema).optional().nullable(),
    Categories: z.array(linkedRecordItemSchema).optional().nullable(),
    CompletionDate: z.coerce.date().optional().nullable(),
    ActionableAdvice: z.string().optional().nullable(),
    TLDR: z.string().optional().nullable(),
    MainSummary: z.string().optional().nullable(),
    DetailedNarrativeFlow: z.string().optional().nullable(),
    MemorableQuotes: z.array(z.string()).optional().nullable(),
    MemorableTakeaways: z.array(z.string()).optional().nullable(),
    KeyExamples: z.array(z.string()).optional().nullable(),
    BookMediaRecommendations: z.array(z.string()).optional().nullable(),
    RelatedURLs: z.array(z.string().url()).optional().nullable(),
    TopicsDiscussed: z.array(z.string()).optional().nullable(),
    Priority: z.string().optional().nullable(),
    Status: z.string().optional().nullable(),
    Hashtags: z.array(z.string()).optional().nullable(),
  })
  .strict();

/**
 * API handlers in Next.js are simple async functions. We keep the logic tiny here
 * and delegate the heavy lifting to the NocoDB service layer so beginners can
 * trace the flow easily: validate input → call the service → return JSON.
 */

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, data } = body;

    if (!videoId) {
      return NextResponse.json(
        {
          error: 'Missing required field: videoId',
          success: false,
        },
        { status: 400 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          error: 'Missing required field: data',
          success: false,
        },
        { status: 400 },
      );
    }

    const validationResult = videoUpdateSchema.safeParse(data);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid update data',
          success: false,
          details: validationResult.error.errors,
        },
        { status: 400 },
      );
    }

    const updatedVideo = await updateVideo(videoId, validationResult.data);

    return NextResponse.json({
      success: true,
      video: updatedVideo,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update video',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json(
        {
          error: 'Missing required field: videoId',
          success: false
        },
        { status: 400 }
      );
    }

    await deleteVideo(videoId);

    return NextResponse.json({
      success: true,
      message: 'Video deleted successfully'
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to delete video',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
