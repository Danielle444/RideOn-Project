# Change Set — Spec 1 (Shavings order-table & backend follow-through)

The concrete, file-by-file / proc-by-proc contract for the capabilities in `SPEC.md`.
Every SQL block is a **migration draft** — verify the live signature first, show Oren the
exact SQL, apply via Supabase MCP (`apply_migration`, project `sxplumrexbolpwqacpiz`),
re-read as proof, and commit the matching repo `.sql` file.

Column semantics (physical names UNCHANGED, repurposed by note): `responsetime` = *seen by
worker*; `arrivaltime` = *delivered-at* (drives status); `deliveryphotourl`/`deliveryphotodate`
= *optional proof*; `approvedbypersonid`/`approvedat` = *dead, left in place, never touched again*.

**Backward-compatible token model (resolved 2026-07-24):** stored `deliverystatus` carries only
`{Pending, Delivered}`. `Seen` is a **derived** state (`workersystemuserid IS NOT NULL AND
arrivaltime IS NULL`; `responsetime` is its clock), never a stored token. This keeps installed
old apps working (they branch on `deliveryStatus === 'Pending'`), so the mobile release needs no
hard ordering gate.

---

## A. Database migrations (ordered)

> One SEQUENCING gate remains (server-side): CAP-7's read-proc column removal (M4) must deploy
> **with** the backend, never ahead of it. The mobile side has **no** hard gate — the token model
> is backward-compatible by design (see header). Group M1/M2/M3/M8 with the mobile release for a
> clean UX, but installed old apps stay functional if the app lags.

### M1 — `usp_claimshavingsorder`: claim stamps *seen*, keeps status Pending (CAP-2, CAP-5)
Return type unchanged (`integer`) → `CREATE OR REPLACE` is safe. Preserve the atomic
`workersystemuserid IS NULL` guard and the `ROW_COUNT` return (the DAL treats `>0` as "claimed").
**Do NOT write a `Seen` token** — leaving `deliverystatus = 'Pending'` is what keeps installed
old apps able to deliver.

```sql
CREATE OR REPLACE FUNCTION usp_ClaimShavingsOrder(
    p_ShavingsOrderId    INTEGER,
    p_WorkerSystemUserId INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public.shavingsorder
    SET workersystemuserid = p_WorkerSystemUserId,
        responsetime       = now()           -- "seen by worker" clock; deliverystatus untouched (stays 'Pending')
    WHERE shavingsorderid = p_ShavingsOrderId
      AND workersystemuserid IS NULL;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$;
```
> Note: `responsetime` is `timestamp without time zone`; `now()` assigns fine. The tz
> inconsistency vs siblings is knowingly left as-is (no-DB-churn rule).

### M2 — `usp_savedeliveryphoto`: record a verified delivery, not `WaitingApproval` (CAP-3, CAP-6)
Return type unchanged (`void`) → `CREATE OR REPLACE` safe. `COALESCE(arrivaltime, now())` means
a photo arriving *after* a no-photo `usp_markdelivered` promotes the row to verified without
moving the delivery clock.

```sql
CREATE OR REPLACE FUNCTION usp_SaveDeliveryPhoto(
    p_ShavingsOrderId   INTEGER,
    p_DeliveryPhotoUrl  TEXT,
    p_DeliveryPhotoDate TIMESTAMP WITH TIME ZONE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.shavingsorder
    SET deliveryphotourl  = p_DeliveryPhotoUrl,
        deliveryphotodate = p_DeliveryPhotoDate,
        arrivaltime       = COALESCE(arrivaltime, now()),  -- delivered-at (idempotent)
        deliverystatus    = 'Delivered'
    WHERE shavingsorderid = p_ShavingsOrderId;
END;
$$;
```

### M3 — NEW `usp_markdelivered`: no-photo delivery path (CAP-4)
Records delivery WITHOUT touching the photo columns; the "unverified" state is *derived*
(`arrivaltime IS NOT NULL AND deliveryphotourl IS NULL`) — no new column. Returns rows-affected
so the backend can distinguish "recorded" from "no such open order".

