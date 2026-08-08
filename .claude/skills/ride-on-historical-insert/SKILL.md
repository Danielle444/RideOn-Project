---
name: ride-on-historical-insert
description: >
  Use this skill whenever inserting historical competition data from an Excel file
  into the RIDE ON Supabase database. Triggers for: "insert historical data",
  "load competition Excel into Supabase", "populate historical competitions",
  or any request to read a competition summary Excel and insert competitions,
  classes, prizes, and fabricated entries into the RIDE ON database.
  Do NOT use for live competition data entry or any other RIDE ON analytics.
---

# RIDE ON — Historical Competition Data Insertion

## Overview

Reads a structured Excel file with historical Reining competition data and inserts
it into the RIDE ON Supabase database. Runs in two phases:
1. **Analysis phase** — parse Excel, detect format, match class names, print report, wait for confirmation
2. **Insertion phase** — insert in FK-safe order after confirmation

---

## Credentials

Always load from `.env` at repo root. Never hardcode.
```python
from dotenv import load_dotenv
import os
from pathlib import Path
load_dotenv(Path(".env"))
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
from supabase import create_client
sb = create_client(SUPABASE_URL, SUPABASE_KEY)
```

---

## Known Ranch Mapping

```python
RANCH_MAP = {
    "סנדורה":   49,   # also known as גרין פילדס
    "גרין פילדס": 49,
    "דאבל קיי":  11,
}
```

Always query the arena table to get the arenaid for each ranch:
```python
arena = sb.table("arena").select("arenaid").eq("ranchid", ranchid).execute().data[0]
```

---

## Sheet Format Detection

The Excel may come in two formats. Detect per sheet by inspecting columns:

### Format A — גיליון format (cost-based)

**Detected by**: column headers include `חווה` AND `התאחדות` AND `סה"כ`

Structure:
- Row 0: competition name (e.g. `תחרות ריינינג 1+2 2025`)
- Row 1: event dates (e.g. `15-18.04.2025`)
- Row 2: column headers

Columns needed:
- Column 0: class name
- `מספר כניסות`: entry count
- `חווה`: organizercost
- `התאחדות`: federationcost
- `סה"כ`: total cost per entry (validation only)

Ranch identification: read from the competition name or ask user if ambiguous.
For `תחרות ריינינג` → use the only ranch available.
For `תחרות בוגרים` → ranch is stated in the סיכום sheet or competition name context.

Prize data: NOT available in Format A sheets — prizes come from the paired
Format B sheet (matched by index order).

### Format B Cost Calculation

Format B sheets do NOT have `חווה`/`התאחדות` cost columns. Derive costs from:
```python
organizercost  = row["קופון ענף"] + row["קופון דרבי"] + row["תשלום לפרס"]
federationcost = row["התאחדות"]
```
These are per-entry amounts, same as the `חווה`/`התאחדות` fields in Format A.
Important: costs may differ between day 1 and day 2 within the same sheet —
always read cost columns per row, never assume uniform costs across days.

### Format B — Federation summary format (prize-based)

**Detected by**: column headers include `שם המקצה` AND `קופון דרבי` AND `תשלום לפרס`

Structure:
- Row 0: blank or title
- Row 1: title (e.g. `תחרות בוגרים 3+4 - 2024`)
- Row 2: column headers

Columns needed:
- `שם המקצה`: class name
- `מספר כניסות`: entry count
- `תשלום לפרס`: jackpot per entry → prizetypeid=2
- `סה"כ פרס כספי למקצה`: fixed prize total → prizetypeid=3

Note: Format B sheets do NOT have `חווה`/`התאחדות` cost columns.
When a sheet is Format B only (no paired Format A), set organizercost=null,
federationcost=null for all classes in that competition.

### Sheet Pairing Logic

