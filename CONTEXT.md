# Ticket Resolution Dashboard — Project Context

> เอกสารสรุปการทำงานของระบบ Dashboard สำหรับวิเคราะห์ KPI Ticket Resolution
> อัปเดตล่าสุด: 2026-05-28

---

## 1. ภาพรวม (Overview)

ระบบนี้คือ **Live Dashboard แบบ self-contained HTML** ที่วิเคราะห์ KPI การแก้ไข ticket จากไฟล์ Excel ของฝ่าย IT/Product

**เป้าหมาย:** ให้ทีม manager มองเห็น Resolution Time / First Response / SLA Gap ในหลายมิติได้ทันที พร้อม drill-down เจาะลึกถึงระดับ SubCategory และเปรียบเทียบระหว่างเดือน

**Core metric:** Average Resolution Time (วัน) แยกตาม Team / Owner / Category / SubCategory

---

## 2. โครงสร้างไฟล์ (File Structure)

ทุกไฟล์อยู่ใน `D:\KPI\Ticket Resolution\`

| ไฟล์ | บทบาท | สร้างโดย |
|---|---|---|
| `KPI Ticket Resolution.xlsx` | **Source of truth** — ไฟล์ Excel ที่มี ticket raw data แยก sheet ตามเดือน | คน (manual) |
| `export_all_months.py` | สคริปต์ Python อ่าน Excel → aggregate → เขียน JSON | Claude |
| `inspect_sheets.py` | สคริปต์ตรวจสอบโครงสร้าง Excel (debug ใช้ตอน column ชื่อเปลี่ยน) | Claude |
| `all_months.json` | **ข้อมูลที่ aggregate แล้ว** ใช้ภายใน dashboard | export_all_months.py |
| `sheet_inspection.json` | metadata ของ sheets (สำหรับ debug) | inspect_sheets.py |
| `dashboard_template.html` | HTML template ที่มี placeholder `__RAW_DATA__` | Claude |
| `build_dashboard.py` | inject `all_months.json` ลงใน template → output `dashboard.html` | Claude |
| `dashboard.html` | **ไฟล์ที่ใช้งานจริง** — เปิดด้วย browser ได้เลย | build_dashboard.py |

---

## 3. Data Flow (การไหลของข้อมูล)

```
[Excel sheets]
   │  ↳ April 2026 (raw data)
   │  ↳ May 2026   (raw data)
   │  ↳ April      (pivot summary, จะถูกข้าม)
   ▼
[export_all_months.py]
   │  • อ่านทุก sheet
   │  • ข้าม sheet ที่ไม่มี column ครบ
   │  • Aggregate 4 มิติเดี่ยว + 4 มิติ cross-drill
   ▼
[all_months.json]
   │  • months[เดือน].overall
   │  • months[เดือน].team / owner / category / subcategory
   │  • months[เดือน].teamCategory / teamSubcategory / ownerCategory / categorySubcategory
   │  • sheetOrder = ["April 2026", "May 2026", ...]
   ▼
[build_dashboard.py + dashboard_template.html]
   │  • อ่าน JSON → minify → แทน __RAW_DATA__ ใน template
   ▼
[dashboard.html] ← ผู้ใช้เปิดดูตรงนี้
```

---

## 4. การ Update ข้อมูล (Workflow)

**เมื่อใดต้องอัปเดต:** เมื่อ Excel มี sheet เดือนใหม่ หรือข้อมูลใน sheet เก่าเปลี่ยน

```powershell
cd "D:\KPI\Ticket Resolution"

# Step 1: อ่าน Excel ใหม่ → สร้าง JSON
python export_all_months.py

# Step 2: รวม JSON กับ template → สร้าง dashboard.html
python build_dashboard.py

