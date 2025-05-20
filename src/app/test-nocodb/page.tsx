import { fetchVideos, type VideoListItem } from '@/lib/nocodb';
import Link from 'next/link';

// Define the expected structure of the result from getData
interface GetDataResult {
  data?: VideoListItem[];
  message?: string;
  error?: string;
  stack?: string;
}

async function getData(): Promise<GetDataResult> {
  console.log("Attempting to fetch videos for test page...");
  try {
    // fetchVideos returns an object like { list: VideoListItem[], pageInfo: ... }
    const response = await fetchVideos(); 
    console.log("Successfully fetched videos:", response);
    if (!response || !response.videos) {
        console.warn("fetchVideos response or response.videos is undefined.");
        return { error: "Failed to fetch videos: Invalid response structure."};
    }
    if (response.videos.length === 0) {
      console.log("fetchVideos returned an empty array. This might be expected if your table is empty, or it could indicate an issue if you expect data.");
      return { data: response.videos, message: "Fetched successfully, but no videos found in the table." };
    }
    return { data: response.videos };
  } catch (error) {
    console.error("Error fetching videos for test page:", error);
    if (error instanceof Error) {
      return { error: error.message, stack: error.stack };
    }
    return { error: 'Unknown error occurred during fetchVideos call.' };
  }
}

export default async function TestNocoDBPage() {
  const result = await getData();

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <Link href="/" style={{ marginBottom: '20px', display: 'block' }}>Back to Home</Link>
      <h1>NocoDB Connection Test</h1>
      {result.error ? (
        <>
          <h2>Error Fetching NocoDB Data</h2>
          <pre style={{ color: 'red', backgroundColor: '#fdd', padding: '10px', borderRadius: '5px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <strong>Message:</strong> {result.error}
            {result.stack && (<>{'\n\n'}<strong>Stack:</strong> {result.stack}</>)}
          </pre>
          <p>
            <strong>Troubleshooting Tips:</strong>
            <ul>
              <li>Ensure your NocoDB instance is running at the URL specified in your server environment (e.g., <code>NC_URL</code>).</li>
              <li>Verify the <code>NC_TOKEN</code> in your server environment is correct and has read permissions.</li>
              <li>Check that the table name (e.g., <code>NOCODB_TABLE_NAME</code>) in your server environment exists in your NocoDB project.</li>
              <li>Confirm your Next.js development server was restarted if environment variables changed.</li>
              <li>Look at the terminal console where you ran <code>npm run dev</code> for more detailed error logs from the <code>fetchVideos</code> function.</li>
            </ul>
          </p>
        </>
      ) : (
        <>
          <h2>Successfully Connected and Fetched Data</h2>
          {result.message && <p><strong>Note:</strong> {result.message}</p>}
          <p>Number of videos fetched: {result.data?.length ?? 0}</p>
          <h3>Raw Data:</h3>
          <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
