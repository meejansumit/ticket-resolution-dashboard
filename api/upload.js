const { put } = require('@vercel/blob');

const config = {
  api: {
    bodyParser: false, // Disable body parser to read raw request stream directly
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN environment variable not set on server' });
  }

  try {
    // Read the raw request stream
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const dataBuffer = Buffer.concat(buffers);
    const jsonText = dataBuffer.toString('utf-8');

    // Parse and validate that the payload is valid JSON and has required dashboard properties
    let parsedData;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (e) {
      return res.status(400).json({ error: 'ไฟล์ที่อัปโหลดไม่ใช่รูปแบบ JSON ที่ถูกต้อง' });
    }

    if (!parsedData.months || !parsedData.sheetOrder) {
      return res.status(400).json({ error: 'โครงสร้างไฟล์ JSON ไม่ถูกต้อง (ต้องประกอบด้วยคีย์ months และ sheetOrder)' });
    }

    console.log('JSON structure verified. Uploading to Vercel Blob...');

    // Upload JSON directly to Vercel Blob
    const blob = await put('all_months.json', jsonText, {
      access: 'public',
      contentType: 'application/json',
      token
    });

    console.log(`Successfully uploaded to Vercel Blob: ${blob.url}`);

    return res.status(200).json({
      success: true,
      message: 'Dashboard updated successfully!',
      url: blob.url
    });
  } catch (error) {
    console.error('Error handling JSON upload:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}

module.exports = handler;
module.exports.config = config;
