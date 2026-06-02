const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { exec } = require('child_process');
const app = express();
const PORT = process.env.PORT || 3000;

// Setup multer storage to write to a temporary file first (to prevent request aborts if target file is locked)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname);
  },
  filename: function (req, file, cb) {
    cb(null, 'KPI Ticket Resolution_upload.xlsx');
  }
});

const upload = multer({ storage: storage });

// POST route for file upload and automatic rebuild
app.post('/api/upload', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please upload an Excel file.' });
  }

  const tempPath = path.join(__dirname, 'KPI Ticket Resolution_upload.xlsx');
  const targetPath = path.join(__dirname, 'KPI Ticket Resolution.xlsx');

  console.log('Received Excel file. Attempting to update database...');

  // Try to copy the uploaded temp file over the target file
  fs.copyFile(tempPath, targetPath, (copyErr) => {
    // Clean up the temp file in either case
    fs.unlink(tempPath, () => {});

    if (copyErr) {
      console.error('Copy error (likely file locked by Excel):', copyErr);
      return res.status(500).json({ 
        error: 'ไม่สามารถเขียนทับไฟล์ได้ เนื่องจากไฟล์ "KPI Ticket Resolution.xlsx" กำลังเปิดใช้งานอยู่ในโปรแกรมอื่น (เช่น Microsoft Excel) กรุณาปิดโปรแกรมดังกล่าวก่อนทำการอัปโหลดอีกครั้ง' 
      });
    }

    console.log('File successfully updated. Running rebuild process...');

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
});

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback all routes to index.html for SPA behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Error handling middleware to return JSON for all upload/server errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  let errMsg = err.message || 'Internal Server Error';
  if (errMsg.includes('EBUSY') || errMsg.includes('UNKNOWN') || errMsg.includes('KPI Ticket Resolution.xlsx')) {
    errMsg = 'ไม่สามารถเขียนทับไฟล์ได้ เนื่องจากไฟล์ "KPI Ticket Resolution.xlsx" กำลังเปิดใช้งานอยู่ในโปรแกรมอื่น (เช่น Microsoft Excel) กรุณาปิดโปรแกรมดังกล่าวก่อนทำการอัปโหลดอีกครั้ง';
  }
  res.status(500).json({ error: errMsg });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