```python
all_sheets = pd.read_excel(filepath, sheet_name=None)

format_a = []  # (sheet_name, df) — cost sheets
format_b = []  # (sheet_name, df) — prize/summary sheets
empty    = []  # skip

for name, df in all_sheets.items():
    if name == "סיכום":  # always skip
        continue
    if df.empty or df.dropna(how="all").empty:
        empty.append(name)
        continue
    cols = str(df.iloc[2].tolist())  # header row
    if "חווה" in cols and "התאחדות" in cols:
        format_a.append((name, df))
    elif "שם המקצה" in cols and "תשלום לפרס" in cols:
        format_b.append((name, df))

# Pair by index order
competitions = []
for i, (a_name, a_df) in enumerate(format_a):
    b_df = format_b[i][1] if i < len(format_b) else None
    competitions.append({
        "cost_sheet": (a_name, a_df),
        "prize_sheet": (format_b[i][0], b_df) if b_df is not None else None
    })
# If Format B has no paired Format A (e.g. 2024 sheet 3+4):
for j in range(len(format_a), len(format_b)):
    competitions.append({
        "cost_sheet": None,
        "prize_sheet": format_b[j]
    })
```

---

## Class Name Normalization

Apply these transformations before any matching:
```python
def normalize(name):
    if not isinstance(name, str):
        return ""
    name = name.strip()
    # Strip "ריינינג " prefix — 2024 files prefix class names with the field name
    if name.startswith("ריינינג "):
        name = name[len("ריינינג "):]
    return name
```

---

## Row Skip Rules

Skip a row entirely if the normalized class name meets ANY of the following:
- Starts with `פייד טיים` (paid time slot)
- Is exactly `מספר`
- Starts with `מקצה לרישום דמי ביטול`
- Is null, empty, or whitespace only
- First cell is numeric only (summary/total row)
- Starts with `סה"כ`, `רישום מאוחר`, `תאים`, `נסורת`, `כרטיסים`, `זוגות`

**Do NOT skip** — these are valid competition classes:
- `Junior Riders`, `Young Professional Riders`, `Senior Professional Riders`
- `Young Non-Professional Riders`, `Senior Non-Professional Riders`
- `Prime time Non-Professional Riders`
- `סופר סלייד`, `פתוח בני 4`
- Any Derby/Futurity/Maturity class
- Any class with `אליפות` suffix
- Any other named class not in the explicit skip list

---

## Day Boundary Detection

Rows starting with `פייד טיים` are skipped as classes but used as day markers.
Extract the day name from the row:

```python
DAY_MAP = {
    "שני":   1,   # event_start + 1 day
    "שלישי": 2,
    "רביעי": 3,
    "חמישי": 4,
    "שישי":  5,
    "שבת":   6,
}

def get_day_offset(paid_time_row_name):
    for heb_day, offset in DAY_MAP.items():
        if heb_day in paid_time_row_name:
            return offset
    return 0  # default to event start day
```

Classes between two פייד טיים markers belong to the day of the preceding marker.
First block of classes (before any פייד טיים) → day offset 0 (event start day).

---

## Phase 1 — Analysis: Class Name Matching

```python
import difflib

existing = sb.table("classtype").select("classtypeid, classname, fieldid").execute().data
existing_names = {r["classname"]: r["classtypeid"] for r in existing}

matches = {}
unmatched = []

for raw_name in unique_excel_names:
    norm = normalize(raw_name)
    if not norm:
        continue
    # 1. Exact match
    if norm in existing_names:
        matches[raw_name] = ("EXACT", existing_names[norm], norm)
    # 2. Case-insensitive exact
    elif norm.lower() in {k.lower(): v for k,v in existing_names.items()}:
        matches[raw_name] = ("EXACT_CI", ...)
    # 3. Fuzzy match
    else:
        close = difflib.get_close_matches(norm, existing_names.keys(), n=1, cutoff=0.55)
        if close:
            matches[raw_name] = ("FUZZY", existing_names[close[0]], close[0])
        else:
            unmatched.append(raw_name)
```

Print the full report and wait for confirmation. Example:
```
CLASS NAME MATCHING REPORT
==========================
✅ EXACT:  פתוח לא מוגבל              → classtypeid=1
✅ EXACT:  ירוקי התאחדות (normalized from ריינינג ירוקי התאחדות) → classtypeid=2
⚠️  FUZZY:  נוביס L1 NRHA             → classtypeid=9 [Novice Horse Open Level 1 NRHA, score=0.72]
❌  NEW:    דרבי פתוח NRHA L2         → no match — will create new classtype
❌  NEW:    פטוריטי נונ פרו NRHA       → no match — will create new classtype
❌  NEW:    סופר סלייד                 → no match — will create new classtype

Summary: 12 exact, 3 fuzzy, 5 new classtypes to create
Ranch assignments:
  תחרות ריינינג 1+2 2025  → סנדורה (ranchid=49)
  תחרות בוגרים 5+6 2024   → דאבל קיי (ranchid=11)
  [confirm or correct each]

Proceed with insertion? (yes/no)
```

