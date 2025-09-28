import { NextRequest, NextResponse } from 'next/server';
import { fetchVideoByVideoId, type Video } from '@/features/videos/api/nocodb';

/**
 * Export video data as markdown
 */
export async function GET(request: NextRequest) {
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

    console.log('Export request for videoId:', videoId);

    const video = await fetchVideoByVideoId(videoId);

    if (!video) {
      return NextResponse.json(
        {
          error: 'Video not found',
          success: false
        },
        { status: 404 }
      );
    }

    console.log('Exporting video:', video.Title, 'with ID:', video.VideoID);

    // Generate markdown content
    const markdown = generateMarkdown(video);

    // Return as downloadable file
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${video.Title || 'video'}.md"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        error: 'Failed to export video',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateMarkdown(video: Video): string {
  try {
    const lines: string[] = [];

    // Header
    lines.push('# ' + (video.Title || 'Untitled Video'));
    lines.push('');

    // Basic info
    if (video.URL) {
      lines.push(`**URL:** [${video.URL}](${video.URL})`);
    }

    if (video.Channel) {
      lines.push(`**Channel:** ${video.Channel}`);
    }

    if (video.PublishedAt) {
      lines.push(`**Published:** ${new Date(video.PublishedAt).toLocaleString()}`);
    }

    if (video.VideoGenre) {
      lines.push(`**Genre:** ${video.VideoGenre}`);
    }

    lines.push('');

    // Importance Rating
    if (video.ImportanceRating) {
      lines.push(`## Importance Rating`);
      lines.push(`${'★'.repeat(video.ImportanceRating)}${'☆'.repeat(5 - video.ImportanceRating)} (${video.ImportanceRating}/5)`);
      lines.push('');
    }

    // Personal Note
    if (video.PersonalComment) {
      lines.push(`## Personal Note`);
      lines.push(video.PersonalComment);
      lines.push('');
    }

    // Content sections
    const contentSections = [
      { key: 'TLDR', title: 'TL;DR' },
      { key: 'MainSummary', title: 'Main Summary' },
      { key: 'KeyExamples', title: 'Key Examples' },
      { key: 'KeyNumbersData', title: 'Key Numbers & Data' },
      { key: 'ActionableAdvice', title: 'Actionable Advice' },
      { key: 'DetailedNarrativeFlow', title: 'Detailed Narrative Flow' },
      { key: 'MemorableQuotes', title: 'Memorable Quotes' },
      { key: 'MemorableTakeaways', title: 'Memorable Takeaways' },
      { key: 'BookMediaRecommendations', title: 'Book/Media Recommendations' },
      { key: 'Description', title: 'Description' },
      { key: 'Transcript', title: 'Transcript' }
    ];

    contentSections.forEach(({ key, title }) => {
      const value = video[key as keyof Video];
      if (value && typeof value === 'string' && value.trim()) {
        lines.push(`## ${title}`);
        lines.push(value);
        lines.push('');
      }
    });

    // Array fields
    const arrayFields = [
      { key: 'RelatedURLs', title: 'Related URLs' },
      { key: 'Persons', title: 'Persons' },
      { key: 'Companies', title: 'Companies' },
      { key: 'Indicators', title: 'Indicators' },
      { key: 'Trends', title: 'Trends' },
      { key: 'InvestableAssets', title: 'Investable Assets' },
      { key: 'TickerSymbol', title: 'Ticker Symbols' },
      { key: 'Institutions', title: 'Institutions' },
      { key: 'EventsFairs', title: 'Events/Fairs' },
      { key: 'DOIs', title: 'DOIs' },
      { key: 'Hashtags', title: 'Hashtags' },
      { key: 'PrimarySources', title: 'Primary Sources' },
      { key: 'TechnicalTerms', title: 'Technical Terms' }
    ];

    arrayFields.forEach(({ key, title }) => {
      const value = video[key as keyof Video];
      if (value && Array.isArray(value) && value.length > 0) {
        lines.push(`## ${title}`);
        value.forEach((item: unknown) => {
          if (typeof item === 'string') {
            if (item.startsWith('http')) {
              lines.push(`- [${item}](${item})`);
            } else {
              lines.push(`- ${item}`);
            }
          } else if (item && typeof item === 'object' && 'Title' in item && typeof (item as Record<string, unknown>).Title === 'string') {
            lines.push(`- ${(item as Record<string, unknown>).Title}`);
          }
        });
        lines.push('');
      }
    });

    // Sentiment
    if (video.Sentiment) {
      lines.push(`## Sentiment`);
      lines.push(`**Sentiment:** ${video.Sentiment}`);
      if (video.SentimentReason) {
        lines.push(`**Reason:** ${video.SentimentReason}`);
      }
      lines.push('');
    }

    // Speaker
    if (video.Speaker) {
      lines.push(`## Speaker`);
      lines.push(video.Speaker);
      lines.push('');
    }

    // Main Topic
    if (video.MainTopic) {
      lines.push(`## Main Topic`);
      lines.push(video.MainTopic);
      lines.push('');
    }

    // Metadata
    lines.push(`## Metadata`);
    lines.push(`**Video ID:** ${video.VideoID || 'N/A'}`);
    lines.push(`**Created:** ${video.CreatedAt ? new Date(video.CreatedAt).toLocaleString() : 'N/A'}`);
    lines.push(`**Last Updated:** ${video.UpdatedAt ? new Date(video.UpdatedAt).toLocaleString() : 'N/A'}`);

    return lines.join('\n');
  } catch (error) {
    console.error('Error generating markdown:', error);
    throw new Error('Failed to generate markdown content');
  }
}
