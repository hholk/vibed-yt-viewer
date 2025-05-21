// src/app/api/distinct-values/route.ts
import { NextResponse } from 'next/server';
// This will be the renamed, server-only function from nocodb.ts
import { _fetchDistinctValuesForFieldV2_SERVER_ONLY } from '@/lib/nocodb'; 

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fieldName = searchParams.get('field');

  if (!fieldName) {
    return NextResponse.json({ message: 'Field name query parameter is required' }, { status: 400 });
  }

  try {
    const distinctValues = await _fetchDistinctValuesForFieldV2_SERVER_ONLY(fieldName);
    return NextResponse.json(distinctValues);
  } catch (e) {
    // Log the raw error first
    console.error(`[API Route /api/distinct-values] Raw error for ${fieldName}:`, e);

    let errorMessage = 'An unknown error occurred while fetching distinct values from NocoDB API v2.';
    let errorDetail: string | undefined = undefined;
    let statusCode = 500;

    if (e instanceof Error) {
      console.error(`[API Route /api/distinct-values] Error fetching distinct values for ${fieldName}:`, e.message, e.stack);
      errorMessage = e.message; // Use the actual error message
      errorDetail = e.message; // Keep original error message for detail

      // Specific error message checks
      if (e.message.includes("Table with ID") && e.message.includes("not found")) {
        errorMessage = `Configuration error: The NocoDB table specified for field '${fieldName}' could not be found. Please check server configuration.`;
      } else if (e.message.includes("NocoDB V2 API environment variables are not properly configured")) {
        errorMessage = "Server configuration error: NocoDB environment variables are missing or incorrect.";
      } else if (e.message.includes("NocoDB API V2 error with 'fields' parameter") || e.message.includes("field not found")) {
        errorMessage = `The field '${fieldName}' might not exist or is not queryable for distinct values. Please check the field name or NocoDB table structure.`;
        statusCode = 400;
      } else if (e.message.includes("NocoDB V2 API parsing error")) {
        errorMessage = `Error parsing data from NocoDB for field '${fieldName}'. The data structure might have changed.`;
      }
    } else {
      // Handle non-Error objects thrown
      errorDetail = String(e);
    }
    
    return NextResponse.json({ message: errorMessage, detail: errorDetail }, { status: statusCode });
  }
}