Wait for user confirmation. Do not insert anything before receiving "yes".

---

## Phase 2 — Insertion Order

### Step 1: New classtypes (if any confirmed by user)

```python
# fieldid=1 for all Reining classes
for name in new_class_names:
    result = sb.table("classtype").insert({
        "fieldid": 1,
        "classname": normalize(name)
    }).execute()
    matches[name] = ("NEW", result.data[0]["classtypeid"], normalize(name))
```

### Step 2: competition

```python
for comp in competitions:
    name = comp["competition_name"]
    existing = sb.table("competition").select("competitionid")
        .eq("competitionname", name).execute().data
    if existing:
        comp["competitionid"] = existing[0]["competitionid"]
        continue
    result = sb.table("competition").insert({
        "hostranchid": comp["ranchid"],
        "fieldid": 1,
        "createdbysystemuserid": <first systemuserid from systemuser table>,
        "competitionname": name,
        "competitionstartdate": comp["start_date"],
        "competitionenddate": comp["end_date"],
        "competitionstatus": "הסתיימה"
    }).execute()
    comp["competitionid"] = result.data[0]["competitionid"]
```

### Step 3: classincompetition

```python
for each class row (after skip + normalization + day boundary):
    # Check for duplicate
    dup = sb.table("classincompetition")
        .select("classincompid")
        .eq("competitionid", competitionid)
        .eq("classtypeid", classtypeid)
        .execute().data
    if dup:
        continue
    result = sb.table("classincompetition").insert({
        "competitionid": competitionid,
        "classtypeid": classtypeid,
        "arenaranchid": ranchid,
        "arenaid": arenaid,
        "classdatetime": event_start + timedelta(days=day_offset),  # 09:00 Asia/Jerusalem
        "organizercost": row.get("חווה"),    # null if Format B only
        "federationcost": row.get("התאחדות"), # null if Format B only
        "orderinday": order_within_day
    }).execute()
    store classincompid with entry count and prize data for steps 4+5
```

### Step 4: classprize

```python
for each class with prize data from Format B sheet:
    if tashluom_lefras > 0:
        sb.table("classprize").insert({
            "classincompid": classincompid,
            "prizetypeid": 2,  # ג'קפוט — per-entry posted amount
            "prizeamount": tashluom_lefras
        }).execute()
    if pras_kaspi > 0:
        sb.table("classprize").insert({
            "classincompid": classincompid,
            "prizetypeid": 3,  # כסף מוסף — total fixed prize
            "prizeamount": pras_kaspi
        }).execute()
```

### Step 5: Fabricated entries

Use a global counter starting at 10000 to avoid collisions with real data.

```python
counter = 10000
for (classincompid, competitionid, ranchid, classdatetime, entrycount):
    if not entrycount or entrycount == 0:
        continue
    for i in range(int(entrycount)):
        n = counter + i
        person = sb.table("person").insert({
            "nationalid": f"{n:09d}",
            "firstname": "רוכב",
            "lastname": f"היסטורי {n}"
        }).execute().data[0]

        sb.table("federationmember").insert({
            "federationmemberid": person["personid"],
            "hasvalidmembership": True
        }).execute()

        horse = sb.table("horse").insert({
            "ranchid": ranchid,
            "horsename": f"סוס היסטורי {n}"
        }).execute().data[0]

        sb.table("systemuser").insert({
            "systemuserid": person["personid"],
            "username": f"hist_{n}",
            "passwordhash": "placeholder",
            "passwordsalt": "placeholder",
            "isactive": False
        }).execute()

        bill = sb.table("bill").insert({
            "paidbypersonid": person["personid"],
            "amounttopay": 0,
            "dateopened": classdatetime,
            "competitionid": competitionid
        }).execute().data[0]

        sr = sb.table("servicerequest").insert({
            "orderedbysystemuserid": person["personid"],
            "horseid": horse["horseid"],
            "riderfederationmemberid": person["personid"],
            "billid": bill["billid"]
        }).execute().data[0]

        sb.table("entry").insert({
            "entryid": sr["srequestid"],
            "classincompid": classincompid,
            "entrystatus": "Active"
        }).execute()

    counter += int(entrycount)
    if counter % 50 == 0:
        print(f"  Progress: {counter - 10000} entries fabricated")
print(f"  ✓ {entrycount} entries for classincompid={classincompid}")
```

