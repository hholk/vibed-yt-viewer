import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const field = searchParams.get('field');

  if (!field) {
    return NextResponse.json({ error: 'Field parameter is required' }, { status: 400 });
  }

  const ncUrl = process.env.NC_URL;
  const ncToken = process.env.NC_TOKEN;
  const tableName = process.env.NOCODB_TABLE_NAME || 'youtubeTranscripts';
  const projectId = process.env.NOCODB_PROJECT_ID || process.env.NC_PROJECT_ID || 'phk8vxq6f1ev08h';
  const orgId = process.env.NOCODB_ORG_ID || 'noco';

  if (!ncUrl || !ncToken) {
    console.error('[API] NocoDB credentials not configured');
    return NextResponse.json({ error: 'NocoDB configuration error' }, { status: 500 });
  }

  const axiosInstance = axios.create({
    baseURL: ncUrl,
    headers: {
      'xc-token': ncToken,
    },
  });

  // Try both possible endpoint patterns
  const endpoint1 = `/api/v1/db/data/${orgId}/${projectId}/${tableName}/groupby`;
  const endpoint2 = `/api/v1/db/data/noco/${projectId}/${tableName}/groupby`;

  async function processResponse(response: any) {
    console.log(`[API] Raw response data for ${field}:`, JSON.stringify(response.data));
    
    // Handle different response formats
    let data = response.data;
    
    // If response.data is a string, try parsing it as JSON
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.log('[API] Response data is string but not JSON:', data);
      }
    }

    // If data is not an array, check if it's an object with list/rows property
    if (!Array.isArray(data)) {
      if (data?.list) {
        data = data.list;
      } else if (data?.rows) {
        data = data.rows;
      } else {
        console.error('[API] Unexpected response format:', data);
        throw new Error('Unexpected response format');
      }
    }

    // Extract values, handling different item formats
    const values = data.reduce((acc: string[], item: any) => {
      let value = item[field];
      
      // Handle null/undefined
      if (value === null || value === undefined || value === '') {
        return acc;
      }

      // Handle array values (like ["value"])
      if (Array.isArray(value)) {
        value = value[0];
      }

      // Handle object values (like { value: "something" })
      if (typeof value === 'object' && value !== null) {
        if ('value' in value) {
          value = (value as { value: string }).value;
        } else {
          const objValues = Object.values(value);
          value = objValues.length > 0 ? objValues[0] : null;
        }
      }

      if (value !== null && value !== undefined && value !== '') {
        acc.push(String(value));
      }
      return acc;
    }, []);

    console.log(`[API] Processed values for ${field}:`, values);
    return Array.from(new Set(values));
  }

  try {
    // Try first endpoint pattern
    try {
      const response = await axiosInstance.get(endpoint1, {
        params: { column_name: field },
      });
      const values = await processResponse(response);
      return NextResponse.json(values);
    } catch (error1: any) {
      console.log(`[API] First endpoint failed:`, error1.message);
      // If first endpoint fails, try second endpoint pattern
      const response = await axiosInstance.get(endpoint2, {
        params: { column_name: field },
      });
      const values = await processResponse(response);
      return NextResponse.json(values);
    }
  } catch (error: any) {
    console.error('[API] Error fetching distinct values:', error.message);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch distinct values' },
      { status: error.response?.status || 500 }
    );
  }
}
