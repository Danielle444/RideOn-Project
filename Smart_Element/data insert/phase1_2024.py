"""Phase 1 — Class Name Matching Report for 2024 historical data (corrected format detection)."""
import sys
import subprocess

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for pkg in ("openpyxl", "pandas", "python-dotenv", "supabase"):
    try:
        __import__(pkg.replace("-", "_").split("[")[0])
    except ImportError:
        print(f"Installing {pkg}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

import re
import difflib
from pathlib import Path
from dotenv import load_dotenv
import os
import pandas as pd

load_dotenv(Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\.env"))
from supabase import create_client
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

EXCEL = Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\סיכום תחרויות ריינינג 24.xlsx")
print(f"Loading: {EXCEL.name}\n")

RANCH_MAP = {"סנדורה": 49, "גרין פילדס": 49, "דאבל קיי": 11}

def normalize(name):
    if not isinstance(name, str):
        return ""
    name = name.strip()
    if name.startswith("ריינינג "):
        name = name[len("ריינינג "):]
    return name

# Extended skip list for 2024 (non-class rows that appear at sheet bottom)
SKIP_STARTS = [
    "פייד טיים", "מקצה לרישום דמי ביטול",
    'סה"כ', 'סה"כ', "רישום מאוחר", "תאים", "נסורת", "כרטיסים", "זוגות",
    "בוצעה העברה", "זיכויים", "כמות כניסות לקופון",
]

def should_skip(raw):
    if raw is None:
        return True
    n = str(raw).strip()
    if not n or n == "מספר":
        return True
    for s in SKIP_STARTS:
        if n.startswith(s):
            return True
    try:
        float(n)
        return True
    except ValueError:
        pass
    return False

def is_paid_time(raw):
    return bool(raw) and str(raw).strip().startswith("פייד טיים")

# ── Load all sheets ───────────────────────────────────────────────────────────
all_sheets = pd.read_excel(EXCEL, sheet_name=None, header=None, dtype=str)
print(f"Sheets: {list(all_sheets.keys())}\n")

format_a = []   # (sheet_name, df, header_row_idx, data_start_idx)
format_b = []   # (sheet_name, df)
skipped  = []

for name, df in all_sheets.items():
    if name == "סיכום":
        skipped.append(f"{name} (סיכום)")
        continue
    df_clean = df.dropna(how="all")
    if df_clean.empty:
        skipped.append(f"{name} (empty)")
        continue

    def row_str(idx):
        if idx >= len(df):
            return ""
        return " ".join(str(c) for c in df.iloc[idx].tolist() if pd.notna(c) and str(c).strip())

    r1 = row_str(1)  # 2024-style: headers at row 1
    r2 = row_str(2)  # 2025-style: headers at row 2

    if "חווה" in r1 and "התאחדות" in r1:
        # 2024 Format A: headers at row 1, data at row 2+
        format_a.append((name, df, 1, 2))
    elif "חווה" in r2 and "התאחדות" in r2:
        # 2025 Format A: headers at row 2, data at row 3+
        format_a.append((name, df, 2, 3))
    elif "שם המקצה" in r2 and "תשלום לפרס" in r2:
        format_b.append((name, df))
    else:
        skipped.append(f"{name} (unrecognised)")

print(f"Format A (cost sheets): {[s for s,*_ in format_a]}")
print(f"Format B (prize sheets): {[s for s,_ in format_b]}")
if skipped:
    print(f"Skipped: {skipped}")
print()

def col_index(df, hdr_row, *keywords):
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

def infer_ranch(comp_name):
    for kw, rid in RANCH_MAP.items():
        if kw in str(comp_name):
            return rid, kw
    return None, "UNKNOWN"

# ── Build competition list ────────────────────────────────────────────────────
# Pair by index
competitions = []
for i, (a_name, a_df, a_hdr, a_data) in enumerate(format_a):
    b_entry = (format_b[i][0], format_b[i][1]) if i < len(format_b) else None
    competitions.append({
        "cost_sheet":  (a_name, a_df, a_hdr, a_data),
        "prize_sheet": b_entry,
    })
for j in range(len(format_a), len(format_b)):
    competitions.append({"cost_sheet": None, "prize_sheet": (format_b[j][0], format_b[j][1])})

print(f"Competition pairs: {len(competitions)}\n")

# ── Extract class names + competition metadata ────────────────────────────────
all_raw_names = set()
comp_info     = []

for comp in competitions:
    info = {
        "comp_name": None, "start": None, "end": None,
        "ranchid": None, "ranch_label": None,
        "cost_sheet": None, "prize_sheet": None,
    }

    if comp["cost_sheet"]:
        a_name, a_df, a_hdr, a_data = comp["cost_sheet"]
        info["cost_sheet"] = a_name

        comp_name_raw = a_df.iloc[0, 0] if pd.notna(a_df.iloc[0, 0]) else a_name
        info["comp_name"] = str(comp_name_raw).strip()
        info["ranchid"], info["ranch_label"] = infer_ranch(info["comp_name"])

        # No explicit date row in 2024 format
        # Try to parse dates from comp name (e.g. "5+6 2024" → no specific dates)
        info["start"] = None
        info["end"]   = None

        # Collect class names
        ci_name = 0  # class name always in col 0
        for _, row in a_df.iloc[a_data:].iterrows():
            raw = row.iloc[ci_name] if len(row) > ci_name else None
            if pd.isna(raw):
                continue
            raw_s = str(raw).strip()
            if is_paid_time(raw_s) or should_skip(raw_s):
                continue
            norm = normalize(raw_s)
            if norm:
                all_raw_names.add(raw_s)

    if comp["prize_sheet"]:
        b_name, b_df = comp["prize_sheet"]
        info["prize_sheet"] = b_name

        if not info["comp_name"]:
            title = b_df.iloc[1, 0] if len(b_df) > 1 and pd.notna(b_df.iloc[1, 0]) else b_name
            # Also check col 1 for Format B
            for ci in range(min(3, len(b_df.columns))):
                v = b_df.iloc[1, ci]
                if pd.notna(v) and str(v).strip():
                    title = str(v).strip()
                    break
            info["comp_name"] = str(title).strip()
            info["ranchid"], info["ranch_label"] = infer_ranch(info["comp_name"])

        ci_name = col_index(b_df, 2, "שם המקצה")
        if ci_name is not None:
            for _, row in b_df.iloc[3:].iterrows():
                raw = row.iloc[ci_name] if ci_name < len(row) else None
                if pd.isna(raw):
                    continue
                raw_s = str(raw).strip()
                if should_skip(raw_s):
                    continue
                norm = normalize(raw_s)
                if norm:
                    all_raw_names.add(raw_s)

    comp_info.append(info)

print(f"Unique raw class names across all sheets: {len(all_raw_names)}")
print("All class names found (normalized):")
for r in sorted(all_raw_names):
    n = normalize(r)
    note = f"  <- from '{r}'" if n != r else ""
    print(f"  '{n}'{note}")
print()

# ── Fetch existing classtypes ─────────────────────────────────────────────────
print("Fetching classtypes from Supabase...")
existing    = sb.table("classtype").select("classtypeid, classname, fieldid").execute().data
print(f"Found {len(existing)} existing classtypes\n")
ex_names    = {r["classname"]: r["classtypeid"] for r in existing}
ex_lower    = {r["classname"].lower(): (r["classname"], r["classtypeid"]) for r in existing}
ex_keys     = list(ex_names.keys())

# ── Match ─────────────────────────────────────────────────────────────────────
exact_matches = []
fuzzy_matches = []
no_matches    = []

for raw in sorted(all_raw_names):
    norm = normalize(raw)
    if not norm:
        continue

    # 1. Exact
    if norm in ex_names:
        exact_matches.append((raw, norm, ex_names[norm], ""))
        continue

    # 2. Case-insensitive exact
    if norm.lower() in ex_lower:
        db_name, cid = ex_lower[norm.lower()]
        exact_matches.append((raw, norm, cid, "[ci-exact]"))
        continue

    # 3. Fuzzy
    close = difflib.get_close_matches(norm, ex_keys, n=1, cutoff=0.55)
    if close:
        score = round(difflib.SequenceMatcher(None, norm, close[0]).ratio(), 2)
        fuzzy_matches.append((raw, norm, ex_names[close[0]], close[0], score))
    else:
        no_matches.append((raw, norm))

# ── Print report ──────────────────────────────────────────────────────────────
print("=" * 72)
print("CLASS NAME MATCHING REPORT")
print("=" * 72)

print(f"\n--- EXACT MATCHES ({len(exact_matches)}) ---")
for raw, norm, cid, note in exact_matches:
    prefix = f"(from '{raw}') " if norm != raw else ""
    print(f"  [EXACT]  '{norm}'  {prefix}-> id={cid}  {note}")

print(f"\n--- FUZZY MATCHES ({len(fuzzy_matches)}) ---")
for raw, norm, cid, db_name, score in fuzzy_matches:
    src = f"  <- from '{raw}'" if norm != raw else ""
    print(f"  [FUZZY]  '{norm}'{src}")
    print(f"           -> id={cid}  db='{db_name}'  score={score}")

print(f"\n--- NO MATCH — NEW CLASSTYPES NEEDED ({len(no_matches)}) ---")
for raw, norm in no_matches:
    src = f"  <- from '{raw}'" if norm != raw else ""
    print(f"  [NEW]    '{norm}'{src}")

print()
print("-" * 72)
print(f"  Total unique class names : {len(all_raw_names)}")
print(f"  Exact matches            : {len(exact_matches)}")
print(f"  Fuzzy matches            : {len(fuzzy_matches)}")
print(f"  New (no match)           : {len(no_matches)}")
print("-" * 72)

# ── Ranch assignments ─────────────────────────────────────────────────────────
print("\n--- RANCH ASSIGNMENTS PER COMPETITION ---")
for info in comp_info:
    sheets = []
    if info["cost_sheet"]:  sheets.append(f"A:{info['cost_sheet']}")
    if info["prize_sheet"]: sheets.append(f"B:{info['prize_sheet']}")
    ranch_str = (f"ranchid={info['ranchid']} ({info['ranch_label']})"
                 if info["ranchid"] else "UNKNOWN — needs manual assignment")
    print(f"  [{', '.join(sheets)}]")
    print(f"    name  : {info['comp_name']}")
    print(f"    dates : {info['start']} – {info['end']}" if info["start"] else "    dates : not in sheet — needs manual entry")
    print(f"    ranch : {ranch_str}")
    print()

print("─" * 72)
print("Phase 1 complete. Review and confirm to proceed with Phase 2.")
print("─" * 72)