```sql
CREATE OR REPLACE FUNCTION usp_MarkDelivered(
    p_ShavingsOrderId INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE public.shavingsorder
    SET arrivaltime    = COALESCE(arrivaltime, now()),
        deliverystatus = 'Delivered'
    WHERE shavingsorderid = p_ShavingsOrderId
      AND arrivaltime IS NULL;          -- idempotent; don't re-stamp an already-delivered order

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
    RETURN v_rows_affected;
END;
$$;
```

### M4 — `usp_getshavingsordersforcompetitionandranch`: drop approval fields, add lifecycle fields (CAP-7)
Return-type change → **`DROP FUNCTION` + `CREATE`** in one migration. Start from the
verbatim-live body in `recovered-shavings-procs.live.sql` (proc #8); remove the two
`approvedby*`/`approvedat` output columns and their SELECT items; append `Seen`, `Delivered`,
`PrequestDatetime` LAST. **Ships with the backend deploy** (deployed DAL reads the removed
columns by name).

```sql
DROP FUNCTION IF EXISTS public.usp_getshavingsordersforcompetitionandranch(integer, integer);

CREATE OR REPLACE FUNCTION public.usp_getshavingsordersforcompetitionandranch(
    p_competitionid integer,
    p_ranchid integer
)
 RETURNS TABLE(
    "ShavingsOrderId" integer,
    "RequestedDeliveryTime" timestamp without time zone,
    "BagQuantity" smallint,
    "DeliveryStatus" character varying,
    "Notes" character varying,
    "WorkerSystemUserId" integer,
    "OrderedByName" text,
    "PriceCatalogId" integer,
    "ItemPrice" numeric,
    "TotalAmount" numeric,
    "Seen" timestamp without time zone,             -- responsetime
    "Delivered" timestamp without time zone,        -- arrivaltime
    "PrequestDatetime" timestamp with time zone     -- SLA source (pr.prequestdatetime)
 )
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        so.shavingsorderid,
        so.requesteddeliverytime,
        so.bagquantity,
        so.deliverystatus,
        so.notes,
        so.workersystemuserid,
        CONCAT(p.firstname, ' ', p.lastname) AS orderedbyname,
        pr.pricecatalogid,
        pc.itemprice,
        COALESCE(bpr_total.totalamount, 0) AS totalamount,
        so.responsetime AS "Seen",
        so.arrivaltime  AS "Delivered",
        pr.prequestdatetime AS "PrequestDatetime"
    FROM shavingsorder so
    INNER JOIN productrequest pr ON pr.prequestid = so.shavingsorderid
    INNER JOIN pricecatalog pc  ON pc.pricecatalogid = pr.pricecatalogid
    INNER JOIN systemuser su    ON su.systemuserid = pr.orderedbysystemuserid
    INNER JOIN person p         ON p.personid = su.systemuserid
    INNER JOIN shavingsorderforstallbooking sosb ON sosb.shavingsorderid = so.shavingsorderid
    INNER JOIN stallbooking sb  ON sb.stallbookingid = sosb.stallbookingid
    LEFT JOIN (
        SELECT bpr.prequestid, SUM(bpr.amounttopay) AS totalamount
        FROM billproductrequest bpr
        GROUP BY bpr.prequestid
    ) bpr_total ON bpr_total.prequestid = pr.prequestid
    WHERE pr.competitionid = p_competitionid
      AND sb.ranchid = p_ranchid
    ORDER BY so.requesteddeliverytime DESC;
END;
$function$;
```
> `prequestdatetime` verified populated on all rows [map §5.5]. Confirm its live type with
> `pg_get_functiondef`/`\d productrequest` before finalizing the declared output type.

### M5 — `usp_getworkershavingsorders` (113): add trailing `ResponseTime` (CAP-8)
Return-type change → `DROP FUNCTION` + `CREATE`. Take the committed repo body (matches live),
add `"ResponseTime" TIMESTAMP WITHOUT TIME ZONE` as the LAST output column and `so.responsetime`
as the last SELECT item. Backward-compatible: the deployed DAL reads by name and ignores the extra column.

### M6 — `usp_getshavingsordersforworkerbycompetition` (114): add trailing `ResponseTime` (CAP-8)
Same treatment as M5 on the sibling proc (its committed body already returns `ArrivalTime`).

### M7 — Retire approval procs (CAP-1)
```sql
DROP FUNCTION IF EXISTS public.usp_getpendingdeliveryapprovals(integer);
DROP FUNCTION IF EXISTS public.usp_approvedelivery(integer, integer, timestamp with time zone);
```
> Verify the exact live argument signatures first; adjust the `DROP` arg lists to match.

### M8 — Data migration of existing rows (CAP-5)
Verified live distribution [map §1]: `Pending` 6, `WaitingApproval` 2 (both have photodate),
`Closed` 2 (both have photodate + approvedat).

```sql
-- Terminal rows -> Delivered, backfill the delivery clock from the photo date where present.
UPDATE public.shavingsorder
SET deliverystatus = 'Delivered',
    arrivaltime    = COALESCE(arrivaltime, deliveryphotodate::timestamp)
WHERE deliverystatus IN ('WaitingApproval', 'Closed');
```
> Claimed-but-undelivered `Pending` rows are **left as `Pending`** — they read as `Seen` in the
> derived view because `workersystemuserid` is set; `responsetime` stays NULL (resolved: no legacy
> backfill). Run read-first SELECTs, show Oren the exact rows, then apply. `approvedbypersonid`/
> `approvedat` are deliberately NOT cleared (no-DB-churn; they just stop being read).

---

## B. Backend (Controllers → BL → DAL)

### Remove (CAP-1)
- **Controller** `ShavingsOrdersController.cs`: delete `GetPendingApprovals` (`[HttpGet("pending-approvals")]`) and `ApproveDelivery` (`[HttpPost("approve-delivery")]`).
- **BL** `ShavingsOrder.cs`: delete `GetPendingDeliveryApprovals` and `ApproveDelivery`; delete the now-unused `ApprovedByPersonId`/`ApprovedAt` properties if nothing else references them (grep first).
- **DAL** `ShavingsOrderDAL.cs`: delete `GetPendingDeliveryApprovals` and `ApproveDelivery`.
- **DTOs**: delete `PendingDeliveryApprovalItem` and `ApproveDeliveryRequest`.

### Modify — read DTO for the secretary list (CAP-7)
- `CompetitionShavingsOrderListItem`: remove `ApprovedByPersonId`/`ApprovedAt`; add `Seen` (`DateTime?`), `Delivered` (`DateTime?`), `PrequestDatetime` (`DateTime?`).
- `ShavingsOrderDAL.GetShavingsOrdersForCompetitionAndRanch`: stop reading `approvedbypersonid`/`approvedat`; read `Seen`/`Delivered`/`PrequestDatetime`. **This edit and M4 ship together.**

### Add — no-photo delivery path (CAP-4)
- **DAL**: `MarkDelivered(int shavingsOrderId)` → calls `usp_markdelivered`, returns `bool` (rows-affected > 0), same shape as `ClaimShavingsOrder`.
- **BL** `ShavingsOrder.MarkDelivered(request)`: validate `ShavingsOrderId > 0`.
- **Controller**: `[HttpPost("mark-delivered")]` — auth via `GetPersonIdFromClaims`; return `Conflict`/`Ok` mirroring `ClaimOrder`. (Same TODO as `save-delivery-photo`: order→worker ownership check is currently absent; keep parity, don't regress.)

### Modify — photo path already exists (CAP-6)
- No controller/BL/DAL signature change for `save-delivery-photo`; behavior changes live in M2. Confirm `SaveDeliveryPhoto` BL still passes a `DateTime` for the photo date (it uses `DateTime.UtcNow`).

### DAL convention reconciliation (CAP-10)
- Converge the raw static `NpgsqlCommand` methods (`GetShavingsOrdersByCompetitionForWorker`, `ClaimShavingsOrder`, `GetShavingsOrdersForCompetitionAndRanch`, `GetShavingsOrderDetails`, `GetPayersForShavingsOrder`, `GetAllShavingsOrder*`) onto `CreateCommandWithStoredProcedure` (positional-dict; **entry order must match SP param order**).
- **Documented exception:** `CreateShavingsOrder` passes a typed `jsonb` (`@stalls`) and a typed `Timestamp`. If `AddParameterWithType` cannot resolve `jsonb` by column-name convention, leave `CreateShavingsOrder` on the raw command and add a code comment citing this exception. Do not force a jsonb through a helper that will mis-type it.
- Keep this a mechanical, behavior-preserving refactor; `dotnet build` green + re-run the worker/secretary read paths.

---

## C. Worker mobile app (CAP-9)

Directory: `RideOnClient/rideon-client/mobile/src/screens/roles/worker/`.

### `components/WorkerShavingsOrderCard.jsx`
- **Derive the three-state view in the app — do NOT read the raw token as the state.** Add a helper (state or a small `deriveState(order)`): `Delivered` if `deliveryStatus === 'Delivered'` OR `arrivalTime` set; else `Seen` if `workerSystemUserId` set; else `Pending`. The stored `deliveryStatus` stays `Pending` through claim (backward-compat model), so branching on it alone would never reach `Seen`.
- `getStatusLabel`: map the **derived** state — `Pending → "ממתין לאספקה"`, `Seen → "בטיפול" / "נצפה"`, `Delivered → "סופק"`. Remove the `WaitingApproval` and `Closed` cases.
- Button branches (keyed on the **derived** state):
  - Derived `Pending` + unclaimed (`workerSystemUserId` NULL): keep "קח טיפול" (claim).
  - Derived `Seen` + mine: show the deliver action — **primary** "צלם ואשר אספקה" (photo). On a photo-upload failure, reveal a **fallback-only** "סמן כסופק ללא תמונה" (no-photo). Resolved: fallback-only, not a co-equal standalone button.
  - Derived `Delivered`: terminal confirmation row (checkmark, "סופק"); the unverified flag (no photo) is primarily a secretary concern (Spec 2).
  - Remove the `WaitingApproval` limbo block entirely.

### `screens/WorkerCompetitionShavingsOrdersScreen.jsx` and `screens/WorkerShavingsOrdersScreen.jsx`
- `handleClaimOrder`: unchanged call; after reload the order returns with `workerSystemUserId` set and `deliveryStatus` still `Pending` → derives to `Seen`.
- `handleCapturePhoto`: on success alert copy stops saying "ממתין לאישור מזכירה" → say "ההזמנה סומנה כסופקה". On upload failure (the `catch`), offer the no-photo fallback that calls the new `mark-delivered` service instead of only alerting.
- Add `markDelivered(shavingsOrderId)` to `services/shavingsOrderService.js` → `POST /ShavingsOrders/mark-delivered`.
- These screens read `order.deliveryStatus`, `order.workerSystemUserId`, `order.arrivalTime`; feed all three into `deriveState`. The new `responseTime` field (M5/M6) is optional for v1 (only needed to show "seen at").

### Ordering discipline
**No hard sequencing gate on the mobile side** — the backward-compat token model keeps installed old apps working through the whole flow (claim leaves the order `Pending`, so their deliver button still shows; delivery flips it to the terminal `Delivered`). Ship the app update with M1/M2/M3/M8 for a clean UX, but a lagging app is safe, only cosmetically off (raw `Delivered` badge). The one real gate is server-side: M4 ships **with** the backend.

---

## D. Verification (per capability)

- **CAP-1:** grep the whole repo for `pending-approvals`, `approve-delivery`, `GetPendingDeliveryApprovals`, `ApproveDelivery`, `WaitingApproval` → only historical docs remain; `dotnet build` green.
- **CAP-2/3/6:** re-read a row after claim / photo / mark-delivered; assert transitions — after claim `workersystemuserid` + `responsetime` set and `deliverystatus` STILL `Pending`; after photo/mark-delivered `arrivaltime` set and `deliverystatus = 'Delivered'`.
- **CAP-4:** simulate photo-upload failure path → order still `Delivered`, `deliveryphotourl` NULL; later photo → verified, `arrivaltime` unchanged.
- **CAP-5:** post-migration `SELECT deliverystatus, count(*) ... GROUP BY 1` shows only `{Pending, Delivered}` (no `WaitingApproval`/`Closed`); a claimed-undelivered row still reads `Pending` but derives to `Seen`.
- **CAP-7:** deployed-backend regression — the read path must not throw a missing-column error; confirm the DAL edit and M4 are in the same deploy.
- **CAP-8:** worker read procs return `ResponseTime`; old app unaffected.
- **CAP-9:** device walkthrough of the full state machine driven by the derived state; `ממתין לאישור מזכירה` never renders; an un-updated old app still completes claim→deliver.
- **CAP-10/11:** `dotnet build` green; `Individual/` folder has no duplicate numbers; repo `.sql` == live (`pg_get_functiondef` diff).
