const express = require('express');
const path = require('path');
const multer = require('multer');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Setup multer storage to overwrite the existing Excel file in the root directory
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname);
  },
  filename: function (req, file, cb) {
    cb(null, 'KPI Ticket Resolution.xlsx');
  }
});

const upload = multer({ storage: storage });

// POST route for file upload and automatic rebuild
app.post('/api/upload', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an Excel file.' });
  }

  console.log('Received Excel file. Starting rebuild process...');

  // Step 1: Export raw data from Excel to JSON
  exec('python export_all_months.py', (err, stdout, stderr) => {
    if (err) {
      console.error('Error running export_all_months.py:', err);
      return res.status(500).json({ error: 'Failed to process Excel data: ' + err.message });
    }
    console.log('export_all_months.py output:', stdout);

    // Step 2: Build HTML dashboard from template + JSON
    exec('python build_dashboard.py', (err2, stdout2, stderr2) => {
      if (err2) {
        console.error('Error running build_dashboard.py:', err2);
        return res.status(500).json({ error: 'Failed to rebuild dashboard: ' + err2.message });
      }
      console.log('build_dashboard.py output:', stdout2);
      
      res.json({ success: true, message: 'Dashboard updated successfully!' });
    });
  });
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback all routes to index.html for SPA behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
