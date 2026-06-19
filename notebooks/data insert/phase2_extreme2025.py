"""
Phase 2 — Insertion for תחרויות אקסטרים 2025 (Format C).
Confirmed mappings, skip rules, and competition corrections applied per user review.
"""
import sys
import subprocess

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for pkg in ("openpyxl", "pandas", "python-dotenv", "supabase"):
    try:
        __import__(pkg.replace("-", "_").split("[")[0])
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

import re
from pathlib import Path
from datetime import datetime, date, time, timedelta
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
import os
import pandas as pd

load_dotenv(Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\.env"))
from supabase import create_client
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

EXCEL       = Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\תחרויות אקסטרים 2025.xlsx")
TZ          = ZoneInfo("Asia/Jerusalem")
RANCH_ID    = 11
ARENA_ID    = 2
CREATOR_UID = 2
COUNTER_START = 30000

DATE_RE = re.compile(r"(\d{1,2})[-–](\d{1,2})\.(\d{2})\.?(\d{0,4})")

# ── Competition name overrides for the mixed sheet ─────────────────────────
COMP_NAME_OVERRIDES = {
    ("אקסטרים 2 קאטינג 1", 0): ("תחרות אקסטרים 2 2025", 4),
    ("אקסטרים 2 קאטינג 1", 1): ("תחרות קאטינג 1 2025",  2),
}

# ── Normalization ─────────────────────────────────────────────────────────────
EXTREME_PREFIXES = ["אקסטרים קאובוי ", "אקס' קאובוי ", "אקס' קאו' ", "ריינינג "]

def normalize(name):
    if not isinstance(name, str):
        return ""
    name = name.strip()
    for p in EXTREME_PREFIXES:
        if name.startswith(p):
            name = name[len(p):]
            break
    return re.sub(r"\s+", " ", name).strip()

# ── Skip rules ────────────────────────────────────────────────────────────────
SKIP_STARTS = [
    "פייד טיים", "מקצה לרישום דמי ביטול", "מקצה לביטול",
    'סה"כ', 'סה"כ', "רישום מאוחר", "תאים", "נסורת", "כרטיסים",
    "איבוד כובע", "ride smart exca", "רייד סמארט",
]
WINTER_SKIP_RAW = {"ריינינג פתוח התאחדות", "קאטינג נונ פרו - התאחדות"}

def should_skip(raw, entry_count_raw=None, sheet_name=""):
    if raw is None:
        return True
    n = str(raw).strip()
    if not n or n == "מספר":
        return True
    nl = n.lower()
    for s in SKIP_STARTS:
        if nl.startswith(s.lower()):
            return True
    if sheet_name == "אקסטרים חורף" and n in WINTER_SKIP_RAW:
        return True
    try:
        float(n)
        return True
    except ValueError:
        pass
    if entry_count_raw is not None:
        try:
            if float(str(entry_count_raw).strip()) < 0:
                return True
        except (ValueError, TypeError):
            pass
    return False

def ends_in_round(norm):
    """Returns True if class name ends with a round-suffix digit 1 or 2."""
    return bool(re.search(r" [12]$", norm.strip()))

# ── Date parsing ──────────────────────────────────────────────────────────────
def parse_date_c(s):
    m = DATE_RE.search(str(s))
    if not m:
        return None, None
    d1, d2, mo, yr = m.groups()
    yr = int(yr) if yr else 25
    if yr < 100:
        yr += 2000
    return date(yr, int(mo), int(d1)), date(yr, int(mo), int(d2))

def detect_field_from_date(date_str):
    t = str(date_str)
    if "קאטינג" in t:
        return 2
    return 4   # default = Extreme

# ── Classtype maps (normalized_lower → classtypeid, None = skip) ─────────────
# Filled after Step 0 creates new classtypes.
EXTREME_MAP = {
    "פתוח מוגבל":               36,
    "פתוח התאחדות":              37,
    "youth exca":                38,
    "intermediate exca":         39,
    "עד 18 ירוקי רוכב חדש":    42,
    "עד 18 ירוקי":               43,
    "נוער עד 18 מוגבל":          48,
    "nonpro exca":               49,
    "נונ פרו exca":               49,
    "pro exca":                  50,
    "פרו exca":                   50,
    "נוביס התאחדות":              51,
    "young gun exca":            52,
    "עד 15 ירוקי חדש":           53,
    "עד 15 ירוקי":               54,
    "עד 18":                     55,
    "נוער עד גיל 18":             55,
    "עד 15":                     56,
    "נוער עד גיל 15":             56,
    "נונ פרו 40+":                57,
    "נונ פרו התאחדות":            58,
    "פתוח exca":                  59,
    "open exca":                 59,
    "novice exca":               60,
    "נוביס נונ פרו":              61,
    "עד 12 ירוקי":               62,
    "נונ פרו מוגבל":              47,
    "עד 12":                     44,
    "רוכב ירוקי":                 45,
    "רוכב ירוקי חדש":             46,
    "nonpro super rider&horse":  46,
    # green horse exca → filled after Step 0
    # open super rider&horse → not in map → skipped
    # ride smart exca → skip rows (classtype created in Step 0)
}

CUTTING_MAP = {
    "פתוח":                    18,
    "נונ פרו":                  20,
    "נוביס":                    22,
    "נוביס נונ פרו":            23,
    "נוביס פרימיום":             24,
    "נוביס פרימיום נונ פרו":    25,
    "נונ פרו פלאטינום":          27,
    "קאוהורס נונ פרו":          17,
    "קאו הורס נונ פרו":         17,
    "קאוהורס פתוח":             26,
    "קאו הורס פתוח":            26,
    "נוביס מוגבל":               29,
    "מוגבל ncha":               29,
    "נוער":                     30,
    "קאטינג ירוקי":             34,
    "פתוח ncha":                19,
    "נונ פרו ncha":             21,
    "ncha 2000 limit rider":    28,
    "נוער ncha":                31,
    "עד 18 ירוקי":              32,
    "עד 15 ירוקי":              33,
    "ירוקי 40+":                35,
    "פיטוריטי פתוח":            151,
    "פיטוריטי נונ פרו":         146,
    "פיצ'וריטי פתוח":           151,
    "פיצ'וריטי נונ פרו":        146,
    # ncha דרבי פתוח / נונ פרו → filled after Step 0
}

def resolve_class(norm, field_id):
    """Returns classtypeid or None (=skip this row)."""
    if ends_in_round(norm):
        return None
    key = norm.strip().lower()
    if field_id == 4:
        return EXTREME_MAP.get(key)   # None if not in map → skip
    elif field_id == 2:
        return CUTTING_MAP.get(key)   # None if not in map → skip
    return None

# ── Prize parsing (Cutting only) ──────────────────────────────────────────────
def parse_prize(text):
    if not text or str(text).strip() in ("", "nan"):
        return []
    t = str(text)
    m = re.search(r"(\d+)", t)
    if not m:
        return []
    amount = int(m.group(1))
    if amount == 0:
        return []
    if "ג'קפוט" in t:
        return [(2, amount)]
    if "תלושים" in t or "שובר" in t:
        return [(1, amount)]
    if "כסף מוסף" in t:
        return [(3, amount)]
    return []

# ── Block detection ───────────────────────────────────────────────────────────
def find_blocks(sheet_name, df, block_name_overrides):
    """Returns list of block dicts."""
    blocks = []

    def cell(r, c=0):
        try:
            v = df.iloc[r, c]
            return str(v).strip() if pd.notna(v) else ""
        except Exception:
            return ""

    row0 = cell(0)
    row1 = cell(1)
    row2 = cell(2) if len(df) > 2 else ""

    if DATE_RE.search(row1):
        # Normal: row 0=name, row 1=date, row 2=headers
        comp_name  = row0
        date_str   = row1
        field_id   = detect_field_from_date(date_str)
        hdr_row, data_start = 2, 3
    elif DATE_RE.search(row2):
        # קאטינג 6 style: row 0=name, row 2=date, row 3=headers
        comp_name  = row0
        date_str   = row2
        field_id   = detect_field_from_date(date_str)
        hdr_row, data_start = 3, 4
    else:
        comp_name  = row0
        date_str   = row1
        field_id   = detect_field_from_date(date_str)
        hdr_row, data_start = 2, 3

    start_d, end_d = parse_date_c(date_str)

    # Apply name/field override for block 0
    if (sheet_name, 0) in block_name_overrides:
        comp_name, field_id = block_name_overrides[(sheet_name, 0)]

    # Detect second block mid-sheet
    split_row = None
    for i in range(data_start + 1, len(df) - 1):
        c0 = cell(i)
        if not c0:
            continue
        if DATE_RE.search(c0) and not c0.lower().startswith("מקצה"):
            # Next non-empty row should be headers
            for j in range(i + 1, min(i + 3, len(df))):
                if cell(j) == "מקצה":
                    split_row = (i, j)
                    break
        if split_row:
            break

    data_end_1 = split_row[0] if split_row else len(df)
    blocks.append({
        "sheet": sheet_name, "idx": 0,
        "comp_name": comp_name, "field_id": field_id,
        "date_str": date_str, "start": start_d, "end": end_d,
        "hdr_row": hdr_row, "data_start": data_start, "data_end": data_end_1,
        "df": df,
    })

    if split_row:
        dr_idx, hr_idx = split_row
        date_str2  = cell(dr_idx)
        start_d2, end_d2 = parse_date_c(date_str2)
        field_id2  = detect_field_from_date(date_str2)

        comp_num = re.search(r"קאטינג\s+(\S+)", date_str2)
        comp_name2 = f"תחרות קאטינג {comp_num.group(1)} 2025" if comp_num else f"תחרות קאטינג מ{date_str2}"

        if (sheet_name, 1) in block_name_overrides:
            comp_name2, field_id2 = block_name_overrides[(sheet_name, 1)]

        blocks.append({
            "sheet": sheet_name, "idx": 1,
            "comp_name": comp_name2, "field_id": field_id2,
            "date_str": date_str2, "start": start_d2, "end": end_d2,
            "hdr_row": hr_idx, "data_start": hr_idx + 1, "data_end": len(df),
            "df": df,
        })

    return blocks

def col_of(df, hdr_row, *keywords):
    if hdr_row >= len(df):
        return None
    for i, v in enumerate(df.iloc[hdr_row]):
        if pd.isna(v):
            continue
        vs = str(v).strip()
        for kw in keywords:
            if kw in vs:
                return i
    return None

# ════════════════════════════════════════════════════════════════════════════
# STEP 0  Create new classtypes
# ════════════════════════════════════════════════════════════════════════════
print("STEP 0 — Creating new classtypes")
print("─" * 60)

NEW_CLASSTYPES = [
    # (fieldid, classname, map_key, map_dict_name)
    (2, "NCHA דרבי פתוח",   "ncha דרבי פתוח",   "CUTTING"),
    (2, "NCHA דרבי נונ פרו", "ncha דרבי נונ פרו", "CUTTING"),
    (4, "GREEN HORSE EXCA",  "green horse exca",  "EXTREME"),
    (4, "Ride Smart EXCA",   None,                 None),  # create only, rows skipped
]

existing_all = sb.table("classtype").select("classtypeid, classname").execute().data
existing_lower_map = {r["classname"].strip().lower(): r["classtypeid"] for r in existing_all}

new_types_created = 0
for fid, cname, map_key, map_dict in NEW_CLASSTYPES:
    key = cname.strip().lower()
    if key in existing_lower_map:
        cid = existing_lower_map[key]
        print(f"  ALREADY EXISTS: '{cname}' → id={cid}")
    else:
        try:
            r = sb.table("classtype").insert({"fieldid": fid, "classname": cname}).execute()
            cid = r.data[0]["classtypeid"]
            print(f"  CREATED: '{cname}' → id={cid} (fieldid={fid})")
            new_types_created += 1
        except Exception as e:
            print(f"  ERROR creating '{cname}': {e}")
            cid = None

    if map_key and cid:
        if map_dict == "CUTTING":
            CUTTING_MAP[map_key] = cid
        elif map_dict == "EXTREME":
            EXTREME_MAP[map_key] = cid

print(f"\n  {new_types_created} new classtypes created\n")

# ════════════════════════════════════════════════════════════════════════════
# Load Excel and detect blocks
# ════════════════════════════════════════════════════════════════════════════
print("Loading Excel...")
all_sheets = pd.read_excel(EXCEL, sheet_name=None, header=None, dtype=str)
print(f"  Sheets: {list(all_sheets.keys())}\n")

all_blocks = []
for sheet_name, df in all_sheets.items():
    if df.empty or df.dropna(how="all").empty:
        continue
    blocks = find_blocks(sheet_name, df, COMP_NAME_OVERRIDES)
    all_blocks.extend(blocks)

print("Competition blocks:")
for b in all_blocks:
    fld = {4: "אקסטרים", 2: "קאטינג", 1: "ריינינג"}.get(b["field_id"], "?")
    print(f"  [{b['sheet']}#{b['idx']}]  field={b['field_id']}({fld})  "
          f"{b['comp_name']}  {b['start']}–{b['end']}")
print()

entries_todo = []   # (classincompid, n_entries, cls_dt, comp_id, ranchid)
S = dict(comps_ins=0, comps_skip=0, cls_ins=0, cls_skip=0,
         prizes=0, entries=0, rows_skip=0, new_types=new_types_created, errors=0)

# ════════════════════════════════════════════════════════════════════════════
# STEP 1+2  Competitions + classincompetition
# ════════════════════════════════════════════════════════════════════════════
print("STEP 1+2 — Competitions and Classes")
print("─" * 60)

for b in all_blocks:
    comp_name  = b["comp_name"]
    field_id   = b["field_id"]
    event_start = b["start"]
    event_end   = b["end"]
    sheet_name  = b["sheet"]

    if not event_start:
        print(f"\n  WARNING: no date for '{comp_name}' — skip")
        continue

    print(f"\n  {comp_name}  ({event_start}–{event_end})  fieldid={field_id}")

    # Insert competition
    ex = sb.table("competition").select("competitionid").eq("competitionname", comp_name).execute()
    if ex.data:
        comp_id = ex.data[0]["competitionid"]
        print(f"    SKIP competition (exists id={comp_id})")
        S["comps_skip"] += 1
    else:
        try:
            r = sb.table("competition").insert({
                "hostranchid":           RANCH_ID,
                "fieldid":               field_id,
                "createdbysystemuserid": CREATOR_UID,
                "competitionname":       comp_name,
                "competitionstartdate":  event_start.isoformat(),
                "competitionenddate":    event_end.isoformat(),
                "competitionstatus":     "הסתיימה",
            }).execute()
            comp_id = r.data[0]["competitionid"]
            print(f"    INSERTED competition id={comp_id}")
            S["comps_ins"] += 1
        except Exception as e:
            print(f"    ERROR competition: {e}")
            S["errors"] += 1
            continue

    df         = b["df"]
    hdr_row    = b["hdr_row"]
    data_start = b["data_start"]
    data_end   = b["data_end"]

    ci_name = col_of(df, hdr_row, "מקצה")
    ci_ent  = col_of(df, hdr_row, "מספר כניסות")
    ci_org  = col_of(df, hdr_row, "חווה")
    ci_fed  = col_of(df, hdr_row, "התאחדות")
    if ci_name is None:
        ci_name = 0

    # Prize column: last named header + 1 (Cutting only)
    if field_id == 2:
        hdr = df.iloc[hdr_row]
        last_named = max(
            (i for i in range(len(hdr)) if pd.notna(hdr.iloc[i]) and str(hdr.iloc[i]).strip()),
            default=None
        )
        ci_prize = (last_named + 1) if last_named is not None and (last_named + 1) < len(df.columns) else None
    else:
        ci_prize = None

    def safe_float(v):
        try:
            return float(str(v).strip()) if v not in (None, "") and str(v).strip() not in ("nan",) else 0.0
        except Exception:
            return 0.0

    order = 0
    seen_ctypes  = set()    # for Winter sheet day-boundary detection
    repeat_found = False
    day_off      = 0

    for _, row in df.iloc[data_start:data_end].iterrows():
        raw = row.iloc[ci_name] if ci_name < len(row) else None
        ent = row.iloc[ci_ent]  if ci_ent  is not None and ci_ent  < len(row) else None

        if pd.isna(raw):
            continue
        raw_s = str(raw).strip()

        if should_skip(raw_s, ent, sheet_name):
            S["rows_skip"] += 1
            continue

        norm = normalize(raw_s)
        if not norm:
            continue

        ctype_id = resolve_class(norm, field_id)
        if ctype_id is None:
            S["rows_skip"] += 1
            continue

        # Day-boundary detection (Winter sheet: repeat = new day)
        if ctype_id in seen_ctypes and not repeat_found:
            repeat_found = True
            day_off = 1
        seen_ctypes.add(ctype_id)

        n_entries = int(safe_float(ent)) if ent is not None else 0
        org_cost  = safe_float(row.iloc[ci_org]) if ci_org is not None and ci_org < len(row) else 0.0
        fed_cost  = safe_float(row.iloc[ci_fed]) if ci_fed is not None and ci_fed < len(row) else 0.0

        cls_date = event_start + timedelta(days=day_off)
        cls_dt   = datetime.combine(cls_date, time(9, 0)).replace(tzinfo=TZ)
        date_iso = cls_date.isoformat()
        order   += 1

        # Idempotency check
        ex_cls = (
            sb.table("classincompetition").select("classincompid")
            .eq("competitionid", comp_id)
            .eq("classtypeid",   ctype_id)
            .gte("classdatetime", f"{date_iso}T00:00:00+00:00")
            .lte("classdatetime", f"{date_iso}T23:59:59+00:00")
            .execute()
        )
        if ex_cls.data:
            cic_id = ex_cls.data[0]["classincompid"]
            S["cls_skip"] += 1
            if n_entries > 0:
                ex_e = sb.table("entry").select("entryid").eq("classincompid", cic_id).execute()
                if len(ex_e.data) < n_entries:
                    entries_todo.append((cic_id, n_entries, cls_dt, comp_id, RANCH_ID))
            continue

        try:
            r = sb.table("classincompetition").insert({
                "competitionid":  comp_id,
                "classtypeid":    ctype_id,
                "arenaranchid":   RANCH_ID,
                "arenaid":        ARENA_ID,
                "classdatetime":  cls_dt.isoformat(),
                "organizercost":  org_cost,
                "federationcost": fed_cost,
                "orderinday":     order,
            }).execute()
            cic_id = r.data[0]["classincompid"]
            S["cls_ins"] += 1
            if n_entries > 0:
                entries_todo.append((cic_id, n_entries, cls_dt, comp_id, RANCH_ID))
        except Exception as e:
            print(f"    ERROR class '{norm}': {e}")
            S["errors"] += 1
            continue

        # Prizes (Cutting only)
        if field_id == 2 and ci_prize is not None and ci_prize < len(row):
            annotation = row.iloc[ci_prize]
            for ptype, amount in parse_prize(annotation):
                try:
                    if not sb.table("classprize").select("classincompid").eq("classincompid", cic_id).eq("prizetypeid", ptype).execute().data:
                        sb.table("classprize").insert({"classincompid": cic_id, "prizetypeid": ptype, "prizeamount": amount}).execute()
                        S["prizes"] += 1
                except Exception as e:
                    print(f"    ERROR prize cic={cic_id} type={ptype}: {e}")
                    S["errors"] += 1

print(f"\n  Competitions: {S['comps_ins']} inserted, {S['comps_skip']} skipped")
print(f"  Classes:      {S['cls_ins']} inserted, {S['cls_skip']} skipped")
print(f"  Prizes:       {S['prizes']} inserted")

# ════════════════════════════════════════════════════════════════════════════
# STEP 4  Fabricate entries
# ════════════════════════════════════════════════════════════════════════════
print(f"\nSTEP 4 — Fabricating entries ({len(entries_todo)} classes)")
print("─" * 60)

# Verify counter doesn't collide
r = sb.table("person").select("nationalid").like("nationalid", "000%").order("nationalid", desc=True).limit(1).execute()
max_existing = int(r.data[0]["nationalid"]) if r.data else 0
counter = max(COUNTER_START, max_existing + 1)
print(f"  Starting nationalid: {counter:09d}\n")

for cic_id, n_entries, cls_dt, comp_id, ranchid in entries_todo:
    ex_e    = sb.table("entry").select("entryid").eq("classincompid", cic_id).execute()
    already = len(ex_e.data)

    if already >= n_entries:
        print(f"  SKIP cic={cic_id} ({already}/{n_entries} exist)")
        counter += n_entries
        continue

    to_create = n_entries - already
    start_n   = counter + already

    for i in range(to_create):
        n   = start_n + i
        nat = f"{n:09d}"
        try:
            p = sb.table("person").insert({
                "nationalid": nat, "firstname": "רוכב", "lastname": f"היסטורי {n}",
            }).execute().data[0]
            pid = p["personid"]

            sb.table("federationmember").insert({"federationmemberid": pid, "hasvalidmembership": True}).execute()

            h = sb.table("horse").insert({"ranchid": ranchid, "horsename": f"סוס היסטורי {n}"}).execute().data[0]

            sb.table("systemuser").insert({
                "systemuserid": pid, "username": f"hist_{n}",
                "passwordhash": "placeholder", "passwordsalt": "placeholder", "isactive": False,
            }).execute()

            bill = sb.table("bill").insert({
                "paidbypersonid": pid, "amounttopay": 0,
                "dateopened": cls_dt.isoformat(), "competitionid": comp_id,
            }).execute().data[0]

            sr = sb.table("servicerequest").insert({
                "orderedbysystemuserid": pid, "horseid": h["horseid"],
                "riderfederationmemberid": pid, "billid": bill["billid"],
            }).execute().data[0]

            sb.table("entry").insert({
                "entryid": sr["srequestid"], "classincompid": cic_id, "entrystatus": "Active",
            }).execute()

            S["entries"] += 1

        except Exception as e:
            print(f"  ERROR entry n={nat} cic={cic_id}: {e}")
            S["errors"] += 1

        if S["entries"] > 0 and S["entries"] % 50 == 0:
            print(f"  ... {S['entries']} entries fabricated so far")

    counter += n_entries
    print(f"  cic={cic_id}: {to_create} entries fabricated")

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════
print()
print("=" * 60)
print("INSERTION COMPLETE")
print("=" * 60)
print(f"  Competitions inserted  : {S['comps_ins']}")
print(f"  Classes inserted       : {S['cls_ins']}")
print(f"  Prizes inserted        : {S['prizes']}")
print(f"  Entries fabricated     : {S['entries']}")
print(f"  Rows skipped           : {S['rows_skip']}")
print(f"  New classtypes added   : {S['new_types']}")
print(f"  Errors                 : {S['errors']}")
print("=" * 60)
