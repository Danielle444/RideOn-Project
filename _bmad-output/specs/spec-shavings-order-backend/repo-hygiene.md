# Repo Hygiene — Split & Renumber Shavings Procs (CAP-11)

Target folder: `RideOnDB/StoredProcedures/PostgreSQL/Individual/`.

## Current on-disk state (the mess)

```
113_usp_GetWorkerShavingsOrders.sql
114_usp_GetShavingsOrdersForWorkerByCompetition.sql   ← 114 collision
114_usp_SaveDeliveryPhoto.sql                          ← 114 collision
115_usp_ClaimShavingsOrder.sql                         ← 115 collision
115_usp_GetPendingDeliveryApprovals.sql                ← 115 collision (RETIRED)
116_usp_ApproveDelivery.sql                            ← (RETIRED)
```
Plus **9 recovered procs with no repo file** (in `recovered-shavings-procs.live.sql`).
Highest number currently used on disk: **167** → next free block starts at **168**.

## Actions

### 1. Delete the retired procs' files (CAP-1)
- `115_usp_GetPendingDeliveryApprovals.sql` → delete. (Resolves the 115 collision — `ClaimShavingsOrder` remains alone at 115.)
- `116_usp_ApproveDelivery.sql` → delete.

### 2. Resolve the 114 collision
- Keep `114_usp_GetShavingsOrdersForWorkerByCompetition.sql` at 114 (modified by M6 — add `ResponseTime`).
- **Renumber** `114_usp_SaveDeliveryPhoto.sql` → `168_usp_SaveDeliveryPhoto.sql` (modified by M2). Delete the old-numbered file.

### 3. Split the 9 recovered procs one-file-per-proc
From `recovered-shavings-procs.live.sql`, verbatim (except where a migration modifies it):

| New file | Proc | Note |
|---|---|---|
| `169_usp_CreateShavingsOrder.sql` | `usp_createshavingsorder` | verbatim (unchanged) |
| `170_usp_GetAllShavingsOrderDetailsForCompetitionAndRanch.sql` | `usp_getallshavingsorderdetailsforcompetitionandranch` | verbatim |
| `171_usp_GetAllShavingsOrderPayersForCompetitionAndRanch.sql` | `usp_getallshavingsorderpayersforcompetitionandranch` | verbatim |
| `172_usp_GetCompetitionSummaryShavingsDetails.sql` | `usp_getcompetitionsummaryshavingsdetails` | verbatim (Spec 2 #29 reuse) |
| `173_usp_GetCompetitionSummaryShavingsEntries.sql` | `usp_getcompetitionsummaryshavingsentries` | verbatim (Spec 2 #29 reuse) |
| `174_usp_GetPayersForShavingsOrder.sql` | `usp_getpayersforshavingsorder` | verbatim |
| `175_usp_GetShavingsOrderDetails.sql` | `usp_getshavingsorderdetails` | verbatim |
| `176_usp_GetShavingsOrdersForCompetitionAndRanch.sql` | `usp_getshavingsordersforcompetitionandranch` | **M4 body** (approval fields dropped, lifecycle fields added) |
| `177_usp_GetStallBookingsForShavings.sql` | `usp_getstallbookingsforshavings` | verbatim |

### 4. New proc file (CAP-4)
- `178_usp_MarkDelivered.sql` — the M3 body.

## Final state

- No duplicate numbers; two retired files deleted; `SaveDeliveryPhoto` off 114.
- Every deployed shavings proc has exactly one committed `.sql` matching live.

## Guardrails
- **Numbers are cheap but must be reconciled at apply time** — re-list the folder before assigning; if 168+ is no longer free (another branch landed procs), shift the block. The *mapping* above is the intent; the *exact integers* are confirmed against the folder when the work runs.
- **Repo `.sql` must match live character-for-character** for the verbatim procs — fetch each with `pg_get_functiondef` and diff rather than trusting the recovered file blindly (CLAUDE.md proc-rule 2b). The recovered file was pulled 2026-07-23; re-confirm nothing drifted since.
- Filenames use the existing repo casing convention (`usp_PascalCase`), even though live proc names are lowercase.
