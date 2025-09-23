import { NextRequest, NextResponse } from 'next/server';
import { fetchAllVideos, videoListItemSchema, type VideoListItem } from "@/features/videos/api/nocodb";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const categories = searchParams.get('categories')?.split(',').filter(Boolean) || [];
    const limit = parseInt(searchParams.get('limit') || '35');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || '-CreatedAt';

    console.log('🔍 Search API request:', { query, categories, limit, offset, sort });

    if (!query.trim()) {
      return NextResponse.json({
        videos: [],
        total: 0,
        success: true,
        query: '',
        categories: []
      });
    }

    // Define searchable fields by category
    const searchableFields: Record<string, string[]> = {
      title: ['Title'],
      description: ['Description'],
      channel: ['Channel'],
      speaker: ['Speaker'],
      genre: ['VideoGenre'],
      topic: ['MainTopic'],
      hashtag: ['Hashtags'],
      person: ['Persons'],
      company: ['Companies'],
      indicator: ['Indicators'],
      trend: ['Trends'],
      asset: ['InvestableAssets'],
      institution: ['Institutions'],
      event: ['EventsFairs'],
      doi: ['DOIs'],
      source: ['PrimarySources'],
      technical: ['TechnicalTerms'],
      ticker: ['TickerSymbol'],
    };

    // Get all videos from the database
    const allVideos = await fetchAllVideos({
      fields: [
        'Id',
        'rowId',
        'Title',
        'ThumbHigh',
        'Channel',
        'Description',
        'VideoGenre',
        'VideoID',
        'Persons',
        'Companies',
        'Indicators',
        'Trends',
        'InvestableAssets',
        'TickerSymbol',
        'Institutions',
        'EventsFairs',
        'DOIs',
        'Hashtags',
        'MainTopic',
        'PrimarySources',
        'Sentiment',
        'SentimentReason',
        'TechnicalTerms',
        'Speaker',
        'CreatedAt',
      ],
      schema: videoListItemSchema,
    });

    console.log(`📊 Loaded ${allVideos.length} videos from database for search`);

    // Build search terms from query
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);

    // Filter videos based on search terms and categories
    const matchingVideos = allVideos.filter((video) => {
      // If no categories specified, search all fields
      const fieldsToSearch = categories.length > 0
        ? categories.flatMap(category => searchableFields[category] || [])
        : Object.values(searchableFields).flat();

      // Remove duplicates
      const uniqueFields = Array.from(new Set(fieldsToSearch));

      return searchTerms.every(term =>
        uniqueFields.some(field => {
          const value = video[field as keyof VideoListItem];
          if (value === null || value === undefined) return false;

          // Handle arrays (linked records, tags, etc.)
          if (Array.isArray(value)) {
            return value.some(item => {
              if (typeof item === 'string') {
                return item.toLowerCase().includes(term);
              }
              if (typeof item === 'object' && item !== null) {
                const title = item.Title || item.name;
                if (typeof title === 'string') {
                  return title.toLowerCase().includes(term);
                }
              }
              return false;
            });
          }

          // Handle strings
          if (typeof value === 'string') {
            return value.toLowerCase().includes(term);
          }

          // Handle numbers
          if (typeof value === 'number') {
            return value.toString().includes(term);
          }

          return false;
        })
      );
    });

    // Sort and limit results
    const sortedVideos = matchingVideos.sort((a, b) => {
      if (sort === '-CreatedAt') {
        return new Date(b.CreatedAt || 0).getTime() - new Date(a.CreatedAt || 0).getTime();
      }
      if (sort === 'CreatedAt') {
        return new Date(a.CreatedAt || 0).getTime() - new Date(b.CreatedAt || 0).getTime();
      }
      if (sort === 'Title') {
        return (a.Title || '').localeCompare(b.Title || '');
      }
      if (sort === '-Title') {
        return (b.Title || '').localeCompare(a.Title || '');
      }
      return 0;
    });

    const paginatedVideos = sortedVideos.slice(offset, offset + limit);

    console.log(`🎯 Search results: ${paginatedVideos.length} videos found for query "${query}" (offset: ${offset}, limit: ${limit})`);

    return NextResponse.json({
      videos: paginatedVideos,
      total: matchingVideos.length,
      success: true,
      query,
      categories,
      availableCategories: Object.keys(searchableFields)
    });

  } catch (error) {
    console.error('💥 Search API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to search videos',
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