---

## Final Summary

```
INSERTION COMPLETE
==================
Competitions inserted : N
Classes inserted      : N
Prizes inserted       : N
Entries fabricated    : N
Skipped rows          : N
New classtypes added  : N
Empty sheets skipped  : N
```

---

## Important Notes

- Always check for existing records before inserting (idempotent — safe to re-run)
- Strip all whitespace AND apply normalize() before any class name matching
- Entry count 0 or null → insert classincompetition but skip entry fabrication
- Use `Asia/Jerusalem` timezone for all datetime values
- If any insert fails, print error with row context and continue — do not abort
- The `סיכום` sheet is always ignored
- Empty sheets are always skipped silently

---

## Format C — Extreme / Cutting Single-Sheet Format

**Detected by**: first data column header is `מקצה` (not unnamed) AND no paired summary sheet.

This format covers:
- Extreme cowboy competitions (`אקסטרים`)
- Cutting competitions (`קאטינג`)
- Mixed sheets containing both in sequence

### Sheet Detection

```python
def detect_format_c(sheet_name, df):
    """Returns True if this is a Format C sheet."""
    # Find header row (row with מקצה)
    for i, row in df.iterrows():
        if "מקצה" in str(row.values):
            return True
    return False
```

### Mixed Sheet Splitting

Some sheets contain two competitions separated by a second title row.
Detect by looking for a row where the first cell matches the pattern
`[competition name] [date]` mid-sheet (not row 0/1).

```python
def split_competitions_in_sheet(df):
    """
    Split a sheet into multiple competition blocks.
    Each block starts with: row 0=name, row 1=date, row 2=headers, row 3+=data.
    Returns list of (competition_name, dates_str, field, data_df) tuples.
    """
    blocks = []
    current_start = 0

    for i in range(1, len(df)):
        cell = str(df.iloc[i, 0]).strip()
        # Detect a new competition header mid-sheet:
        # a non-numeric, non-class-name row followed by a date pattern row
        next_cell = str(df.iloc[i+1, 0]).strip() if i+1 < len(df) else ""
        if (re.search(r'\d{2}[-–]\d{2}\.\d{2}', next_cell) and
                not cell.startswith("פייד טיים") and
                len(cell) > 3):
            blocks.append(df.iloc[current_start:i])
            current_start = i

    blocks.append(df.iloc[current_start:])
    return blocks
```

For each block:
- Row 0: competition name → extract field type from name:
  - Contains `אקסטרים` → fieldid=4
  - Contains `קאטינג` → fieldid=2
  - Contains `ריינינג` → fieldid=1
- Row 1: date string (e.g. `אקסטרים 06-08.03.2025` or `קאטינג 09-10.04.25`)
- Row 2: column headers (`מקצה`, `מספר כניסות`, `חווה`, `התאחדות`, `סה"כ מקצה`, …)
- Row 3+: data rows

### Date Parsing for Format C

```python
import re
from datetime import date

def parse_date_range_c(date_str):
    """
    Parse strings like:
      'אקסטרים 06-08.03.2025'
      'קאטינג 09-10.04.25'
      'אקסטרים חורף 17-18.12.25'
    Returns (start_date, end_date).
    """
    # Extract date portion: DD-DD.MM.YYYY or DD-DD.MM.YY
    m = re.search(r'(\d{1,2})[-–](\d{1,2})\.(\d{2})\.(\d{2,4})', date_str)
    if m:
        day1, day2, month, year = m.groups()
        year = int(year)
        if year < 100:
            year += 2000
        return (date(year, int(month), int(day1)),
                date(year, int(month), int(day2)))
    return None, None
```

### Ranch for Format C

