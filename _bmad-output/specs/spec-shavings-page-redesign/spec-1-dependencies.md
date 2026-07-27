# Spec 1 Dependencies — Fields & Reads This Page Consumes

The explicit contract Spec 2 draws from Spec 1 (`spec-shavings-order-backend`, **merged `d9c3701`,
deployed; `origin/main` at `eb369c1`**). Spec 2 authors no procs. Everything below is deployed and
live except **DEP-1**, the one gap.

## Vocabulary consumed (matches Spec 1 exactly)

- Stored `deliverystatus ∈ {Pending, Delivered}` **only**. Display/group state is **derived**:
  Delivered if `Delivered`(=`arrivaltime`) set; else Seen if `WorkerSystemUserId` set; else Pending.
  Never group or label on the stored token.
- **Unverified delivery** = `Delivered` set AND `deliveryphotourl` null (derived; no column) — blocked
  on DEP-1.
- **No approval** — `ApprovedByPersonId`/`ApprovedAt` are gone from #176; no approve action/queue exists.

## Reads reused as-is (deployed, do not reinvent)

| Ref | Proc (repo file #) | Endpoint | Used for |
|---|---|---|---|
| R1 | `usp_getcompetitionsummaryshavingsdetails` (172) | `GET /CompetitionSummary/shavings` | ranch enumeration + group-header rollups (#29) |
| R2 | `usp_getshavingsordersforcompetitionandranch` (176) | `GET /ShavingsOrders/by-competition-and-ranch` | per-order backbone incl. SLA fields (#29/#30) |
| R3 | `usp_getcompetitionsummaryshavingsentries` (173) | `GET /CompetitionSummary/shavings/entries` | optional row-expand richness (horses/payers/paid; `'תא ציוד'` tack fallback) |
| — | `usp_createshavingsorder` (169) | `POST /ShavingsOrders` | add-order write (#32) |
| — | `usp_getstallbookingsforshavings` (177) | `GET /ShavingsOrders/stall-bookings-for-order` | add-order stall picker (#32) |
| — | `getServicePricesDashboard` | `GET /ServicePrices?ranchId` | add-order price source (#32) |

## Fields deployed on R2 (#176) — confirmed by Oren

DTO `CompetitionShavingsOrderListItem` (with `Seen`/`Delivered`/`PrequestDatetime` as `DateTime?`):

| Field | Meaning | Consumed by |
|---|---|---|
| `WorkerSystemUserId` | who claimed it (null = unclaimed) | **derived status** (Seen), CAP-4 Rule A/B keys, attribution |
| `Delivered` (= `arrivaltime`) | canonical delivered-at | **derived status** (Delivered), CAP-3 timestamp, CAP-4 stop |
| `Seen` (= `responsetime`) | when a worker took the order | CAP-4 Rule B clock (legacy null → fall back to created) |
| `PrequestDatetime` | creation clock, populated on all rows | CAP-4 Rule A clock |
| `DeliveryStatus` | stored `Pending`/`Delivered` only | **not** used for grouping/labels (derive instead) |
| `RequestedDeliveryTime`, `BagQuantity`, `Notes`, `OrderedByName`, `PriceCatalogId`, `ItemPrice`, `TotalAmount` | order display | row display / financial column |

## DEP-1 — RESOLVED (Oren 2026-07-26): append `DeliveryPhotoUrl` to R2 (#176)

CAP-3's "unverified delivery" marker = `Delivered` set **and no photo**, which needs `deliveryphotourl`
on the order row. Spec 1 shipped #176 **without** it. **Decision: do the minimal backend touch** (a
delivered-verbatim DROP+CREATE with one appended column), plus the DTO + DAL reader, plus the repo
file. `deliveryphotourl` is `text` in `shavingsorder`.

**Deploy safety:** the column is **appended last** and the DAL reads by name, so the change is
backward-compatible with the currently-deployed backend (it simply ignores the new column). The
`DROP FUNCTION` + `CREATE` runs atomically in one migration (no window where the function is missing),
so the proc change may be applied independently, ahead of the web deploy. Follow live-DB discipline:
this SQL was drafted from the live `pg_get_functiondef`; show Oren, apply, re-read.

### 1. Proc — `RideOnDB/StoredProcedures/PostgreSQL/Individual/176_usp_GetShavingsOrdersForCompetitionAndRanch.sql`

```sql
-- DEP-1 (Spec 2): expose DeliveryPhotoUrl so the secretary page can flag "delivered without photo".
-- Adding an output column changes the return type => DROP + CREATE (CREATE OR REPLACE cannot change
-- the TABLE shape). Appended LAST so the deployed DAL (reads by name) keeps working unchanged.
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
    "Seen" timestamp without time zone,
    "Delivered" timestamp without time zone,
    "PrequestDatetime" timestamp with time zone,
    "DeliveryPhotoUrl" text                    -- <== appended LAST
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
        so.responsetime      AS "Seen",
        so.arrivaltime       AS "Delivered",
        pr.prequestdatetime  AS "PrequestDatetime",
        so.deliveryphotourl  AS "DeliveryPhotoUrl"   -- <== appended LAST
    FROM shavingsorder so
    INNER JOIN productrequest pr ON pr.prequestid = so.shavingsorderid
    INNER JOIN pricecatalog pc   ON pc.pricecatalogid = pr.pricecatalogid
    INNER JOIN systemuser su     ON su.systemuserid = pr.orderedbysystemuserid
    INNER JOIN person p          ON p.personid = su.systemuserid
    INNER JOIN shavingsorderforstallbooking sosb ON sosb.shavingsorderid = so.shavingsorderid
    INNER JOIN stallbooking sb   ON sb.stallbookingid = sosb.stallbookingid
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

### 2. DTO — `RideOnServer/BL/DTOs/ShavingsOrders/CompetitionShavingsOrderListItem.cs`

Add (after `TotalAmount`): `public string? DeliveryPhotoUrl { get; set; }`

### 3. DAL — `RideOnServer/DAL/ShavingsOrderDAL.cs`, in `GetShavingsOrdersForCompetitionAndRanch` reader loop (~line 336, after `PrequestDatetime`)

```csharp
DeliveryPhotoUrl =
    reader["deliveryphotourl"] == DBNull.Value
        ? null
        : reader["deliveryphotourl"].ToString(),
```

Then `dotnet build` in `RideOnServer/`. Frontend derives `isUnverified = !!Delivered && !DeliveryPhotoUrl`.

### Drop discipline — nothing is removed, only appended

The `DROP FUNCTION` here is **purely the Postgres mechanism** for changing a function's return-`TABLE`
shape (`CREATE OR REPLACE` cannot). It is immediately followed by `CREATE` of the **same** function with
**all 13 existing output columns preserved verbatim** + `DeliveryPhotoUrl` appended 14th. **Nothing is
dropped from the contract.** Before applying, diff the drafted body against the live `pg_get_functiondef`
and confirm the only delta is the one added column + its one `SELECT` line.

- **Do NOT remove any existing output column, DTO property, or DAL read because it "looks unused."**
  Example: the stored `DeliveryStatus` token is *superseded* by the derived status for display, but it
  **stays** in the proc/DTO — mobile and other consumers may read it. Supersession ≠ obsolescence.
- **If something genuinely looks obsolete relative to the post-Spec-1 table, FLAG it to Oren — do not
  drop it in this change.** This change is additive only.

### Consumers to verify (do not break) — searched 2026-07-26

`#176` / `GetShavingsOrdersForCompetitionAndRanch` / `CompetitionShavingsOrderListItem` /
`GET /ShavingsOrders/by-competition-and-ranch` are consumed by more than the new web page — the
**deployed mobile admin app** reads the same proc:

| Consumer | Location | Risk |
|---|---|---|
| Endpoint | `RideOnServer/Controllers/ShavingsOrdersController.cs:219-236` | recompile |
| DAL reader | `RideOnServer/DAL/ShavingsOrderDAL.cs:266` | add the new read |
| DTO | `RideOnServer/BL/DTOs/ShavingsOrders/CompetitionShavingsOrderListItem.cs` | add the new prop |
| **Mobile service** | `mobile/src/services/shavingsOrderService.js:40` | reads by name → new column ignored |
| **Mobile admin add-order** | `mobile/src/hooks/useAdminCompetitionShavings.js:177` | `normalizeShavingsOrder` reads by name → safe |
| **Mobile stalls overview** | `mobile/src/hooks/useAdminCompetitionStallsOverview.js:379` | reads by name → safe |
| Web service | `web/src/services/shavingsOrderService.js` (currently `export {}`) | Spec 2 adds the fn |

**Why it's safe:** the column is appended **last** and every consumer reads by name (C# `reader["…"]`,
JS `normalize*` picking specific keys), so a trailing column shifts nothing and is ignored by anyone not
looking for it. **Follow-up checklist for the applying session:**

1. Re-read the live proc (`pg_get_functiondef`) after apply — prove the 14-column shape landed.
2. `dotnet build` `RideOnServer/` — DTO + DAL compile.
3. Re-grep the four identifiers above; confirm every consumer still builds; **smoke-test the mobile admin
   shavings screen** (it calls this proc) so the deployed app path is unbroken.
4. Sync repo file `176_...sql` to match live exactly; commit it with the C# change.
5. Confirm `origin/main` is the deployed backend before/after (a local `dotnet run` is not proof of
   deploy) — the append is backward-compatible so it can land independently, but the repo/live/DTO must
   end in sync.

## DEP-2 — OPTIONAL / deferred: competition-scoped order-list read

- **Need:** R2 (#176) is scoped to one participating ranch, so the page loops it per ranch. A single read
  returning **all** participating ranches' orders in one call — with `BookingRanchId`/`BookingRanchName`
  in the output — would remove the client-side loop.
- **Why deferred:** live data has one participating ranch per competition, so the loop is a single call
  today. Not needed for v1.

## Coordination

- The web approval action was removed by Spec 1 (`shavingsOrderService.js` is `export {}`;
  `CompetitionShavingsPage.jsx` is a neutral placeholder). Spec 2 rebuilds both. Confirm no live session
  is mid-edit on those files before starting.
- Both specs (and the out-of-scope #31/#46 notification track) touch shared surfaces — coordinate merges
  to `main`. Branch Spec 2 off **current `origin/main`** (`eb369c1`).
