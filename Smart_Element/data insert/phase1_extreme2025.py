"""Phase 1 — Class Name Matching Report for Extreme/Cutting 2025 (Format C)."""
import sys
import subprocess

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for pkg in ("openpyxl", "pandas", "python-dotenv", "supabase"):
    try:
        __import__(pkg.replace("-", "_").split("[")[0])
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

import re
import difflib
from pathlib import Path
from datetime import date
from dotenv import load_dotenv
import os
import pandas as pd

load_dotenv(Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\.env"))
from supabase import create_client
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

EXCEL = Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\תחרויות אקסטרים 2025.xlsx")
print(f"Loading: {EXCEL.name}\n")

# ── Constants ─────────────────────────────────────────────────────────────────
RANCH_ID  = 11
DATE_RE   = re.compile(r"(\d{1,2})[-–](\d{1,2})\.(\d{2})\.?(\d{0,4})")

EXTREME_PREFIXES = [
    "אקסטרים קאובוי ",
    "אקס' קאובוי ",
    "אקס' קאו' ",
    "ריינינג ",
]

# Explicit Extreme classtype map (normalized_lower → (classtypeid, db_classname))
EXTREME_MAP = {
    "פתוח מוגבל":               (36,  "אקסטרים קאובוי פתוח מוגבל - IEF"),
    "פתוח התאחדות":              (37,  "אקסטרים קאובוי פתוח  - IEF"),
    "youth exca":                (38,  "Youth EXCA"),
    "intermediate exca":         (39,  "Intermediate EXCA"),
    "עד 18 ירוקי רוכב חדש":    (42,  "אקס' קאובוי עד 18 ירוקי רוכב חדש - IEF"),
    "עד 18 ירוקי":               (43,  "אקסטרים קאובוי עד 18 ירוקי - IEF"),
    "נוער עד 18 מוגבל":          (48,  "אקסטרים קאובוי נוער עד 18 מוגבל IEF"),
    "nonpro exca":               (49,  "NONPRO EXCA"),
    "נונ פרו exca":               (49,  "NONPRO EXCA"),
    "pro exca":                  (50,  "PRO EXCA"),
    "פרו exca":                   (50,  "PRO EXCA"),
    "נוביס התאחדות":              (51,  "אקסטרים קאובוי נוביס  - IEF"),
    "young gun exca":            (52,  "Young Gun EXCA"),
    "עד 15 ירוקי חדש":           (53,  "אקס' קאובוי עד15 ירוקי רוכב חדש - IEF"),
    "עד 15 ירוקי":               (54,  "אקסטרים קאובוי עד 15 ירוקי - IEF"),
    "עד 18":                     (55,  "אקסטרים קאובוי נוער עד גיל 18 - IEF"),
    "נוער עד גיל 18":             (55,  "אקסטרים קאובוי נוער עד גיל 18 - IEF"),
    "עד 15":                     (56,  "אקסטרים קאובוי נוער עד גיל 15 - IEF"),
    "נוער עד גיל 15":             (56,  "אקסטרים קאובוי נוער עד גיל 15 - IEF"),
    "נונ פרו 40+":                (57,  "אקסטרים קאובוי נונ פרו 40+ - IEF"),
    "נונ פרו התאחדות":            (58,  "אקסטרים קאובוי נונ פרו  - IEF"),
    "פתוח exca":                  (59,  "OPEN EXCA"),
    "open exca":                 (59,  "OPEN EXCA"),
    "novice exca":               (60,  "Novice EXCA"),
    "נוביס נונ פרו":              (61,  "אקסטרים קאובוי - נוביס נונ פרו"),
    "עד 12 ירוקי":               (62,  "אקסטרים קאובוי עד 12 ירוקי - IEF"),
    "נונ פרו מוגבל":              (47,  "אקסטרים קאובוי נונ פרו מוגבל IEF"),
    "עד 12":                     (44,  "אקסטרים קאובוי נוער עד גיל 12 IEF"),
    "רוכב ירוקי":                 (45,  "אקסטרים קאובוי רוכב ירוקי - IEF"),
    "רוכב ירוקי חדש":             (46,  "אקס' קאובוי רוכב ירוקי רוכב חדש - IEF"),
    "nonpro super rider&horse":  (46,  "אקס' קאובוי רוכב ירוקי רוכב חדש - IEF"),
    "open super rider&horse":    (None, "NEW — fieldid=4"),
    "green horse exca":          (None, "NEW — fieldid=4"),
}

# Explicit Cutting classtype map
CUTTING_MAP = {
    "פתוח":                    (18, "קאטינג פתוח"),
    "נונ פרו":                  (20, "קאטינג נונ פרו"),
    "נוביס":                    (22, "קאטינג נוביס"),
    "נוביס נונ פרו":            (23, "קאטינג נוביס נונ פרו"),
    "נוביס פרימיום":             (24, "קאטינג נוביס פרימיום"),
    "נוביס פרימיום נונ פרו":    (25, "קאטינג נוביס פרימיום נונ פרו"),
    "נונ פרו פלאטינום":          (27, "קאטינג נונ פרו פלאטינום"),
    "קאוהורס נונ פרו":          (17, "קאו הורס נונ פרו"),
    "קאו הורס נונ פרו":         (17, "קאו הורס נונ פרו"),
    "קאוהורס פתוח":             (26, "קאוהורס פתוח"),
    "קאו הורס פתוח":            (26, "קאוהורס פתוח"),
    "נוביס מוגבל":               (29, "קאטינג נונ פרו מוגבל"),
    "מוגבל ncha":               (29, "קאטינג נונ פרו מוגבל"),
    "נוער":                     (30, "קאטינג נוער"),
    "קאטינג ירוקי":             (34, "קאטינג ירוקי בוגרים"),
    "פתוח ncha":                (19, "קאטינג פתוח NCHA"),
    "נונ פרו ncha":             (21, "קאטינג נונ פרו NCHA"),
    "ncha 2000 limit rider":    (28, "NCHA 2000 Limit Rider"),
    "נוער ncha":                (31, "קאטינג נוער NCHA"),
    "עד 18 ירוקי":              (32, "קאטינג נוער ירוקי עד 18"),
    "עד 15 ירוקי":              (33, "קאטינג נוער ירוקי עד 15"),
    "ירוקי 40+":                (35, "קאטינג ירוקי 40+"),
    "ncha דרבי פתוח":           (None, "NEW — fieldid=2"),
    "ncha דרבי נונ פרו":        (None, "NEW — fieldid=2"),
    "נונ פרו ללא רסן ומתג":      (None, "NEW — fieldid=2"),
    "קאטינג זוגות":              (None, "NEW — fieldid=2"),
    "פיטוריטי פתוח":            (151, "פטוריטי פתוח NRHA"),
    "פיטוריטי נונ פרו":         (146, "פטוריטי נונ פרו NRHA"),
}

# ── Normalization ─────────────────────────────────────────────────────────────
def normalize(name):
    if not isinstance(name, str):
        return ""
    name = name.strip()
    for prefix in EXTREME_PREFIXES:
        if name.startswith(prefix):
            name = name[len(prefix):]
            break
    return re.sub(r"\s+", " ", name).strip()

# ── Skip rules ────────────────────────────────────────────────────────────────
SKIP_EXACT   = {"מספר", "רייד סמארט exca", "ride smart exca"}
SKIP_STARTS  = [
    "פייד טיים", "מקצה לרישום דמי ביטול", "מקצה לביטול",
    'סה"כ', "סה\"כ", "רישום מאוחר", "תאים", "נסורת",
    "כרטיסים", "איבוד כובע", "ride smart exca", "רייד סמארט",
]

def should_skip(raw, entry_count_raw=None):
    if raw is None:
        return True
    n = str(raw).strip()
    if not n or n == "מספר":
        return True
    if n.lower() in SKIP_EXACT:
        return True
    for s in SKIP_STARTS:
        if n.lower().startswith(s.lower()):
            return True
    try:
        float(n)
        return True  # numeric-only = totals row
    except ValueError:
        pass
    # Negative entry count
    if entry_count_raw is not None:
        try:
            if float(str(entry_count_raw).strip()) < 0:
                return True
        except (ValueError, TypeError):
            pass
    return False

# ── Date parsing ──────────────────────────────────────────────────────────────
def parse_date_c(s):
    s = str(s).strip()
    m = DATE_RE.search(s)
    if not m:
        return None, None
    d1, d2, mo, yr = m.groups()
    yr = int(yr) if yr else 25
    if yr < 100:
        yr += 2000
    return date(yr, int(mo), int(d1)), date(yr, int(mo), int(d2))

# ── Field-type detection ──────────────────────────────────────────────────────
def detect_field(text):
    t = str(text)
    if "קאטינג" in t:
        return 2
    return 4  # default to Extreme for this workbook

# ── Block splitting ───────────────────────────────────────────────────────────
def find_blocks(sheet_name, df):
    """
    Returns list of dicts:
      { comp_name, field_id, date_str, start_date, end_date,
        hdr_row, data_start, data_end, df }
    """
    blocks = []

    # First block always starts at row 0
    row0 = str(df.iloc[0, 0]).strip() if pd.notna(df.iloc[0, 0]) else ""
    row1 = str(df.iloc[1, 0]).strip() if len(df) > 1 and pd.notna(df.iloc[1, 0]) else ""

    # Special case: קאטינג 6 — row 0=name, row 1=empty, row 2=date, row 3=headers
    if DATE_RE.search(row1):
        # Normal: row 0=name, row 1=date, row 2=headers
        comp_name   = row0
        date_str    = row1
        field_id    = detect_field(comp_name + date_str)
        hdr_row     = 2
        data_start  = 3
    elif not DATE_RE.search(row1):
        # Look for date in row 2
        row2 = str(df.iloc[2, 0]).strip() if len(df) > 2 and pd.notna(df.iloc[2, 0]) else ""
        if DATE_RE.search(row2):
            # קאטינג 6 style: row 0=name, row 2=date, row 3=headers
            comp_name   = row0
            date_str    = row2
            field_id    = detect_field(comp_name + date_str)
            hdr_row     = 3
            data_start  = 4
        else:
            comp_name   = row0
            date_str    = row1
            field_id    = detect_field(comp_name + date_str)
            hdr_row     = 2
            data_start  = 3

    start_d, end_d = parse_date_c(date_str)

    # Scan for a second block (mid-sheet date row followed by header row)
    split_row = None
    for i in range(data_start + 1, len(df)):
        cell = str(df.iloc[i, 0]).strip() if pd.notna(df.iloc[i, 0]) else ""
        if not cell or cell == "nan":
            continue
        if DATE_RE.search(cell) and not cell.lower().startswith("מקצה"):
            # Check next non-empty row for header
            for j in range(i + 1, min(i + 3, len(df))):
                nxt = str(df.iloc[j, 0]).strip() if pd.notna(df.iloc[j, 0]) else ""
                if nxt == "מקצה":
                    split_row = (i, j)   # (date_row, header_row)
                    break
        if split_row:
            break

    # Build first block
    data_end_1 = split_row[0] if split_row else len(df)
    blocks.append({
        "comp_name": comp_name, "field_id": field_id,
        "date_str":  date_str,  "start": start_d, "end": end_d,
        "hdr_row": hdr_row, "data_start": data_start, "data_end": data_end_1,
        "df": df,
    })

    # Build second block if split found
    if split_row:
        date_row_idx, hdr_row_2 = split_row
        date_str_2 = str(df.iloc[date_row_idx, 0]).strip()
        start_d2, end_d2 = parse_date_c(date_str_2)
        field_id_2 = detect_field(date_str_2)

        # Derive competition name from date string and sheet name
        comp_num = re.search(r"קאטינג\s+(\d+|\d+\+\d+)", date_str_2)
        if comp_num:
            comp_name_2 = f"תחרות קאטינג {comp_num.group(1)} 2025"
        else:
            comp_name_2 = f"תחרות קאטינג מ{date_str_2}"

        blocks.append({
            "comp_name": comp_name_2, "field_id": field_id_2,
            "date_str":  date_str_2,  "start": start_d2, "end": end_d2,
            "hdr_row": hdr_row_2, "data_start": hdr_row_2 + 1, "data_end": len(df),
            "df": df,
        })

    return blocks

# ── Load sheets ───────────────────────────────────────────────────────────────
all_sheets = pd.read_excel(EXCEL, sheet_name=None, header=None, dtype=str)
print(f"Sheets: {list(all_sheets.keys())}\n")

# ── Parse all blocks and collect class names ──────────────────────────────────
all_blocks    = []
# (raw_name, norm_name, field_id, comp_name) — for matching
class_records = []
seen_norms    = {}   # norm_lower → (raw, field_id, comp_name) first occurrence

for sheet_name, df in all_sheets.items():
    if df.empty or df.dropna(how="all").empty:
        continue
    blocks = find_blocks(sheet_name, df)
    all_blocks.extend([(sheet_name, b) for b in blocks])

    for b in blocks:
        hdr_row    = b["hdr_row"]
        data_start = b["data_start"]
        data_end   = b["data_end"]
        field_id   = b["field_id"]
        comp_name  = b["comp_name"]

        # Find column indices from header row
        hdr = df.iloc[hdr_row]
        ci_name = ci_ent = None
        for i, v in enumerate(hdr):
            vs = str(v).strip() if pd.notna(v) else ""
            if vs == "מקצה":
                ci_name = i
            elif "מספר כניסות" in vs:
                ci_ent = i

        if ci_name is None:
            ci_name = 0

        for _, row in df.iloc[data_start:data_end].iterrows():
            raw  = row.iloc[ci_name] if ci_name < len(row) else None
            ent  = row.iloc[ci_ent]  if ci_ent  is not None and ci_ent < len(row) else None
            if pd.isna(raw):
                continue
            raw_s = str(raw).strip()
            if should_skip(raw_s, ent):
                continue
            norm = normalize(raw_s)
            if not norm:
                continue
            key = norm.lower()
            if key not in seen_norms:
                seen_norms[key] = (raw_s, field_id, comp_name)

# Build list for matching
class_records = [(raw_s, norm, fid, cname)
                 for norm, (raw_s, fid, cname) in
                 sorted(seen_norms.items(), key=lambda x: (x[1][1], x[0]))]

print(f"Unique normalized class names: {len(class_records)}\n")

# ── Fetch existing classtypes ─────────────────────────────────────────────────
print("Fetching classtypes from Supabase...")
existing    = sb.table("classtype").select("classtypeid, classname, fieldid").execute().data
print(f"  {len(existing)} existing classtypes\n")
ex_by_id    = {r["classtypeid"]: r for r in existing}
ex_names    = {r["classname"]: r["classtypeid"] for r in existing}
ex_lower    = {r["classname"].lower(): (r["classname"], r["classtypeid"]) for r in existing}
ex_keys     = list(ex_names.keys())

# ── Matching ──────────────────────────────────────────────────────────────────
exact_rows = []
fuzzy_rows = []
new_rows   = []

for raw, norm, field_id, comp_name in class_records:
    key = norm.lower()

    # 1. Explicit map (field-specific)
    if field_id == 4 and key in EXTREME_MAP:
        cid, db_name = EXTREME_MAP[key]
        if cid:
            exact_rows.append((raw, norm, field_id, cid, db_name, "EXPLICIT-EXTREME"))
        else:
            new_rows.append((raw, norm, field_id, db_name))
        continue

    if field_id == 2 and key in CUTTING_MAP:
        cid, db_name = CUTTING_MAP[key]
        if cid:
            exact_rows.append((raw, norm, field_id, cid, db_name, "EXPLICIT-CUTTING"))
        else:
            new_rows.append((raw, norm, field_id, db_name))
        continue

    # 2. Exact match (case-insensitive)
    if norm in ex_names:
        exact_rows.append((raw, norm, field_id, ex_names[norm], norm, "EXACT"))
        continue
    if key in ex_lower:
        db_name, cid = ex_lower[key]
        exact_rows.append((raw, norm, field_id, cid, db_name, "EXACT-CI"))
        continue

    # 3. Fuzzy
    close = difflib.get_close_matches(norm, ex_keys, n=1, cutoff=0.55)
    if close:
        score = round(difflib.SequenceMatcher(None, norm, close[0]).ratio(), 2)
        fuzzy_rows.append((raw, norm, field_id, ex_names[close[0]], close[0], score))
    else:
        new_rows.append((raw, norm, field_id, "no match"))

# ── Print report ──────────────────────────────────────────────────────────────
FIELD_LABEL = {1: "ריינינג", 2: "קאטינג", 4: "אקסטרים"}

print("=" * 74)
print("CLASS NAME MATCHING REPORT — תחרויות אקסטרים 2025")
print("=" * 74)

print(f"\n--- EXACT / EXPLICIT MATCHES ({len(exact_rows)}) ---")
for raw, norm, fid, cid, db_name, method in exact_rows:
    src = f"  (from '{raw}')" if norm != raw else ""
    print(f"  [{FIELD_LABEL.get(fid,'?')}]  '{norm}'{src}")
    print(f"    {method} -> id={cid}  db='{db_name}'")

print(f"\n--- FUZZY MATCHES ({len(fuzzy_rows)}) ---")
for raw, norm, fid, cid, db_name, score in fuzzy_rows:
    src = f"  (from '{raw}')" if norm != raw else ""
    print(f"  [{FIELD_LABEL.get(fid,'?')}]  '{norm}'{src}")
    print(f"    FUZZY -> id={cid}  db='{db_name}'  score={score}")

print(f"\n--- NEW CLASSTYPES NEEDED ({len(new_rows)}) ---")
for raw, norm, fid, reason in new_rows:
    src = f"  (from '{raw}')" if norm != raw else ""
    print(f"  [{FIELD_LABEL.get(fid,'?')}]  '{norm}'{src}  [{reason}]")

print()
print("-" * 74)
print(f"  Total unique class names : {len(class_records)}")
print(f"  Explicit/exact matches   : {len(exact_rows)}")
print(f"  Fuzzy matches            : {len(fuzzy_rows)}")
print(f"  New (no match)           : {len(new_rows)}")
print("-" * 74)

# ── Competition blocks summary ────────────────────────────────────────────────
print("\n--- COMPETITION BLOCKS ---")
for sheet_name, b in all_blocks:
    fid      = b["field_id"]
    dates    = f"{b['start']} – {b['end']}" if b["start"] else "dates unknown"
    print(f"  [{sheet_name}]  field={fid} ({FIELD_LABEL.get(fid,'?')})")
    print(f"    name  : {b['comp_name']}")
    print(f"    dates : {dates}")
    print(f"    ranch : ranchid=11 (דאבל קיי)")
    print()

print("─" * 74)
print("Phase 1 complete. Review and confirm to proceed with Phase 2.")
print("─" * 74)
