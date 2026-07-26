# Spec 1 kickoff prompt — Shavings order-table & backend follow-through

> Paste the block below into a fresh session. It assumes BMAD + the RideOn skills are installed.

---

/ride-on-system-knowledge
/ride-on-live-db-ops
/bmad-spec

Create a SPEC for **Spec 1 — Shavings order-table & backend follow-through** in the RideOn
equestrian system. This is the backend/DB/worker-mobile spec. The **secretary web page
redesign is a SEPARATE Spec 2 — do NOT design UI here.** Notification push (#31/#46) is out
of scope entirely.

**Read first (verified ground truth, do not re-derive):**
- `_bmad-output/shavings-redesign/shavings-data-layer-map.md` — the full data-layer map,
  §0 status + §5 ratified decisions.
- `_bmad-output/shavings-redesign/recovered-shavings-procs.live.sql` — 9 deployed procs that
  were missing from the repo (pulled verbatim from live 2026-07-23).

**Ratified decisions this spec must implement (owner: Oren, 2026-07-24):**
1. **Kill secretary approval entirely.** It's a proven-zombie stage (deliveries were "approved"
   weeks late or never). Retire `usp_getpendingdeliveryapprovals` + `usp_approvedelivery` and
   their DAL methods (`GetPendingDeliveryApprovals`, `ApproveDelivery`) and the secretary
   approval-queue path. Photos are proof-on-demand, not a gate.
2. **Repurpose two dead columns by NOTE ONLY — NO DB rename, NO DB drop** (hard constraint,
   live table, keep physical names):
   - `shavingsorder.responsetime` → means **"seen by worker"** (worker saw the order and took
     it on). Wire the write: the worker "claim/take" action sets `responsetime = now()`.
   - `shavingsorder.arrivaltime` → means **"delivered at"** — the canonical delivery timestamp
     that DRIVES status. Decouple from the photo.
3. **Decouple delivery from the photo.** `deliveryphotourl`/`deliveryphotodate` become optional
   proof. A delivery must be recordable even if the photo upload fails. Design a no-photo
   "mark delivered" path that stamps `arrivaltime` without a photo, and flags the order as
   *unverified* for the secretary. Keep the photo path primary so the fallback doesn't
   cannibalize proof — decide whether the fallback button ships in v1 or as a fast-follow.
4. **New worker status vocabulary:** `Pending → Seen → Delivered`. Decide the canonical terminal
   `deliverystatus` token (keep `Closed` or switch to `Delivered`) and include the data
   migration for the ~10 existing rows (`WaitingApproval`/`Closed` → terminal).
5. **`usp_savedeliveryphoto`** must stop writing `WaitingApproval` and instead set the terminal
   delivered status + `arrivaltime`.
6. **`usp_getshavingsordersforcompetitionandranch`** stops returning `approvedbypersonid`/
   `approvedat`; add whatever fields Spec 2 needs (`seen`=responsetime, `delivered`=arrivaltime,
   plus creation `prequestdatetime` for SLA).
7. **Repo hygiene:** split `recovered-shavings-procs.live.sql` into one-file-per-proc under
   `RideOnDB/StoredProcedures/PostgreSQL/Individual/` (`NNN_usp_*.sql`), assign NON-colliding
   numbers, and resolve the existing on-disk collisions (two `114_*`, two `115_*`).

**Verified blast radius (from a live pg_proc/pg_views reference scan — trust these):**
- `WaitingApproval` is written ONLY by `usp_savedeliveryphoto`; read by `usp_getpendingdeliveryapprovals`.
- `approvedat`/`approvedbypersonid` referenced ONLY by `usp_approvedelivery` (write) and
  `usp_getshavingsordersforcompetitionandranch` (read).
- `responsetime`: ZERO references anywhere (proc, view, or SP result) — safe to start writing.
- `arrivaltime`: returned (always NULL) by `usp_getworkershavingsorders` +
  `usp_getshavingsordersforworkerbycompetition`; not written anywhere.

**Worker mobile app in scope** (this is where "seen" + delivery live):
`RideOnClient/rideon-client/mobile/src/screens/roles/worker/` — esp.
`components/WorkerShavingsOrderCard.jsx` (current states Pending/WaitingApproval/Closed) and the
worker shavings screens/hooks. Update the state machine to `Pending → Seen → Delivered`, drop the
"ממתין לאישור מזכירה" limbo state, set `seen` on claim, and add the delivered (photo + no-photo) paths.

**Architecture constraints (RideOn):**
- Controllers → BL → DAL → `DBServices.cs` → PostgreSQL stored procedures. Positional dict
  binding in `CreateCommandWithStoredProcedure` (entry order must match SP param order).
  Note: `ShavingsOrderDAL.cs` currently mixes that helper with raw inline `NpgsqlCommand`
  static methods — reconcile toward one convention.
- Live DB owned via Supabase MCP (project `sxplumrexbolpwqacpiz`); every write shown to Oren as
  exact SQL and confirmed before running, then re-read as proof. Repo `.sql` ≠ deployed.
- After any `.cs` change: `dotnet build` in `RideOnServer/`, then grep for call paths that bypass
  the changed logic. Work on a feature branch off `main`.

**Deliverable:** the bmad SPEC kernel + companions for the above — schema/proc changes (as
migrations), DAL/BL/controller changes, worker-app pipeline changes, data migration, and repo
hygiene — with an explicit hand-off list of the fields/reads **Spec 2 (page redesign)** will
consume (SLA source `prequestdatetime`; `seen`=responsetime; `delivered`=arrivaltime; status
vocabulary; the #14/#15 summary procs to reuse).