All Extreme and Cutting competitions in this format → ranchid=11 (דאבל קיי)

### Row Skip Rules (Format C additions)

In addition to the existing skip rules, also skip:
- `איבוד כובע` (hat loss penalty)
- `מקצה לביטול/רישום אחרי תחילת תחרות` (late cancellation fee variant)
- `סה"כ תחרות` (competition total row)
- Any row where `מספר כניסות` is negative (refund/penalty rows)
- `רייד סמארט EXCA` / `Ride Smart EXCA` — skip, not a scoreable class

### No Day Boundaries in Format C

Format C has no `פייד טיים` markers. Assign `classdatetime` = competition start date
for all classes. `orderinday` = sequential integer 1, 2, 3… within the competition.

### Prize Parsing for Format C

Extreme classes: **no prizes** — skip prize insertion entirely for fieldid=4.

Cutting classes: prizes appear as free-text annotations in the column after
`סה"כ התאחדות`. Parse as follows:

```python
def parse_prize_annotation(annotation):
    """
    Parse free-text prize annotations. Examples:
      "ג'קפוט 100 ש\"ח"       → prizetypeid=2, amount=100
      "ג'קפוט 250 ש\"ח"       → privetypeid=2, amount=250
      "תלושים 2000 ש\"ח"      → prizetypeid=1, amount=2000
      "כסף מוסף 4000 ש\"ח"    → prizetypeid=3, amount=4000
    Returns list of (prizetypeid, amount) tuples, or [] if no prize.
    """
    if not annotation or str(annotation).strip() in ("", "nan"):
        return []
    prizes = []
    text = str(annotation)
    amount_match = re.search(r'(\d+)', text)
    amount = int(amount_match.group(1)) if amount_match else 0
    if amount == 0:
        return []
    if "ג'קפוט" in text or "jackpot" in text.lower():
        prizes.append((2, amount))
    elif "תלושים" in text or "שובר" in text:
        prizes.append((1, amount))
    elif "כסף מוסף" in text:
        prizes.append((3, amount))
    return prizes
```

### Format C Class Name Normalization

In addition to stripping `ריינינג ` prefix (existing rule), also strip:
- `אקסטרים קאובוי ` prefix
- `אקס' קאובוי ` prefix
- `אקס' קאו' ` prefix

```python
EXTREME_PREFIXES = [
    "אקסטרים קאובוי ",
    "אקס' קאובוי ",
    "אקס' קאו' ",
    "ריינינג ",
]

def normalize(name):
    if not isinstance(name, str):
        return ""
    name = name.strip()
    for prefix in EXTREME_PREFIXES:
        if name.startswith(prefix):
            name = name[len(prefix):]
            break
    return name
```

### Format C Class Name → Classtype Mapping (Extreme, fieldid=4)

Short names used in Excel → classtypeid in DB.
Apply AFTER normalize() strips the prefix.

