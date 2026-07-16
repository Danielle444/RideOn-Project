"""
Phase 2 Final Fill — creates the last 4 missing entries using genuinely fresh nationalids.
Hardcoded targets from the scan: cic=334 (1), cic=348 (2), cic=395 (1).
"""
import sys, subprocess
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for pkg in ("python-dotenv", "supabase"):
    try: __import__(pkg.replace("-", "_"))
    except ImportError: subprocess.check_call([sys.executable, "-m", "pip", "install", pkg, "-q"])

from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from dotenv import load_dotenv
import os

load_dotenv(Path(r"C:\Users\oren ahuvia\Documents\GitHub\RideOn-Project\.env"))
from supabase import create_client
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])

HOST_RANCH_ID = 11
TZ = ZoneInfo("Asia/Jerusalem")

# ── Find next fresh nationalid (true max via ORDER BY) ───────────────────────
r = sb.table("person").select("nationalid").like("nationalid", "000%").order("nationalid", desc=True).limit(1).execute()
start = int(r.data[0]["nationalid"]) + 1 if r.data else 10000
print(f"Starting fresh nationalid: {start:09d}")

# ── Fetch classincompetition info for our 3 targets ──────────────────────────
targets = []
for cic_id in [334, 348, 395]:
    cic_r = sb.table("classincompetition").select(
        "classincompid, classdatetime, competitionid"
    ).eq("classincompid", cic_id).execute()
    if not cic_r.data:
        print(f"  cic={cic_id} not found — skip")
        continue
    row = cic_r.data[0]

    # Check shortfall
    have = len(sb.table("entry").select("entryid").eq("classincompid", cic_id).execute().data)
    # Get expected from Excel count embedded in the prior scan
    expected = {334: 19, 348: 8, 395: 7}[cic_id]
    shortfall = expected - have
    if shortfall <= 0:
        print(f"  cic={cic_id}: already complete ({have}/{expected})")
        continue
    targets.append((cic_id, shortfall, row["classdatetime"], row["competitionid"]))
    print(f"  cic={cic_id}: need {shortfall} more entries (have {have}/{expected})")

print()

counter = start
total = 0; errors = 0

for cic_id, shortfall, cls_dt_str, comp_id in targets:
    for i in range(shortfall):
        n = counter + i
        nat = f"{n:09d}"
        try:
            p = sb.table("person").insert({
                "nationalid": nat, "firstname": "רוכב", "lastname": f"היסטורי {n}",
            }).execute().data[0]
            pid = p["personid"]

            sb.table("federationmember").insert({
                "federationmemberid": pid, "hasvalidmembership": True,
            }).execute()

            h = sb.table("horse").insert({
                "ranchid": HOST_RANCH_ID, "horsename": f"סוס היסטורי {n}",
            }).execute().data[0]

            sb.table("systemuser").insert({
                "systemuserid": pid, "username": f"hist_{n}",
                "passwordhash": "placeholder", "passwordsalt": "placeholder", "isactive": False,
            }).execute()

            bill = sb.table("bill").insert({
                "paidbypersonid": pid, "amounttopay": 0,
                "dateopened": cls_dt_str, "competitionid": comp_id,
            }).execute().data[0]

            sr = sb.table("servicerequest").insert({
                "orderedbysystemuserid": pid, "horseid": h["horseid"],
                "riderfederationmemberid": pid, "billid": bill["billid"],
            }).execute().data[0]

            sb.table("entry").insert({
                "entryid": sr["srequestid"], "classincompid": cic_id, "entrystatus": "Active",
            }).execute()

            total += 1
            print(f"  ✓ entry for cic={cic_id} nationalid={nat}")

        except Exception as e:
            print(f"  ERROR cic={cic_id} n={nat}: {e}")
            errors += 1

    counter += shortfall

print()
print("=" * 50)
print(f"  Entries fabricated : {total}")
print(f"  Errors             : {errors}")
print("=" * 50)

# ── Final verification ───────────────────────────────────────────────────────
print("\nFinal entry counts:")
for cic_id in [334, 348, 395]:
    have = len(sb.table("entry").select("entryid").eq("classincompid", cic_id).execute().data)
    expected = {334: 19, 348: 8, 395: 7}[cic_id]
    status = "OK" if have == expected else f"STILL SHORT ({have}/{expected})"
    print(f"  cic={cic_id}: {have}/{expected} — {status}")
