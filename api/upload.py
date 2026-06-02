import os
import json
import io
import requests
from flask import Flask, request, jsonify
from api.parser import parse_excel_to_json

app = Flask(__name__)

def upload_to_blob(pathname, file_bytes):
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not token:
        raise Exception("BLOB_READ_WRITE_TOKEN environment variable not set")
    
    url = f"https://blob.vercel-storage.com/{pathname}"
    headers = {
        "Authorization": f"Bearer {token}",
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json"
    }
    
    # We will upload the file bytes. Vercel Blob expects a PUT request with the raw data.
    # By default, x-add-random-suffix: 1 (or true) is set, which is fine since we list and find the newest anyway.
    response = requests.put(url, headers=headers, data=file_bytes)
    response.raise_for_status()
    return response.json()

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'excelFile' not in request.files:
        return jsonify({"error": "Please upload an Excel file."}), 400
        
    file = request.files['excelFile']
    if file.filename == '':
        return jsonify({"error": "No file selected."}), 400
        
    if not file.filename.endswith('.xlsx'):
        return jsonify({"error": "กรุณาอัปโหลดไฟล์ Excel (.xlsx) เท่านั้น"}), 400
        
    print(f"Received file upload: {file.filename}")
    
    try:
        # Read file bytes into memory
        file_bytes = file.read()
        
        # 1. Verify structure and parse using openpyxl in-memory
        # We wrap in BytesIO so load_workbook can read it like a file
        excel_stream = io.BytesIO(file_bytes)
        dashboard_data = parse_excel_to_json(excel_stream)
        
        print("Successfully parsed Excel data. Uploading JSON to Vercel Blob...")
        
        # 2. Convert to minified JSON string
        json_str = json.dumps(dashboard_data, ensure_ascii=False, separators=(',', ':'))
        json_bytes = json_str.encode('utf-8')
        
        # 3. Upload JSON bytes to Vercel Blob
        blob_info = upload_to_blob("all_months.json", json_bytes)
        
        print(f"Successfully uploaded to Vercel Blob: {blob_info.get('url')}")
        
        return jsonify({
            "success": True, 
            "message": "Dashboard updated successfully!",
            "url": blob_info.get("url")
        })
        
    except Exception as e:
        print(f"Error during upload processing: {e}")
        error_msg = str(e)
        if 'BadZipFile' in error_msg or 'not a zip file' in error_msg:
            error_msg = 'ไฟล์ Excel ที่อัปโหลดไม่สมบูรณ์หรือเสียหาย (Bad Zip File) กรุณาตรวจสอบไฟล์ของคุณและลองอัปโหลดอีกครั้ง'
        else:
            error_msg = f'โครงสร้างไฟล์ไม่ถูกต้อง หรือเกิดข้อผิดพลาด: {error_msg}'
        return jsonify({"error": error_msg}), 500

# Expose app for Vercel WSGI
handler = app