| Excel name (normalized)               | classtypeid | DB classname |
|---------------------------------------|-------------|---|
| פתוח מוגבל                            | 36 | אקסטרים קאובוי פתוח מוגבל - IEF |
| פתוח התאחדות                          | 37 | אקסטרים קאובוי פתוח  - IEF |
| Youth EXCA                            | 38 | Youth EXCA |
| Intermediate EXCA                     | 39 | Intermediate EXCA |
| עד 18 ירוקי רוכב חדש                  | 42 | אקס' קאובוי עד 18 ירוקי רוכב חדש - IEF |
| עד 18 ירוקי                           | 43 | אקסטרים קאובוי עד 18 ירוקי - IEF |
| נוער עד 18 מוגבל                      | 48 | אקסטרים קאובוי נוער עד 18 מוגבל IEF |
| NONPRO EXCA / נונ פרו EXCA            | 49 | NONPRO EXCA |
| PRO EXCA / פרו EXCA                   | 50 | PRO EXCA |
| נוביס התאחדות                         | 51 | אקסטרים קאובוי נוביס  - IEF |
| Young Gun EXCA                        | 52 | Young Gun EXCA |
| עד 15 ירוקי חדש                       | 53 | אקס' קאובוי עד15 ירוקי רוכב חדש - IEF |
| עד 15 ירוקי                           | 54 | אקסטרים קאובוי עד 15 ירוקי - IEF |
| נוער עד גיל 18 / עד 18                | 55 | אקסטרים קאובוי נוער עד גיל 18 - IEF |
| נוער עד גיל 15 / עד 15                | 56 | אקסטרים קאובוי נוער עד גיל 15 - IEF |
| נונ פרו 40+                           | 57 | אקסטרים קאובוי נונ פרו 40+ - IEF |
| נונ פרו התאחדות                       | 58 | אקסטרים קאובוי נונ פרו  - IEF |
| OPEN EXCA / פתוח EXCA                 | 59 | OPEN EXCA |
| Novice EXCA                           | 60 | Novice EXCA |
| נוביס נונ פרו                         | 61 | אקסטרים קאובוי - נוביס נונ פרו |
| עד 12 ירוקי                           | 62 | אקסטרים קאובוי עד 12 ירוקי - IEF |
| נונ פרו מוגבל                         | 47 | אקסטרים קאובוי נונ פרו מוגבל IEF |
| עד 12                                 | 44 | אקסטרים קאובוי נוער עד גיל 12 IEF |
| רוכב ירוקי                            | 45 | אקסטרים קאובוי רוכב ירוקי - IEF |
| רוכב ירוקי חדש / NONPRO SUPER RIDER&HORSE | 46 | אקס' קאובוי רוכב ירוקי רוכב חדש - IEF |

**Classes to create as NEW (fieldid=4) if not already in DB:**
- `ראנג' סורטינג נונ פרו 1` and `ראנג' סורטינג נונ פרו 2` (Range Sorting rounds)
- `ראנג' סורטינג 1` and `ראנג' סורטינג 2` (Range Sorting open rounds)
- `בינגו נונ פרו`, `בינגו פתוח` (Bingo classes)
- `סורטינג פתוח 1`, `סורטינג פתוח 2` (Sorting open rounds)
- `סורטינג נונ פרו 1`, `סורטינג נונ פרו 2`
- `ללא אוכף נונ פרו`, `ללא אוכף פתוח` (Bareback)
- `מרוץ חביות פתוח`, `מרוץ חביות נונ פרו + נוער` (Barrel racing)
- `ללא מתג נונ פרו`, `ללא מתג פתוח` (Bridleless)
- `פיצ'וריטי פתוח`, `פיצ'וריטי נונ פרו` (Pictuarity EXCA)
- `פריסטייל נוער עד 15`, `פריסטייל פתוח` (Freestyle)
- `OPEN SUPER RIDER&HORSE`, `NONPRO SUPER RIDER&HORSE`
- `GREEN HORSE EXCA`
- `זוגות 1`, `זוגות 2` (Pairs — also used in Reining, check if already exists)

### Format C Cutting Class Mapping

For Cutting classes (fieldid=2) within Format C sheets, use the same
normalization and fuzzy matching as Format A/B. Known mappings:
- `פתוח` → קאטינג פתוח (classtypeid=18)
- `נונ פרו` → קאטינג נונ פרו (classtypeid=20)
- `נוביס` → קאטינג נוביס (classtypeid=22)
- `נוביס נונ פרו` → קאטינג נוביס נונ פרו (classtypeid=23)
- `נוביס פרימיום` → קאטינג נוביס פרימיום (classtypeid=24)
- `נוביס פרימיום נונ פרו` → קאטינג נוביס פרימיום נונ פרו (classtypeid=25)
- `נונ פרו פלאטינום` → קאטינג נונ פרו פלאטינום (classtypeid=27)
- `קאוהורס נונ פרו` / `קאו הורס נונ פרו` → classtypeid=17
- `קאוהורס פתוח` / `קאו הורס פתוח` → classtypeid=26
- `נוביס מוגבל` / `מוגבל NCHA` → קאטינג נונ פרו מוגבל (classtypeid=29)
- `נוער` → קאטינג נוער (classtypeid=30)
- `קאטינג ירוקי` → קאטינג ירוקי בוגרים (classtypeid=34)
- `פתוח NCHA` → קאטינג פתוח NCHA (classtypeid=19)
- `נונ פרו NCHA` → קאטינג נונ פרו NCHA (classtypeid=21)
- `נוביס פרימיום נונ פרו` → classtypeid=25
- `NCHA 2000 Limit Rider` → classtypeid=28
- `נוער NCHA` → קאטינג נוער NCHA (classtypeid=31)
- `עד 18 ירוקי` → קאטינג נוער ירוקי עד 18 (classtypeid=32)
- `עד 15 ירוקי` → קאטינג נוער ירוקי עד 15 (classtypeid=33)
- `ירוקי 40+` → קאטינג ירוקי 40+ (classtypeid=35)
- `NCHA דרבי פתוח`, `NCHA דרבי נונ פרו` → NEW (fieldid=2)
- `נונ פרו ללא רסן ומתג` → NEW (fieldid=2, bridleless non-pro)
- `קאטינג זוגות` → NEW (fieldid=2, cutting pairs)
- `פיטוריטי פתוח`, `פיטוריטי נונ פרו` → same as פטוריטי — map to Futurity classtypes

