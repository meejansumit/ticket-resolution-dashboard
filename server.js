const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Trigger fresh Vercel build to apply BLOB_READ_WRITE_TOKEN

// Support parsing text bodies containing JSON
app.use(express.text({ type: 'application/json', limit: '10mb' }));

// GET route to fetch the local JSON data (similar to Vercel api/data.js)
app.get('/api/data', (req, res) => {
  const localPath = path.join(__dirname, 'all_months.json');
  if (fs.existsSync(localPath)) {
    try {
      const data = fs.readFileSync(localPath, 'utf-8');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(data);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to read local data' });
    }
  }
  return res.status(404).json({ error: 'No data found' });
});

// POST route for raw JSON upload (similar to Vercel api/upload.js)
app.post('/api/upload', (req, res) => {
  const jsonText = req.body;
  if (!jsonText || typeof jsonText !== 'string') {
    return res.status(400).json({ error: 'Empty payload or invalid content-type' });
  }

  try {
    const parsedData = JSON.parse(jsonText);
    if (!parsedData.months || !parsedData.sheetOrder) {
      return res.status(400).json({ error: 'โครงสร้างไฟล์ JSON ไม่ถูกต้อง (ต้องมีคีย์ months และ sheetOrder)' });
    }

    const localPath = path.join(__dirname, 'all_months.json');
    fs.writeFileSync(localPath, jsonText, 'utf-8');
    console.log('Successfully updated local all_months.json');

    // Run build_dashboard.py to update local HTML files
    exec('python build_dashboard.py', (err, stdout, stderr) => {
      if (err) {
        console.error('Error rebuilding dashboard locally:', err);
      } else {
        console.log('Local rebuild output:', stdout.trim());
      }
    });

    return res.json({ success: true, message: 'Dashboard updated successfully!' });
  } catch (error) {
    console.error('Error processing JSON upload:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Fallback all routes to index.html for SPA behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
