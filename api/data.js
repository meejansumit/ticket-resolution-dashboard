import { list } from '@vercel/blob';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      const { blobs } = await list({ token });

      // Find the newest blob with pathname 'all_months.json'
      const matchingBlobs = blobs.filter(b => b.pathname === 'all_months.json');
      
      if (matchingBlobs.length > 0) {
        // Sort by uploadedAt descending to get the latest one
        matchingBlobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        const latestBlob = matchingBlobs[0];

        console.log(`Fetching latest JSON data from Vercel Blob: ${latestBlob.url}`);
        const response = await fetch(latestBlob.url);
        if (response.ok) {
          const data = await response.json();
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          return res.status(200).json(data);
        }
      }
    } catch (error) {
      console.error('Error fetching data from Vercel Blob:', error);
    }
  } else {
    console.warn('BLOB_READ_WRITE_TOKEN environment variable not set');
  }

  // Fallback: Read local all_months.json if available
  const localPaths = [
    path.join(process.cwd(), 'all_months.json'),
    path.join(__dirname, '..', 'all_months.json') // depending on env
  ];

  for (const lp of localPaths) {
    try {
      if (fs.existsSync(lp)) {
        console.log(`Fallback: Reading local data from ${lp}`);
        const localData = fs.readFileSync(lp, 'utf-8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(200).json(JSON.parse(localData));
      }
    } catch (e) {
      console.error(`Error reading local fallback file ${lp}:`, e);
    }
  }

  return res.status(404).json({ error: 'No data found' });
}