---

## Format D — All-Around (אולארונד) Excel + PDF Invitation Format

**Triggered when**: processing an אולארונד Excel file alongside PDF invitation files.

### Excel Structure

Format A (same detection rules as גיליון sheets):
- Row 0: competition name (e.g. `תחרות אולאראונד 1 2025`)
- Row 1: event dates (e.g. `20-22.03.2025`)
- Row 2: column headers (`מקצה`, `מספר כניסות`, `חווה`, `התאחדות`, `סה"כ מקצה`, …)
- Columns needed: `מקצה` (class name), `מספר כניסות` (entry count), `חווה` (organizercost), `התאחדות` (federationcost)

fieldid=3 for all All-Around classes.
All competitions → ranchid=11 (דאבל קיי).

### Mixed Sheets

Sheet `אולארונד 4 וקאטינג 2` contains two competitions:
- First block: All-Around 4 (fieldid=3)
- Second block: Cutting 2 (fieldid=2) — detected by header row `קאטינג 2 DD-DD.MM.YY`
  Treat as Format C for the Cutting block (parse prize annotations from extra column).

### Day Boundary Detection (Color-Based)

Days within each competition are separated by **row background color changes** in the
Excel sheet — not by text markers. Use openpyxl to read fill colors and group rows.

Competition dates are in the **top-right corner** of each sheet (not always row 1).
Parse all date values from the header area (rows 0–2, right-side cells) to build
the day list before processing data rows.

```python
from openpyxl import load_workbook
from openpyxl.styles.colors import Color
from datetime import date, timedelta
import re

def get_row_fill_color(ws, row_idx):
    """Return the hex fill color of the first non-empty cell in a row."""
    for cell in ws[row_idx]:
        fill = cell.fill
        if fill and fill.fgColor and fill.fgColor.type == 'rgb':
            return fill.fgColor.rgb  # e.g. 'FFFFC000'
    return None

def extract_dates_from_header(ws):
    """
    Scan top rows and right-side cells for date patterns.
    Returns sorted list of date objects for the competition days.
    """
    dates = []
    date_pattern = re.compile(r'(\d{1,2})[\./](\d{1,2})[\./](\d{2,4})')
    for row in ws.iter_rows(min_row=1, max_row=5):
        for cell in row:
            val = str(cell.value or '')
            for m in date_pattern.finditer(val):
                day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
                if year < 100:
                    year += 2000
                try:
                    dates.append(date(year, month, day))
                except ValueError:
                    pass
    return sorted(set(dates))

def group_rows_by_color(ws, header_rows=3):
    """
    Group data rows by consecutive fill color.
    Returns list of (color, [row_indices]) — one group per day.
    """
    groups = []
    current_color = None
    current_rows = []
    for row in ws.iter_rows(min_row=header_rows + 1):
        row_idx = row[0].row
        color = get_row_fill_color(ws, row_idx)
        if color != current_color:
            if current_rows:
                groups.append((current_color, current_rows))
            current_color = color
            current_rows = [row_idx]
        else:
            current_rows.append(row_idx)
    if current_rows:
        groups.append((current_color, current_rows))
    return groups

# Usage per sheet:
wb = load_workbook(excel_path)
ws = wb[sheet_name]
day_dates = extract_dates_from_header(ws)   # [date(2025,3,20), date(2025,3,21), date(2025,3,22)]
day_groups = group_rows_by_color(ws, header_rows=3)
# day_groups[0] → day 1 rows, day_groups[1] → day 2 rows, etc.
# Zip with day_dates to assign classdatetime per row
for i, (color, row_indices) in enumerate(day_groups):
    comp_date = day_dates[i] if i < len(day_dates) else day_dates[-1]
    classdatetime = datetime(comp_date.year, comp_date.month, comp_date.day,
                             9, 0, 0, tzinfo=ZoneInfo('Asia/Jerusalem'))
    for row_idx in row_indices:
        # process class row with this classdatetime
        ...
```

