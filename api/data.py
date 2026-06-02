import os
import json
import requests
from flask import Flask, jsonify, make_response

app = Flask(__name__)

def get_latest_blob_url(pathname):
    token = os.environ.get("BLOB_READ_WRITE_TOKEN")
    if not token:
        print("BLOB_READ_WRITE_TOKEN environment variable not set")
        return None
    url = "https://blob.vercel-storage.com"
    headers = {
        "Authorization": f"Bearer {token}",
        "x-api-version": "2023-08-01"
    }
    try:
        r = requests.get(url, headers=headers)
        r.raise_for_status()
        data = r.json()
        blobs = data.get("blobs", [])
        
        # Filter matching pathname
        matching_blobs = [b for b in blobs if b.get("pathname") == pathname]
        if not matching_blobs:
            return None
            
        # Sort by uploadedAt descending to get the newest upload
        matching_blobs.sort(key=lambda x: x.get("uploadedAt", ""), reverse=True)
        return matching_blobs[0].get("url")
    except Exception as e:
        print(f"Error listing blobs: {e}")
        return None

@app.route('/api/data', methods=['GET'])
def get_data():
    blob_url = get_latest_blob_url("all_months.json")
    if blob_url:
        try:
            print(f"Fetching data from Vercel Blob URL: {blob_url}")
            r = requests.get(blob_url)
            r.raise_for_status()
            
            # Create a response with proper content-type and encoding
            response = make_response(r.text)
            response.headers['Content-Type'] = 'application/json; charset=utf-8'
            # Add cache-control header so browser checks for updates, but can cache if unchanged
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return response
        except Exception as e:
            print(f"Error fetching blob data: {e}")
            
    # Fallback: load local all_months.json if available
    # Vercel deploys files from the root, so all_months.json is at '../../all_months.json' relative to api/data.py (which is at api/data.py)
    # The current working directory in Vercel function is usually the project root, let's look for both paths.
    local_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "all_months.json"),
        os.path.join(os.getcwd(), "all_months.json"),
        "all_months.json"
    ]
    
    for lp in local_paths:
        if os.path.exists(lp):
            print(f"Fallback: Reading local data from {lp}")
            try:
                with open(lp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                return jsonify(data)
            except Exception as e:
                print(f"Error reading local data file {lp}: {e}")
                
    return jsonify({"error": "No data found on Blob and fallback data file not found"}), 404

# Expose app for Vercel WSGI
handler = app
