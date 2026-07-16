"""
Phase 2 — Full insertion for 2024 historical data.
Confirmed mappings applied from Phase 1 user review.
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

EXCEL      = Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\סיכום תחרויות ריינינג 24.xlsx")
TZ         = ZoneInfo("Asia/Jerusalem")
FIELD_ID   = 1
CREATOR_UID = 2

# ── Competition metadata (user-confirmed) ─────────────────────────────────────
COMP_DATES = {
    "תחרות בוגרים 3+4 - 2024":  {"start": date(2024,  6,  6), "end": date(2024,  6,  8), "ranchid": 11},
    "תחרות בוגרים 5+6 - 2024":  {"start": date(2024,  6, 25), "end": date(2024,  6, 28), "ranchid": 11},
    "תחרות בוגרים 7+8 - 2024":  {"start": date(2024,  9, 25), "end": date(2024,  9, 28), "ranchid": 49},
    "תחרות בוגרים 9+10 - 2024": {"start": date(2024, 10, 23), "end": date(2024, 10, 26), "ranchid": 49},
}

# ── Fetch arenas per ranch ────────────────────────────────────────────────────
print("Fetching arena IDs...")
_arena_cache = {}
for rid in (11, 49):
    r = sb.table("arena").select("arenaid").eq("ranchid", rid).limit(1).execute()
    _arena_cache[rid] = r.data[0]["arenaid"] if r.data else None
    print(f"  ranchid={rid} → arenaid={_arena_cache[rid]}")
print()

# ── Class name normalization ──────────────────────────────────────────────────
def normalize(name):
    if not isinstance(name, str):
        return ""
    name = name.strip()
    if name.startswith("ריינינג "):
        name = name[len("ריינינג "):]
    name = re.sub(r"\s+", " ", name)   # collapse double spaces
    return name.strip()

# ── Extended skip rules ───────────────────────────────────────────────────────
SKIP_STARTS = [
    "פייד טיים", "מקצה לרישום דמי ביטול", 'סה"כ', "סה\"כ",
    "רישום מאוחר", "תאים", "נסורת", "כרטיסים", "זוגות",
    "בוצעה העברה", "זיכויים", "כמות כניסות לקופון",
    # user-confirmed totals rows
    "כמות כניסות", "כמות פייד טיימים",
    "סהכ הכנסות חווה ממקצים", "סהכ הכנסות חווה מפייד טיימים",
]
def should_skip(raw):
    if raw is None: return True
    n = str(raw).strip()
    if not n or n == "מספר": return True
    for s in SKIP_STARTS:
        if n.startswith(s): return True
    try: float(n); return True
    except ValueError: pass
    return False

def is_paid_time(raw):
    return bool(raw) and str(raw).strip().startswith("פייד טיים")

DAY_MAP = {"שני": 1, "שלישי": 2, "רביעי": 3, "חמישי": 4, "שישי": 5, "שבת": 6}
def day_offset(text):
    for d, o in DAY_MAP.items():
        if d in str(text): return o
    return 0

def to_float(v):
    try: return float(str(v).strip()) if v not in (None, "") and str(v).strip() not in ("nan", "") else 0.0
    except: return 0.0

# ════════════════════════════════════════════════════════════════════════════
# STEP 0  Build classtype map — create new classtypes first (idempotent)
# ════════════════════════════════════════════════════════════════════════════
print("STEP 0 — Building classtype map")
print("─" * 64)

# New classtypes to create
NEW_CLASSTYPE_NAMES = [
    "NRHA Open",
    "מטוריטי נונ פרו NRHA",
    "מטוריטי פתוח NRHA",
    "סופר סלייד",
    "IRBC פטוריטי נונ פרו לבני 4",
    "IRBC פטוריטי פתוח לבני 3",
    "L2 IRBC פטוריטי פתוח לבני 3",
    "L4 IRBC פטוריטי פתוח לבני 3",
    "פטוריטי נונ פרו לבני 3 IRBC",
    "פטוריטי נונ פרו לבני 4 IRBC L2",
    "פטוריטי נונ פרו לבני 4 IRBC L4",
    "פטוריטי פתוח לבני 4 NRHA",
]

existing_all = sb.table("classtype").select("classtypeid, classname").execute().data
existing_lower = {r["classname"].strip().lower(): r["classtypeid"] for r in existing_all}

new_type_map = {}   # normalized_lower → classtypeid (for newly created)
new_types_created = 0

for name in NEW_CLASSTYPE_NAMES:
    norm = normalize(name)
    key  = norm.lower()
    if key in existing_lower:
        cid = existing_lower[key]
        print(f"  ALREADY EXISTS: '{norm}' → id={cid}")
        new_type_map[key] = cid
    else:
        try:
            r = sb.table("classtype").insert({"fieldid": FIELD_ID, "classname": norm}).execute()
            cid = r.data[0]["classtypeid"]
            new_type_map[key] = cid
            print(f"  NEW classtype: '{norm}' → id={cid}")
            new_types_created += 1
        except Exception as e:
            print(f"  ERROR creating '{norm}': {e}")

print(f"\n  {new_types_created} new classtypes created\n")

# ── Complete lookup map (normalized_lower → classtypeid) ──────────────────────
# Merge: exact + user corrections + fuzzy approvals + newly created
CLASSTYPE_MAP = {
    # Exact matches from Phase 1
    "פתוח לא מוגבל":                1,
    "ירוקי התאחדות":                2,
    "נוביס התאחדות":                10,
    "נוביס נונ פרו התאחדות":        11,
    "נונ פרו 50+":                   6,
    "נונ פרו nrha":                  141,
    "נונ פרו מוגבל nrha":            142,
    "נונ פרו פריים טיים 40+ nrha":   143,
    "נוביס l1 nrha":                140,
    "נוער 13 nrha":                  16,   # user override (144 is duplicate of 16)
    "נוער unrestricted nrha":        145,
    "פטוריטי נונ פרו nrha":          146,
    "פתוח nrha":                     156,
    "פתוח מוגבל nrha":               157,
    "דרבי נונ פרו l4":               136,
    "דרבי פתוח l4":                  137,
    # User-confirmed corrections
    "ירוקי נוער":                    4,    # from ריינינג ירוקי נוער
    "נוביס נונ פרו":                 11,   # from ריינינג נוביס נונ פרו
    "נונ פרו לבני 50+ התאחדות":      6,    # from ריינינג נונ פרו לבני 50+ התאחדות
    "נוביס - התאחדות":               10,   # from ריינינג נוביס - התאחדות
    "נוער 14-18 nrha":               15,
    # Fuzzy approvals — NRHA word-order variants
    "nrha limited non pro":          13,
    "nrha limited open":             8,
    "nrha non pro":                  12,
    "nrha novice horse l1":          9,
    "nrha prime time non pro":       14,
    "nrha unrestricted youth":       5,
    "nrha youth 13 & under":         16,
    "nrha youth 14-18":              15,
    "nrha open":                     None,  # will be filled from new_type_map below
    # Fuzzy approvals — אליפות and other variants
    "ירוקי התאחדות אליפות":          2,
    "ירוקי נוער התאחדות":            2,
    "ירוקי נוער התאחדות אליפות":     2,
    "דרבי נוביס l1":                 136,
    "דרבי נונ פרו l1":               136,
    "דרבי נונ פרו l2":               136,
    "דרבי נונ פרו nrha l2":          136,
    "דרבי נונ פרו nrha l4":          136,
    "דרבי נונ פרו פריים טיים":       126,
    "דרבי נונ פרו פריים טיים 40+ b2w": 143,
    "דרבי פתוח l2":                  137,
    "דרבי פתוח nrha l2":             137,
    "דרבי פתוח nrha l4":             137,
    "נוביס l1 nrha אליפות":          140,
    "נוביס התאחדות אליפות":          10,
    "נוביס נונ פרו התאחדות אליפות":  11,
    "נונ פרו 50+ אליפות":             6,
    "נונ פרו nrha אליפות":            141,
    "נונ פרו מוגבל nrha אליפות":      142,
    "נונ פרו פריים טיים 40+ nrha אליפות": 143,
    "נוביס - התאחדות":               10,
    "נוביס נונ פרו":                  11,
    "נוער 13 nrha אליפות":            16,
    "נוער 14-18 nrha אליפות":         15,
    "נוער unrestricted nrha אליפות":  145,
    "פתוח nrha אליפות":               156,
    "פתוח בני 4":                     157,
    "פתוח מוגבל nrha אליפות":         157,
}

# Merge new_type_map into CLASSTYPE_MAP
CLASSTYPE_MAP.update(new_type_map)

def resolve(raw):
    norm = normalize(raw)
    key  = norm.lower()
    return CLASSTYPE_MAP.get(key)

# ════════════════════════════════════════════════════════════════════════════
# Load Excel — each sheet is its own competition, no cross-sheet pairing
# ════════════════════════════════════════════════════════════════════════════
print("Loading Excel...")
all_sheets = pd.read_excel(EXCEL, sheet_name=None, header=None, dtype=str)

# Classify sheets
format_a = []   # (sheet_name, df)  — cost sheets, headers at row 1
format_b = []   # (sheet_name, df)  — prize sheets, headers at row 2

for name, df in all_sheets.items():
    if name == "סיכום": continue
    if df.empty or df.dropna(how="all").empty: continue
    if len(df) < 2: continue
    r1 = " ".join(str(c) for c in df.iloc[1].tolist() if pd.notna(c) and str(c).strip())
    r2 = " ".join(str(c) for c in df.iloc[2].tolist() if pd.notna(c) and str(c).strip()) if len(df) > 2 else ""
    if "חווה" in r1 and "התאחדות" in r1:
        format_a.append((name, df))
    elif "שם המקצה" in r2 and "תשלום לפרס" in r2:
        format_b.append((name, df))

print(f"  Format A: {[s for s,_ in format_a]}")
print(f"  Format B: {[s for s,_ in format_b]}\n")

def col_idx(df, hdr_row, *keywords):
    if hdr_row >= len(df): return None
    for i, v in enumerate(df.iloc[hdr_row]):
        if pd.isna(v): continue
        vs = str(v).strip()
        for kw in keywords:
            if kw in vs: return i
    return None

# ── Track entries to fabricate ────────────────────────────────────────────────
entries_todo = []   # (classincompid, n_entries, cls_dt, comp_id, ranchid)
S = dict(comps_ins=0, comps_skip=0, cls_ins=0, cls_skip=0,
         prizes=0, entries=0, rows_skip=0, new_types=new_types_created, errors=0)

# ════════════════════════════════════════════════════════════════════════════
# Process Format B (3+4) — competition with prize data only
# ════════════════════════════════════════════════════════════════════════════
print("STEP 1+2 — Competitions and Classes")
print("─" * 64)

for b_name, b_df in format_b:
    # Get competition name from row 1
    comp_name = None
    for ci in range(min(3, len(b_df.columns))):
        v = b_df.iloc[1, ci] if len(b_df) > 1 else None
        if pd.notna(v) and str(v).strip():
            comp_name = str(v).strip()
            break
    if not comp_name:
        comp_name = f"תחרות בוגרים {b_name} - 2024"

    info = COMP_DATES.get(comp_name)
    if not info:
        print(f"  WARNING: no date/ranch info for '{comp_name}' — skip")
        continue

    event_start = info["start"]
    event_end   = info["end"]
    ranchid     = info["ranchid"]
    arenaid     = _arena_cache[ranchid]

    print(f"\n  [B:{b_name}] {comp_name} ({event_start} – {event_end}) ranch={ranchid}")

    # Insert competition
    ex = sb.table("competition").select("competitionid").eq("competitionname", comp_name).execute()
    if ex.data:
        comp_id = ex.data[0]["competitionid"]
        print(f"    SKIP competition (exists id={comp_id})")
        S["comps_skip"] += 1
    else:
        try:
            r = sb.table("competition").insert({
                "hostranchid": ranchid, "fieldid": FIELD_ID,
                "createdbysystemuserid": CREATOR_UID,
                "competitionname": comp_name,
                "competitionstartdate": event_start.isoformat(),
                "competitionenddate": event_end.isoformat(),
                "competitionstatus": "הסתיימה",
            }).execute()
            comp_id = r.data[0]["competitionid"]
            print(f"    INSERTED competition id={comp_id}")
            S["comps_ins"] += 1
        except Exception as e:
            print(f"    ERROR competition: {e}")
            S["errors"] += 1
            continue

    # Format B: class name, entry count, prize data
    ci_name    = col_idx(b_df, 2, "שם המקצה")
    ci_entries = col_idx(b_df, 2, "מספר כניסות")
    ci_jackpot = col_idx(b_df, 2, "תשלום לפרס")
    ci_fixed   = col_idx(b_df, 2, "פרס כספי")

    if ci_name is None:
        print("    WARNING: no שם המקצה column")
        continue

    # All Format B classes default to day 0 (event start)
    cls_date = event_start
    cls_dt   = datetime.combine(cls_date, time(9, 0)).replace(tzinfo=TZ)
    order    = 0

    prizes_pending = {}   # cic_id → (jackpot, fixed)

    for _, row in b_df.iloc[3:].iterrows():
        raw = row.iloc[ci_name] if ci_name < len(row) else None
        if pd.isna(raw): continue
        raw_s = str(raw).strip()
        if should_skip(raw_s): continue
        norm = normalize(raw_s)
        if not norm: continue

        ctype_id = resolve(raw_s)
        if ctype_id is None:
            print(f"    WARNING: no mapping for '{norm}'")
            S["rows_skip"] += 1
            continue

        n_entries = int(to_float(row.iloc[ci_entries])) if ci_entries is not None and ci_entries < len(row) else 0
        jackpot   = to_float(row.iloc[ci_jackpot]) if ci_jackpot is not None and ci_jackpot < len(row) else 0.0
        fixed     = to_float(row.iloc[ci_fixed])   if ci_fixed   is not None and ci_fixed   < len(row) else 0.0

        date_iso = cls_date.isoformat()
        ex_cls = (
            sb.table("classincompetition").select("classincompid")
            .eq("competitionid", comp_id).eq("classtypeid", ctype_id)
            .gte("classdatetime", f"{date_iso}T00:00:00+00:00")
            .lte("classdatetime", f"{date_iso}T23:59:59+00:00")
            .execute()
        )
        if ex_cls.data:
            cic_id = ex_cls.data[0]["classincompid"]
            S["cls_skip"] += 1
        else:
            order += 1
            try:
                r = sb.table("classincompetition").insert({
                    "competitionid": comp_id, "classtypeid": ctype_id,
                    "arenaranchid": ranchid, "arenaid": arenaid,
                    "classdatetime": cls_dt.isoformat(),
                    "organizercost": None, "federationcost": None,
                    "orderinday": order,
                }).execute()
                cic_id = r.data[0]["classincompid"]
                S["cls_ins"] += 1
            except Exception as e:
                print(f"    ERROR class '{norm}': {e}")
                S["errors"] += 1
                continue

        prizes_pending[cic_id] = (jackpot, fixed)
        if n_entries > 0:
            entries_todo.append((cic_id, n_entries, cls_dt, comp_id, ranchid))

    # Insert prizes for this competition
    for cic_id, (jackpot, fixed) in prizes_pending.items():
        if jackpot > 0:
            try:
                if not sb.table("classprize").select("classincompid").eq("classincompid", cic_id).eq("prizetypeid", 2).execute().data:
                    sb.table("classprize").insert({"classincompid": cic_id, "prizetypeid": 2, "prizeamount": jackpot}).execute()
                    S["prizes"] += 1
            except Exception as e:
                print(f"    ERROR prize jackpot cic={cic_id}: {e}"); S["errors"] += 1
        if fixed > 0:
            try:
                if not sb.table("classprize").select("classincompid").eq("classincompid", cic_id).eq("prizetypeid", 3).execute().data:
                    sb.table("classprize").insert({"classincompid": cic_id, "prizetypeid": 3, "prizeamount": fixed}).execute()
                    S["prizes"] += 1
            except Exception as e:
                print(f"    ERROR prize fixed cic={cic_id}: {e}"); S["errors"] += 1

# ════════════════════════════════════════════════════════════════════════════
# Process Format A sheets (5+6, 7+8, 9+10)
# ════════════════════════════════════════════════════════════════════════════
for a_name, a_df in format_a:
    comp_name_raw = a_df.iloc[0, 0] if pd.notna(a_df.iloc[0, 0]) else a_name
    comp_name     = str(comp_name_raw).strip()

    info = COMP_DATES.get(comp_name)
    if not info:
        print(f"\n  WARNING: no date/ranch info for '{comp_name}' — skip")
        continue

    event_start = info["start"]
    event_end   = info["end"]
    ranchid     = info["ranchid"]
    arenaid     = _arena_cache[ranchid]

    print(f"\n  [A:{a_name}] {comp_name} ({event_start} – {event_end}) ranch={ranchid}")

    # Insert competition
    ex = sb.table("competition").select("competitionid").eq("competitionname", comp_name).execute()
    if ex.data:
        comp_id = ex.data[0]["competitionid"]
        print(f"    SKIP competition (exists id={comp_id})")
        S["comps_skip"] += 1
    else:
        try:
            r = sb.table("competition").insert({
                "hostranchid": ranchid, "fieldid": FIELD_ID,
                "createdbysystemuserid": CREATOR_UID,
                "competitionname": comp_name,
                "competitionstartdate": event_start.isoformat(),
                "competitionenddate": event_end.isoformat(),
                "competitionstatus": "הסתיימה",
            }).execute()
            comp_id = r.data[0]["competitionid"]
            print(f"    INSERTED competition id={comp_id}")
            S["comps_ins"] += 1
        except Exception as e:
            print(f"    ERROR competition: {e}"); S["errors"] += 1; continue

    # Format A: headers at row 1, data at row 2+
    # col 0 = class name, col 1 = מספר כניסות, col 2 = חווה, col 3 = התאחדות
    ci_entries = col_idx(a_df, 1, "מספר כניסות")
    ci_org     = col_idx(a_df, 1, "חווה")
    ci_fed     = col_idx(a_df, 1, "התאחדות")

    cur_off   = 0
    day_order = {}

    for _, row in a_df.iloc[2:].iterrows():
        raw = row.iloc[0] if len(row) > 0 else None
        if pd.isna(raw): continue
        raw_s = str(raw).strip()

        if is_paid_time(raw_s):
            cur_off = day_offset(raw_s)
            continue

        if should_skip(raw_s):
            S["rows_skip"] += 1
            continue

        norm = normalize(raw_s)
        if not norm: continue

        ctype_id = resolve(raw_s)
        if ctype_id is None:
            print(f"    WARNING: no mapping for '{norm}'")
            S["rows_skip"] += 1
            continue

        n_entries = int(to_float(row.iloc[ci_entries])) if ci_entries is not None and ci_entries < len(row) else 0
        org_cost  = to_float(row.iloc[ci_org]) if ci_org is not None and ci_org < len(row) else 0.0
        fed_cost  = to_float(row.iloc[ci_fed]) if ci_fed is not None and ci_fed < len(row) else 0.0

        cls_date = event_start + timedelta(days=cur_off)
        cls_dt   = datetime.combine(cls_date, time(9, 0)).replace(tzinfo=TZ)
        date_iso = cls_date.isoformat()

        day_order[cur_off] = day_order.get(cur_off, 0) + 1
        order = day_order[cur_off]

        ex_cls = (
            sb.table("classincompetition").select("classincompid")
            .eq("competitionid", comp_id).eq("classtypeid", ctype_id)
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
                    entries_todo.append((cic_id, n_entries, cls_dt, comp_id, ranchid))
            continue

        try:
            r = sb.table("classincompetition").insert({
                "competitionid": comp_id, "classtypeid": ctype_id,
                "arenaranchid": ranchid, "arenaid": arenaid,
                "classdatetime": cls_dt.isoformat(),
                "organizercost": org_cost, "federationcost": fed_cost,
                "orderinday": order,
            }).execute()
            cic_id = r.data[0]["classincompid"]
            S["cls_ins"] += 1
            if n_entries > 0:
                entries_todo.append((cic_id, n_entries, cls_dt, comp_id, ranchid))
        except Exception as e:
            print(f"    ERROR class '{norm}': {e}"); S["errors"] += 1

print(f"\n  Competitions: {S['comps_ins']} inserted, {S['comps_skip']} skipped")
print(f"  Classes:      {S['cls_ins']} inserted, {S['cls_skip']} skipped")
print(f"  Prizes:       {S['prizes']} inserted")

# ════════════════════════════════════════════════════════════════════════════
# STEP 4  Fabricate entries
# ════════════════════════════════════════════════════════════════════════════
print(f"\nSTEP 4 — Fabricating entries ({len(entries_todo)} classes)")
print("─" * 64)

# Find next fresh nationalid
r = sb.table("person").select("nationalid").like("nationalid", "000%").order("nationalid", desc=True).limit(1).execute()
counter = int(r.data[0]["nationalid"]) + 1 if r.data else 10000
print(f"  Starting nationalid: {counter:09d}\n")

for cic_id, n_entries, cls_dt, comp_id, ranchid in entries_todo:
    ex_e    = sb.table("entry").select("entryid").eq("classincompid", cic_id).execute()
    already = len(ex_e.data)

    if already >= n_entries:
        print(f"  SKIP cic={cic_id} ({already}/{n_entries} already exist)")
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
print("=" * 64)
print("INSERTION COMPLETE")
print("=" * 64)
print(f"  Competitions inserted  : {S['comps_ins']}")
print(f"  Classes inserted       : {S['cls_ins']}")
print(f"  Prizes inserted        : {S['prizes']}")
print(f"  Entries fabricated     : {S['entries']}")
print(f"  Rows skipped           : {S['rows_skip']}")
print(f"  New classtypes added   : {S['new_types']}")
print(f"  Errors                 : {S['errors']}")
print("=" * 64)
