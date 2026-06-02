"""
Build dashboard HTML จาก template + ข้อมูล JSON
รัน:  python build_dashboard.py
ผลลัพธ์:  dashboard.html  (เปิดด้วย browser ได้เลย)
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(HERE, "dashboard_template.html")
DATA     = os.path.join(HERE, "all_months.json")
OUT      = os.path.join(HERE, "dashboard.html")
OUT_DIST_DIR = os.path.join(HERE, "dist")
OUT_DIST     = os.path.join(OUT_DIST_DIR, "index.html")

with open(DATA, "r", encoding="utf-8") as f:
    raw = json.load(f)

with open(TEMPLATE, "r", encoding="utf-8") as f:
    html = f.read()

# minify JSON เพื่อให้ output ไม่ใหญ่
data_js = json.dumps(raw, ensure_ascii=False, separators=(",", ":"))

if "__RAW_DATA__" not in html:
    raise SystemExit("ไม่เจอ __RAW_DATA__ ใน template — ตรวจสอบ dashboard_template.html")

html = html.replace("__RAW_DATA__", data_js)

# สร้างโฟลเดอร์ dist หากยังไม่มี
os.makedirs(OUT_DIST_DIR, exist_ok=True)

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

with open(OUT_DIST, "w", encoding="utf-8") as f:
    f.write(html)

print(f"[Built Local]  -> {OUT}")
print(f"[Built Deploy] -> {OUT_DIST}")
print(f"  Size: {len(html):,} bytes")
print(f"  Months: {raw['sheetOrder']}")
print(f"\nOpen file:  start {OUT}")