# Step 3: เปิด dashboard.html ด้วย browser (หรือบอก Claude ให้ refresh artifact)
start dashboard.html
```

**ครั้งแรกเท่านั้น:** `pip install openpyxl`

---

## 5. Schema ของ Excel (ที่ script คาดหวัง)

**Required columns** (script จะข้าม sheet ที่ขาด column เหล่านี้):

| Column | Type | คำอธิบาย |
|---|---|---|
| `TeamOwner` | string | ชื่อทีมที่รับผิดชอบ |
| `TicketOwner` | string | อีเมลของผู้รับผิดชอบ ticket |
| `ResolutionTime` | number (วัน) | เวลาที่ใช้แก้ไขจนเสร็จ |
| `FirstResponseTime` | number (วัน) | เวลาตอบกลับครั้งแรก |
| `SLAGap` | number (วัน) | ช่องว่างจาก SLA |

**Optional columns** (มีก็ใช้ ไม่มีก็ "ไม่ระบุ"):
- `Category`
- `SubCategory` หรือ `SubCatagory` (รองรับ typo ใน Excel)

**Sheet naming convention:** ใช้ชื่อแบบ `<Month> <Year>` เช่น `April 2026`, `May 2026` (script เก็บลำดับตามลำดับใน Excel)

**Sheets ที่ถูกข้าม:** sheet ที่เป็น pivot summary หรือ sheet ที่ไม่มี column ครบ — script จะ print `⏭ skip`

---

## 6. Dashboard Architecture

### 6.1 Design Language
- **Style:** Calm futuristic enterprise · premium AI interface
- **Background:** Deep navy (#0b0e15) + 3 ambient orbs (sky/lavender/rose) ลอยช้าๆ ที่ opacity ต่ำ
- **Panels:** Glassmorphism — `backdrop-filter: blur(20px)` + hairline borders
- **Colors:** Soft pastels — `#7dd3fc` sky · `#c4b5fd` lavender · `#fda4af` rose · `#fde68a` amber
- **Typography:** Prompt → IBM Plex Sans Thai → Noto Sans Thai → Sarabun → Leelawadee UI
- **Motion:** Spring physics easing `cubic-bezier(0.34, 1.4, 0.64, 1)` — แทน Framer Motion

### 6.2 State Model
```javascript
state = {
  month: "May 2026",          // เดือนที่เลือก
  view: "team",               // team | owner | category | subcategory
  tab: "overview",            // overview | trend | performance | workload | sla | data
  parentFilter: "all",        // กรอง parent (เช่น owner กรองตาม team)
  sortKey: "avgResolution",   // คอลัมน์ที่เรียง (สำหรับตาราง)
  sortDir: "asc"              // asc | desc
}
```

### 6.3 View → Data Key mapping (VIEW_META)

| view | data key | nameField | parentField |
|---|---|---|---|
| `team` | `team[]` | TeamOwner | — |
| `owner` | `owner[]` | TicketOwner | TeamOwner |
| `category` | `category[]` | Category | — |
| `subcategory` | `subcategory[]` | SubCategory | Category |

เมื่อสลับ view ทุก chart, KPI, table, modal จะปรับอัตโนมัติ

### 6.4 Tabs (6 ตัว)

1. **ภาพรวม (Overview)** — KPI cards + AI insight + 4 charts หลัก
2. **แนวโน้มรายเดือน (Trend)** — Line chart cross-month + Volume bar + Dimension-aware trend
3. **การจัดอันดับ (Performance)** — Top/Bottom rankings + Bubble scatter (Volume × Speed × SLA)
4. **ปริมาณงาน (Workload)** — Bar + Pie + Animated progress bars
5. **SLA Health** — Best/Worst SLA, % Within/Over + Horizontal bar
6. **ตารางข้อมูล (Data)** — Sortable table + click row → modal

### 6.5 Smart Drill-down Modal

**Logic:** ขึ้นอยู่กับ view ที่เลือก modal จะแสดง cross-drill ที่เกี่ยวข้อง

| คลิกที่ | Modal แสดง |
|---|---|
| Team item | Category ในทีม + Top สมาชิก |
| Owner item | Category ที่บุคคลนี้รับผิดชอบ |
| Category item | ทีมที่ดูแล + SubCategory |
| SubCategory item | ทีมที่ดูแล |

Modal มี: 6 KPI cells + Min/Avg/Max chart + drill section ที่เกี่ยวข้อง

ใช้ key เหล่านี้ใน `all_months.json[เดือน]`:
- `teamCategory` — สำหรับ team modal
- `teamSubcategory` — สำหรับ subcategory modal
- `ownerCategory` — สำหรับ owner modal
- `categorySubcategory` — สำหรับ category modal

### 6.6 KPI Delta (MoM Comparison)

เมื่อมี previous month และ `parentFilter === 'all'`:
- คำนวณ % change จากเดือนก่อน
- แสดง ↑/↓ พร้อมสี (เขียว = ดี, แดง = แย่)
- `lowerBetter` flag: Resolution/FRT/SLA = lower better; Tickets = neutral

### 6.7 Chart Library
- **Chart.js v4.5.0** (UMD) — bar, doughnut, line, bubble
- Animation easing: `easeOutCubic` (900ms default)
- Tooltip: dark glassmorphism style พร้อม Thai font

