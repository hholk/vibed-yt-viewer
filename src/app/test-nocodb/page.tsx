
import { fetchVideos } from '@/lib/nocodb'; 
import Link from 'next/link';

async function getData() {
  console.log("Attempting to fetch videos for test page...");
  try {
    const videos = await fetchVideos();
    console.log("Successfully fetched videos:", videos);
    if (videos.length === 0) {
      console.log("fetchVideos returned an empty array. This might be expected if your table is empty, or it could indicate an issue if you expect data.");
      return { data: videos, message: "Fetched successfully, but no videos found in the table." };
    }
    return { data: videos };
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
          <div>
            <strong>Troubleshooting Tips:</strong>
            <ul>
              <li>Ensure your NocoDB instance is running at the URL specified in <code>NEXT_PUBLIC_NC_URL</code> (e.g., <code>http:</code>).</li>
              <li>Verify the <code>NEXT_PUBLIC_NC_TOKEN</code> in your <code>.env.local</code> file is correct and has read permissions for the table.</li>
              <li>Check that the table name (<code>NEXT_PUBLIC_NOCODB_TABLE_NAME</code> in <code>.env.local</code>, or default <code>youtubeTranscripts</code>) exists in your NocoDB project.</li>
              <li>Confirm your Next.js development server was restarted after creating/modifying <code>.env.local</code> and changing the port in <code>package.json</code>.</li>
              <li>Look at the terminal console where you ran <code>pnpm dev</code> for more detailed error logs from the <code>fetchVideos</code> function.</li>
            </ul>
          </div>
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
