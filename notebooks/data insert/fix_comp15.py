"""
Fix competitionid=15 (תחרות בוגרים 3+4 - 2024):
  Step 1 — Delete all data for classincompids 419-432 (entries + chain + classincomp)
  Step 2 — Re-insert 28 classes (14/day) and fabricate entries starting at counter=20000
"""
import sys
import subprocess

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for pkg in ("python-dotenv", "supabase"):
    try: __import__(pkg.replace("-", "_"))
    except ImportError: subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

from pathlib import Path
from datetime import datetime, time
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
import os

load_dotenv(Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\.env"))
from supabase import create_client
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

TZ         = ZoneInfo("Asia/Jerusalem")
COMP_ID    = 15
RANCH_ID   = 11
ARENA_ID   = 2
CREATOR_UID = 2
CIC_IDS    = list(range(419, 433))   # 419..432 inclusive

# ════════════════════════════════════════════════════════════════════════════
# STEP 1 — Delete existing data
# ════════════════════════════════════════════════════════════════════════════
print("STEP 1 — Deleting existing data for competition 15")
print("─" * 60)

total_deleted = dict(entries=0, srs=0, bills=0, sysusers=0, horses=0, fms=0, persons=0, prizes=0, cics=0)
errors = 0

for cic_id in CIC_IDS:
    print(f"\n  Processing cic={cic_id}...")

    # Get all entries for this class
    entries = sb.table("entry").select("entryid").eq("classincompid", cic_id).execute().data
    print(f"    {len(entries)} entries to delete")

    for e_row in entries:
        entry_id = e_row["entryid"]   # = srequestid
        try:
            # 1. Get servicerequest details
            sr = sb.table("servicerequest").select("srequestid, billid, horseid, riderfederationmemberid").eq("srequestid", entry_id).execute().data
            if not sr:
                # Delete entry only and continue
                sb.table("entry").delete().eq("entryid", entry_id).execute()
                total_deleted["entries"] += 1
                continue
            sr = sr[0]
            bill_id    = sr["billid"]
            horse_id   = sr["horseid"]
            fm_id      = sr["riderfederationmemberid"]   # = personid

            # 2. Get person via bill (safety check)
            bill_row = sb.table("bill").select("paidbypersonid").eq("billid", bill_id).execute().data
            person_id = bill_row[0]["paidbypersonid"] if bill_row else fm_id

            # Verify it's a historical person
            p_row = sb.table("person").select("personid, lastname").eq("personid", person_id).execute().data
            is_historical = p_row and str(p_row[0]["lastname"]).startswith("היסטורי")

            # 3. Delete in FK order
            sb.table("entry").delete().eq("entryid", entry_id).execute()
            total_deleted["entries"] += 1

            sb.table("servicerequest").delete().eq("srequestid", sr["srequestid"]).execute()
            total_deleted["srs"] += 1

            sb.table("bill").delete().eq("billid", bill_id).execute()
            total_deleted["bills"] += 1

            sb.table("systemuser").delete().eq("systemuserid", person_id).execute()
            total_deleted["sysusers"] += 1

            sb.table("horse").delete().eq("horseid", horse_id).execute()
            total_deleted["horses"] += 1

            sb.table("federationmember").delete().eq("federationmemberid", fm_id).execute()
            total_deleted["fms"] += 1

            if is_historical:
                sb.table("person").delete().eq("personid", person_id).execute()
                total_deleted["persons"] += 1

        except Exception as e:
            print(f"    ERROR deleting entry {entry_id}: {e}")
            errors += 1

    # Delete classprize records
    prizes_del = sb.table("classprize").delete().eq("classincompid", cic_id).execute()
    total_deleted["prizes"] += 1

    # Delete the classincompetition record
    sb.table("classincompetition").delete().eq("classincompid", cic_id).execute()
    total_deleted["cics"] += 1
    print(f"    Deleted cic={cic_id}")

print(f"\n  Deletion complete:")
for k, v in total_deleted.items():
    print(f"    {k}: {v}")
print(f"  Errors: {errors}")

# ════════════════════════════════════════════════════════════════════════════
# STEP 2 — Re-insert classes and fabricate entries
# ════════════════════════════════════════════════════════════════════════════
print("\nSTEP 2 — Re-inserting classes and fabricating entries")
print("─" * 60)

# Class specifications per day
DAY1_CLASSES = [
    # (classtypeid, organizercost, federationcost, entrycount)
    (12,  250, 250, 13),
    (13,  180, 180, 15),
    (8,   200, 200,  8),
    (9,   180, 180,  9),
    (158, 200, 200,  9),
    (14,  180, 180,  7),
    (5,    20,  20,  8),
    (16,   20,  20,  5),
    (15,   20,  20,  6),
    (2,   185, 185, 25),
    (4,    20,  20, 16),
    (10,  185, 185, 15),
    (11,  185, 185,  9),
    (6,   185, 185, 10),
]

DAY2_CLASSES = [
    (12,  250, 250, 17),
    (13,  180, 180,  9),
    (8,   200, 200,  7),
    (9,   240, 240, 10),
    (158, 250, 250,  9),
    (14,  240, 240,  6),
    (5,    20,  20,  0),   # skip entries
    (16,   20,  20,  4),
    (15,   20,  20,  3),
    (2,   195, 195, 26),
    (4,    20,  20, 18),
    (10,  195, 195,  9),
    (11,  195, 195,  7),
    (6,   195, 195,  5),
]

DAYS = [
    (DAY1_CLASSES, datetime(2024, 6, 6, 9, 0, 0, tzinfo=TZ)),
    (DAY2_CLASSES, datetime(2024, 6, 7, 9, 0, 0, tzinfo=TZ)),
]

counter      = 20000
entries_done = 0
cics_done    = 0
ins_errors   = 0

for day_idx, (classes, cls_dt) in enumerate(DAYS, 1):
    print(f"\n  DAY {day_idx} — {cls_dt.date()}")
    for order, (ctype_id, org_cost, fed_cost, n_entries) in enumerate(classes, 1):

        # Insert classincompetition
        try:
            r = sb.table("classincompetition").insert({
                "competitionid":  COMP_ID,
                "classtypeid":    ctype_id,
                "arenaranchid":   RANCH_ID,
                "arenaid":        ARENA_ID,
                "classdatetime":  cls_dt.isoformat(),
                "organizercost":  org_cost,
                "federationcost": fed_cost,
                "orderinday":     order,
            }).execute()
            cic_id = r.data[0]["classincompid"]
            cics_done += 1
        except Exception as e:
            print(f"    ERROR inserting class ctype={ctype_id} day={day_idx}: {e}")
            ins_errors += 1
            counter += n_entries
            continue

        print(f"    cic={cic_id}  ctype={ctype_id}  order={order}  entries={n_entries}")

        if n_entries == 0:
            print(f"      (entrycount=0 — skipping fabrication)")
            continue

        # Fabricate entries
        for i in range(n_entries):
            n   = counter + i
            nat = f"{n:09d}"
            try:
                p = sb.table("person").insert({
                    "nationalid": nat, "firstname": "רוכב", "lastname": f"היסטורי {n}",
                }).execute().data[0]
                pid = p["personid"]

                sb.table("federationmember").insert({"federationmemberid": pid, "hasvalidmembership": True}).execute()

                h = sb.table("horse").insert({"ranchid": RANCH_ID, "horsename": f"סוס היסטורי {n}"}).execute().data[0]

                sb.table("systemuser").insert({
                    "systemuserid": pid, "username": f"hist_{n}",
                    "passwordhash": "placeholder", "passwordsalt": "placeholder", "isactive": False,
                }).execute()

                bill = sb.table("bill").insert({
                    "paidbypersonid": pid, "amounttopay": 0,
                    "dateopened": cls_dt.isoformat(), "competitionid": COMP_ID,
                }).execute().data[0]

                sr = sb.table("servicerequest").insert({
                    "orderedbysystemuserid": pid, "horseid": h["horseid"],
                    "riderfederationmemberid": pid, "billid": bill["billid"],
                }).execute().data[0]

                sb.table("entry").insert({
                    "entryid": sr["srequestid"], "classincompid": cic_id, "entrystatus": "Active",
                }).execute()

                entries_done += 1

            except Exception as e:
                print(f"      ERROR entry n={nat} cic={cic_id}: {e}")
                ins_errors += 1

            if entries_done > 0 and entries_done % 50 == 0:
                print(f"      ... {entries_done} entries fabricated so far")

        counter += n_entries

# ════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════════════════════
print()
print("=" * 60)
print("FIX COMPLETE")
print("=" * 60)
print(f"  Classes re-inserted    : {cics_done}")
print(f"  Entries fabricated     : {entries_done}")
print(f"  Errors                 : {errors + ins_errors}")
print("=" * 60)