---

## 7. ข้อมูลปัจจุบัน (Snapshot 2026-05-28)

| Sheet | Tickets | Teams | Owners | Categories | SubCategories |
|---|---|---|---|---|---|
| April 2026 | 910 | 7 | 27 | ~28 | ~75 |
| May 2026 | 875 | 9 | 33 | ~30 | ~80 |

**Key insight April → May:**
- Resolution เฉลี่ยลดลง 27.9% (7.61 → 5.49 วัน) ✓ ดีขึ้น
- First Response ลดลง 67% (18.85 → 6.20 วัน) ✓ ดีขึ้นชัดเจน
- มีทีมใหม่ใน May: IT Digital Development, IT Innovation
- Top performer: `rutchanok.s` ครองอันดับ 1 ทั้ง 2 เดือน

---

## 8. Constraints & Decisions

### 8.1 ทำไมต้องใช้ Python script (ไม่ใช้ JS อ่าน Excel โดยตรง)
- Live Artifact sandbox ของ Cowork อนุญาตเฉพาะ Chart.js / Grid.js / Mermaid จาก CDN
- โหลด SheetJS ไม่ได้ → ต้อง pre-process ฝั่ง Python

### 8.2 ทำไมต้องมี build_dashboard.py
- ข้อมูลทั้งหมด (~286KB JSON) ต้อง inline ใน HTML เพราะ artifact ห้าม fetch
- Build script จัดการ inline ให้ครั้งเดียว → ไม่ต้อง copy-paste manual

### 8.3 ทำไม Cross-drill ต้องคำนวณ ฝั่ง Python (ไม่ทำใน JS)
- ลด JS computation ตอน render
- ทำให้ modal เปิดทันที (ไม่ต้องคำนวณ on-the-fly)
- Trade-off: JSON ใหญ่ขึ้น แต่ UX ลื่นกว่า

### 8.4 ทำไมใช้ Thai font จาก Google Fonts
- ระบบ Cowork จะ block network call ของ artifact — แต่ CSS @import ยังโหลด font ได้
- มี fallback chain ครบ (Sarabun → Leelawadee UI → Tahoma) สำหรับ offline

---

## 9. Troubleshooting

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `all_months.json` ว่าง (`{}`) | Column ใน Excel ชื่อไม่ตรง | รัน `inspect_sheets.py` ดูชื่อจริง แล้วแก้ `REQUIRED` ใน export script |
| Build script error: ไม่เจอ `__RAW_DATA__` | template เสีย | ตรวจ `dashboard_template.html` ว่ามี placeholder ครบ |
| Dashboard เปิดแล้วว่างเปล่า | JSON empty หรือ syntax error | เปิด DevTools (F12) ดู console |
| Sheet ใหม่ไม่ขึ้น | Column ขาดบางตัว | Script จะ print `⏭ skip` — เช็คชื่อ column |
| ฟอนต์ไทยไม่สวย | Google Fonts ถูก block | ใช้ system font fallback อัตโนมัติ — ไม่กระทบฟังก์ชัน |

---

## 10. Roadmap / Possible Improvements

- [ ] รองรับการคลิก drill-row ใน modal เพื่อ open modal ใหม่ (recursive drill)
- [ ] Export Dashboard เป็น PDF
- [ ] เพิ่มกราฟ time-series ระดับวัน (ต้องมี date column ใน Excel)
- [ ] เพิ่ม filter ตาม category ใน Performance tab
- [ ] เปรียบเทียบ Team A vs Team B แบบ side-by-side
- [ ] Trend line ทำ forecast ไป 1-2 เดือนข้างหน้า

---

## 11. Conventions & Code Style

### Python (export/build scripts)
- ใช้ standard library + openpyxl เท่านั้น
- Comment เป็นไทยได้
- Error handling แบบ silent skip (log แทน raise)

### HTML/CSS (template)
- ใช้ CSS variables ทั้งหมด (ไม่มี hard-coded color)
- BEM-like naming: `.kpi-head`, `.bar-row`, `.modal-cell-label`
- Inline ทุก style + script (สำหรับ artifact sandbox)

### JavaScript (dashboard logic)
- ES6+ — arrow functions, template literals
- ไม่ใช้ external framework (vanilla JS)
- State machine แบบ flat object — แก้แล้ว `renderActive()` วาดใหม่ทั้งหมด

---

*เอกสารนี้เป็น living document — อัปเดตเมื่อมีการเปลี่ยนแปลง schema หรือ architecture*
