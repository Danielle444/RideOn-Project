# Shavings Data-Layer Map

> **Purpose:** the verified ground-truth map of the shavings data layer — every table,
> column, stored procedure, and consumer — produced as **input to a `bmad-spec` session**
> for the Shavings page redesign (tracker issues #29, #30, #32; #31/#46 split to a
> separate notification-pipeline session).
>
> **Not a spec.** This is the "where everything sits and who uses it" survey so the spec
> is written against reality, not the repo's partial sketch.
>
> **Provenance:** Live DB `sxplumrexbolpwqacpiz`, pulled 2026-07-23 via Supabase MCP
> (`information_schema`, `pg_proc`, `pg_get_functiondef`) + repo read of
> `ShavingsOrderDAL.cs`, worker mobile screens, and `RideOnDB/StoredProcedures/`.
> Each claim below is tagged **[read]** (verified) or **[inferred]** (needs confirmation).

---

## 0. Status — decisions ratified 2026-07-24, split into two specs

This map is now the shared input to **two** `bmad-spec` sessions:

- **Spec 1 — Shavings order-table & backend follow-through.** Everything that reads/writes
  the order (`productrequest` + `shavingsorder` + link) as-is: kill secretary approval,
  document the repurposed timestamp columns, correct the worker pipeline, tidy the DAL/procs.