`orderinday` = sequential 1, 2, 3… within each color group (day).

### Prize Data from PDF Invitations

Prize data is NOT in the Excel. Read from the corresponding PDF invitation file.
PDF files are named: `הזמנה אולארונד N 2025.pdf` (matching competition number).

```python
import pdfplumber, re

def extract_prizes_from_pdf(pdf_path):
    """
    Returns dict: {class_name_normalized: [(prizetypeid, amount), ...]}
    PDF text is RTL extracted as reversed LTR — patterns are reversed.
    """
    prizes = {}
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            lines = text.split('\n')
            for line in lines:
                # Jackpot pattern (reversed RTL): "001 ₪ טופק'ג" or "* * 001 ₪ טופק'ג"
                has_jackpot = bool(re.search(r'001\s*₪\s*טופק', line))
                # Added money pattern: "X,XXX ₪ יפסומ יפסכ סרפ" or "XXX ₪ יפסומ יפסכ סרפ"
                added_money_match = re.search(r'([\d,]+)\s*₪\s*יפסומ יפסכ סרפ', line)
                # Extract class name (last meaningful token in reversed line)
                # Class name appears at end of line in reversed RTL text
                # Strip prize annotations to get class name
                class_part = re.sub(r'[\d,₪\*\s]+טופק.*$', '', line).strip()
                class_part = re.sub(r'[\d,₪\s]*יפסומ יפסכ סרפ.*$', '', class_part).strip()
                if not class_part or len(class_part) < 3:
                    continue
                entry = []
                if has_jackpot:
                    entry.append((2, 100))
                if added_money_match:
                    amount = int(added_money_match.group(1).replace(',', ''))
                    entry.append((3, amount))
                if entry:
                    prizes[class_part] = entry
    return prizes
```

### Prize Lookup by Class Type (All-Around)

Classes that consistently receive jackpot (prizetypeid=2, amount=100) across all competitions:
- טרייל פתוח, טרייל נונ פרו, טרייל פתוח לסוסי נוביס, טרייל ירוקי בוגרים
- האנט סיט אקוויטיישן פתוח, האנטר אנדר סאדל פתוח
- הורסמנשיפ פתוח, הורסמנשיפ ירוקי בוגרים, הורסמנשיפ נונ פרו,
  הורסמנשיפ פתוח לסוסי נוביס
- פלז'ר פתוח, פלז'ר נונ פרו, פלז'ר ירוקי בוגרים, פלז'ר פתוח לסוסי נוביס

Circuit classes — jackpot ₪100 + כסף מוסף ₪2,000:
- הורסמנשיפ סניור - סירקט, הורסמנשיפ ג'וניור - סירקט
- טרייל סירקט, האנטר אנדר סאדל סירקט
- פלז'ר סירקט סניור, פלז'ר סירקט ג'וניור
- הורסמנשיפ שואוטאוט סירקט (winter)

Shootout classes — כסף מוסף ₪8,000 only:
- טרייל שואוטאוט, פלז'ר שואוטאוט, הורסמנשיפ שוטאווט

Winter competition (חורף) — different prize amounts per class.
Parse entirely from the winter PDF; do not apply the standard jackpot/circuit rules.

### Format D Skip Rules

In addition to standard skip rules, also skip:
- `הורסמנשי פתוח` — typo, treat as `הורסמנשיפ פתוח` (classtypeid=88)
- `האנט סיט אקויטיישן` (missing ו) — typo, treat as `האנט סיט אקוויטיישן`
- Any row with `entrycount` = 0 (skip entry fabrication, still insert classincompetition)