- **Spec 2 — Shavings page redesign.** The secretary web page (#29 ranch/status grouping,
  #30 SLA highlighting, #32 add-order form), built on the vocabulary Spec 1 establishes.

**Ratified decisions** (see §5 for detail):
1. **Secretary approval — removed entirely.** No gate; photos are proof-on-demand.
2. **`responsetime` → means "seen by worker"** — repurposed by **note only, NO DB rename**
   (keep the physical column name).
3. **`arrivaltime` → means "delivered at"**, decoupled from the photo — repurposed by
   **note only, NO DB rename**. Delivery is recordable without a photo; photo is optional proof.
4. **No column renames and no column drops** on the live table. Repurpose in place, documented.

---

## 1. A shavings order is THREE rows, not one  [read]

There is no single "shavings order" table. One logical order spans three tables sharing a key:

| Table | Role | Key | Notable columns |
|---|---|---|---|
| `productrequest` | **supertype** | `prequestid` (PK) | `prequestdatetime` ⏱️ **(the real creation clock)**, `competitionid`, `orderedbysystemuserid`, `pricecatalogid`, `notes`, `approvaldate` |
| `shavingsorder` | **subtype** | `shavingsorderid` (PK **=** `prequestid`) | `bagquantity`, `requesteddeliverytime`, `workersystemuserid`, `deliverystatus`, `deliveryphotourl`, `deliveryphotodate`, `approvedbypersonid` 🪦, `approvedat` 🪦, `notes`, `responsetime` 🔁→seen, `arrivaltime` 🔁→delivered |
| `shavingsorderforstallbooking` | link (order → stalls) | (`shavingsorderid`, `stallbookingid`) | `bagquantityperstall` |

> **Column semantics after 2026-07-24 ratification** (physical names UNCHANGED — repurposed by note only):
> - `responsetime` 🔁 → **"seen by worker"** (worker saw the order and took it on). Type is
>   `timestamp *without* time zone`; siblings are `with` — a known inconsistency, left as-is per "no DB churn."
> - `arrivaltime` 🔁 → **"delivered at"** — the canonical delivery timestamp that drives status,
>   decoupled from the photo. `deliveryphotourl`/`deliveryphotodate` remain **optional proof**.
> - `approvedbypersonid` / `approvedat` 🪦 → **dead after approval removal**; left in place (no drop), stop reading/writing.

- **Ranch attribution is indirect** [read]: order → `shavingsorderforstallbooking` → `stallbooking` → `stallbooking.ranchid`. There is **no `ranchid` on the order itself.** "Booking ranch" (whose stall) is the attribution the summary procs use.
- **The subtype join is `pr.prequestid = so.shavingsorderid`** [read] — confirmed in SP 113 and every recovered proc.

### Live `deliverystatus` distribution  [read] (10 rows, test data)
| status | n | has `approvedat` | has `deliveryphotodate` |
|---|---|---|---|
| `Pending` | 6 | 0 | 0 |
| `WaitingApproval` | 2 | 0 | 2 |
| `Closed` | 2 | 2 | 2 |

Current pipeline **[read** from `WorkerShavingsOrderCard.jsx` + status labels]:
`Pending (unclaimed)` → *claim (קח טיפול)* → `Pending (mine)` → *photo (צלם ואשר אספקה)* → `WaitingApproval` → *secretary approves* → `Closed`.

---

## 2. The 15 deployed stored procedures  [read: `pg_proc`]

Legend — **Committed?** ✅ has repo `.sql` · ❌ **deployed but NOT in repo** (recovered into `recovered-shavings-procs.live.sql`)

| # | Proc | R/W | Consumer (surface) | Committed? |
|---|---|---|---|---|
| 1 | `usp_getworkershavingsorders` | R | Worker mobile — my orders | ✅ `113_` |
| 2 | `usp_getshavingsordersforworkerbycompetition` | R | Worker mobile — claimable pool | ✅ `114_` |
| 3 | `usp_claimshavingsorder` | W | Worker mobile — claim | ✅ `115_` |
| 4 | `usp_savedeliveryphoto` | W | Worker mobile — upload proof | ✅ `114_` |
| 5 | `usp_getpendingdeliveryapprovals` | R | Secretary — approval queue ⚠️*zombie* | ✅ `115_` |
| 6 | `usp_approvedelivery` | W | Secretary — approve ⚠️*zombie* | ✅ `116_` |
| 7 | `usp_createshavingsorder` | W | Secretary/admin — add order (**#32**) | ❌ |
| 8 | `usp_getshavingsordersforcompetitionandranch` | R | **Current secretary Shavings page** | ❌ |
| 9 | `usp_getshavingsorderdetails` | R | Order detail (per-stall) | ❌ |
| 10 | `usp_getstallbookingsforshavings` | R | Add-order form — pickable stalls (**#32**) | ❌ |
| 11 | `usp_getpayersforshavingsorder` | R | Order detail — payers | ❌ |
| 12 | `usp_getallshavingsorderpayersforcompetitionandranch` | R | Secretary — payers bulk | ❌ |
| 13 | `usp_getallshavingsorderdetailsforcompetitionandranch` | R | Secretary — details bulk | ❌ |
| 14 | `usp_getcompetitionsummaryshavingsdetails` | R | **End-of-comp summary rollup — #29 inspiration** | ❌ |
| 15 | `usp_getcompetitionsummaryshavingsentries` | R | **End-of-comp summary rows — #29 inspiration** | ❌ |

> Consumer column is **[inferred]** from proc names + DAL method names for #7–#15
> (caller chain controller→BL→DAL not yet fully traced); worker rows #1–#4 are **[read]**
> (confirmed against worker screens). Rows #14–#15 power the summary section referenced
> by issue #29 — the redesign should **reuse** these, not reinvent the read.

---

## 3. DAL: two calling conventions in one file  [read: `ShavingsOrderDAL.cs`]

`RideOnServer/DAL/ShavingsOrderDAL.cs` mixes two patterns for the same table:

- **Instance methods** use `CreateCommandWithStoredProcedure(...)` (the positional-dict
  convention CLAUDE.md mandates): `GetWorkerShavingsOrders`, `SaveDeliveryPhoto`,
  `GetPendingDeliveryApprovals`, `ApproveDelivery`.
- **Static methods** use raw `new NpgsqlCommand("SELECT * FROM usp_...")` + `AddWithValue`:
  `GetShavingsOrdersByCompetitionForWorker`, `ClaimShavingsOrder`, `CreateShavingsOrder`,
  `GetStallBookingsForShavings`, `GetShavingsOrdersForCompetitionAndRanch`,
  `GetShavingsOrderDetails`, `GetPayersForShavingsOrder`,
  `GetAllShavingsOrderPayersForCompetitionAndRanch`,
  `GetAllShavingsOrderDetailsForCompetitionAndRanch`.

Both ultimately call SPs, but the inconsistency means the file has two contracts a
maintainer must hold in their head at once.

---

## 4. The mess, itemized (validates "this table is all messed up")

1. **Split identity** [read] — one order = `productrequest` + `shavingsorder` rows; **both carry `notes`**; **two approval timestamps exist** (`productrequest.approvaldate` + `shavingsorder.approvedat`), neither obviously canonical.
2. **Two dead columns** [read] — `shavingsorder.responsetime` & `arrivaltime`: 100% NULL across all rows, populated by nothing. **→ RESOLVED:** repurposed in place (note only) as `seen` and `delivered-at` respectively; not renamed, not dropped.
3. **Zombie approval stage** [read] — `approvedat`/`approvedbypersonid` + procs #5, #6. Data proves it's done weeks late or never (order 38: delivered 2026-04-27, approved 2026-07-11; orders 39/46 delivered but stuck `WaitingApproval` indefinitely). **Product decision (Oren): remove entirely** — photos are proof-on-demand, not a gate.
4. **Two DAL conventions** [read] — see §3.
5. **Repo ≠ deployed** [read] — **9 of 15** deployed procs had no committed `.sql` (now captured in `recovered-shavings-procs.live.sql`). The repo was not a reliable map of the surface.
6. **File-number collisions** [read] — on-disk: two `114_*` (`GetShavingsOrdersForWorkerByCompetition`, `SaveDeliveryPhoto`) and two `115_*` (`ClaimShavingsOrder`, `GetPendingDeliveryApprovals`).
7. **Param-name & join inconsistencies** [read] — proc #13 uses `competitionid_param`/`ranchid_param` vs the `p_` convention everywhere else; proc #9 `INNER JOIN horse` vs proc #13 `LEFT JOIN horse` (a tack/no-horse stall is dropped by #9, kept by #13).

---

## 5. Resolved decisions (ratified 2026-07-24)

**Owner:** Oren. **Ground rule applied throughout: no column renames, no column drops on the
live table — repurpose in place, documented.**

1. **"Seen by worker" signal → RESOLVED.** Reuse `shavingsorder.responsetime` to mean *seen*
   (worker saw the order and took it on). **No rename** — documented by note. Known caveat:
   it is `timestamp without time zone` while lifecycle siblings are `with`; left as-is.
2. **Approval removal → RESOLVED (hard-remove the stage, phased by risk).**
   - Behavior (Spec 1): `usp_savedeliveryphoto` stops writing `WaitingApproval`; retire
     `usp_getpendingdeliveryapprovals` (#5) + `usp_approvedelivery` (#6) and their DAL methods +
     the secretary approval-queue screen; migrate the 4 existing `WaitingApproval`/`Closed` rows
     to the terminal status.
   - `approvedat` / `approvedbypersonid`: **left in place, no drop** (per ground rule); stop
     reading/writing them. `usp_getshavingsordersforcompetitionandranch` stops returning them.
3. **Delivery model → RESOLVED (decouple from photo).** Reuse `shavingsorder.arrivaltime` to
   mean *delivered-at* — the canonical timestamp that drives status. **No rename.**
   `deliveryphotourl`/`deliveryphotodate` become **optional proof.** A delivery is always
   recordable even if the photo upload fails. **Open (v1 vs fast-follow):** the no-photo
   "mark delivered" button + an *unverified* flag on the secretary view (Sally/Amelia: keep the
   photo path primary so the fallback doesn't cannibalize proof).
4. **New status vocabulary → for Spec 1 to finalize.** Target shape `Pending → Seen → Delivered`.
   Micro-decision: keep terminal token `Closed` or rename value to `Delivered` (a 4-row data
   migration either way — *value* migration, not a column change).
5. **#30 SLA clock → RESOLVED, no new column.** Start from `productrequest.prequestdatetime`
   [read, populated on all rows]. Two rules: unclaimed > 3h since create; seen-but-undelivered
   > 3h since `responsetime`(seen). *(Spec 2 surfaces it; Spec 1 exposes the fields.)*
6. **#29 read strategy → RESOLVED: reuse procs #14/#15** (`usp_getcompetitionsummaryshavings*`)
   as the live-page foundation — they already group by booking ranch and roll up bags/payment.
7. **#32 add-order → plumbing largely exists.** `usp_createshavingsorder` already takes
   `@ranchId` + `@stalls` jsonb; `usp_getstallbookingsforshavings` feeds the picker. Spec 2
   confirms the secretary controller/BL path + required-ranch UX.
8. **Repo hygiene (Spec 1 tail).** Split `recovered-shavings-procs.live.sql` into `NNN_usp_*.sql`
   under `RideOnDB/StoredProcedures/PostgreSQL/Individual/` with non-colliding numbers; resolve
   the existing 114/115 collisions.

---

## 6. Artifacts in this folder
- `shavings-data-layer-map.md` — this file.
- `recovered-shavings-procs.live.sql` — the 9 previously-uncommitted procs, pulled verbatim from live.
- `spec-1-prompt.md` — ready-to-paste kickoff prompt for the **Spec 1** (`bmad-spec`) session.

## 7. Related / out of scope
- **#31 + #46 notification pipeline** — separate session/branch off `main` (shared infra;
  no transport exists — `Notification.cs` is a bare POCO). A ready-to-paste scope prompt was
  drafted in the party session; the two shavings tracks and the notification track both touch
  the worker mobile app, so coordinate.
