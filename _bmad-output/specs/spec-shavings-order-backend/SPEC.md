---
id: SPEC-shavings-order-backend
companions:
  - change-set.md
  - state-machine.md
  - repo-hygiene.md
  - spec-2-handoff.md
sources:
  - ../../shavings-redesign/shavings-data-layer-map.md
  - ../../shavings-redesign/recovered-shavings-procs.live.sql
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# Spec 1 — Shavings Order-Table & Backend Follow-Through

## Why

A **pain to solve.** RideOn's shavings-order lifecycle carries a proven-zombie stage: secretary "approval" of deliveries that in live data happened weeks late or never (order 38 delivered 2026-04-27, approved 2026-07-11; orders 39/46 delivered but stuck `WaitingApproval` indefinitely). Meanwhile the two timestamp columns that should tell the story — `responsetime` and `arrivaltime` — are 100% NULL, written by nothing, and delivery is illegitimately gated on a photo upload that can fail in a barn with no signal. The worker mobile app shows a limbo state (`ממתין לאישור מזכירה`) that leads nowhere. This spec cleans the order table's backend and worker-facing behavior so the secretary redesign (Spec 2) can be built on an honest vocabulary: `Pending → Seen → Delivered`, with the photo as optional proof rather than a gate. It is the backend/DB/worker-mobile half of the redesign; the secretary web page is Spec 2, notification push (#31/#46) is out of scope.

## Capabilities

- **CAP-1 — Retire secretary approval**
  - **intent:** Remove the approval stage end-to-end so no surface reads or writes it and photos become proof-on-demand, not a gate.
  - **success:** `usp_getpendingdeliveryapprovals` and `usp_approvedelivery` no longer exist in live; the `pending-approvals` and `approve-delivery` endpoints, their DAL/BL methods, DTOs, and the web approval action are gone; `dotnet build` is green and no call path references them (grep-clean).

- **CAP-2 — `responsetime` becomes "seen"**
  - **intent:** When a worker claims/takes an order, assign the worker and stamp `responsetime = now()` so "seen by worker" is a recorded fact. `Seen` is a **derived** view, not a stored `deliverystatus` token.
  - **success:** After a claim, the row has `workersystemuserid` set and `responsetime` non-NULL, while `deliverystatus` stays `Pending`; a re-read proves it. No physical column was renamed.

- **CAP-3 — `arrivaltime` becomes the canonical "delivered-at"**
  - **intent:** Make `arrivaltime` the single timestamp that drives delivered-ness, decoupled from the photo.
  - **success:** A delivery recorded through either path leaves `arrivaltime` non-NULL and `deliverystatus` terminal, independent of whether a photo exists. No physical column was renamed.

- **CAP-4 — Photo-optional delivery with a derived "unverified" flag**
  - **intent:** Allow a delivery to be recorded even when the photo upload fails, and let the secretary distinguish photo-backed from photo-less deliveries without a new column.
  - **success:** `usp_markdelivered` records a delivery with no photo; such rows are identifiable as `arrivaltime IS NOT NULL AND deliveryphotourl IS NULL` ("unverified"); a later photo promotes the same row to verified without moving `arrivaltime`.

- **CAP-5 — `Pending → Seen → Delivered` view + data migration**
  - **intent:** Establish the three-state worker/secretary vocabulary while keeping the **stored** `deliverystatus` column backward-compatible: it carries only `{Pending, Delivered}` (terminal token `Delivered`); `Seen` is derived. Migrate existing rows onto it.
  - **success:** Live `deliverystatus` values are drawn from `{Pending, Delivered}`; the ~10 existing rows are migrated (`WaitingApproval`/`Closed` → `Delivered` with `arrivaltime` backfilled from `deliveryphotodate`); no `WaitingApproval`/`Closed` rows remain; the derived view is `Delivered` if `arrivaltime` set, else `Seen` if `workersystemuserid` set, else `Pending`.

- **CAP-6 — `usp_savedeliveryphoto` records delivery, not approval-wait**
  - **intent:** The photo path must record a *verified delivery*, not the retired `WaitingApproval` limbo.
  - **success:** Saving a photo sets `deliverystatus = 'Delivered'`, `arrivaltime = COALESCE(arrivaltime, now())`, and the photo columns; it never writes `WaitingApproval`.

- **CAP-7 — Secretary read proc exposes the new lifecycle fields**
  - **intent:** `usp_getshavingsordersforcompetitionandranch` stops surfacing the dead approval fields and adds the fields Spec 2 needs.
  - **success:** The proc no longer returns `ApprovedByPersonId`/`ApprovedAt`; it returns `Seen` (= `responsetime`), `Delivered` (= `arrivaltime`), and `PrequestDatetime` (SLA source), appended last; the change ships **with** the backend deploy (see Constraints).

- **CAP-8 — Worker read procs expose "seen"**
  - **intent:** The two worker read procs return `responsetime` so the app can render the `Seen` state.
  - **success:** `usp_getworkershavingsorders` and `usp_getshavingsordersforworkerbycompetition` each return a trailing `ResponseTime` column; the deployed DAL continues to work unchanged.

- **CAP-9 — Worker mobile state machine `Pending → Seen → Delivered`**
  - **intent:** Replace the worker card's Pending/WaitingApproval/Closed logic with the new vocabulary: claim = Seen, deliver via photo or no-photo fallback, and drop the secretary-approval limbo label.
  - **success:** On a device, an unclaimed order shows "קח טיפול" → becomes `Seen` → shows a deliver action (photo primary, no-photo fallback on upload failure) → becomes `Delivered`; the `ממתין לאישור מזכירה` state never appears.

- **CAP-10 — One DAL convention**
  - **intent:** Reconcile `ShavingsOrderDAL.cs` onto the CLAUDE.md-mandated `CreateCommandWithStoredProcedure` positional-dict helper instead of mixing it with raw static `NpgsqlCommand` methods.
  - **success:** Surviving shavings DAL methods use the helper (positional-dict), or carry a documented exception where the helper cannot bind the parameter type (jsonb); `dotnet build` is green and behavior is unchanged.

- **CAP-11 — Repo hygiene: split & renumber procs**
  - **intent:** Commit the 9 recovered live procs one-file-per-proc and resolve the on-disk numbering collisions.
  - **success:** Each recovered proc has its own `NNN_usp_*.sql` under `Individual/` with a unique non-colliding number; the two `114_*` and two `115_*` collisions are gone; the retired procs' files are deleted; the repo files match live.

## Constraints

- **No column renames, no column drops on live `shavingsorder`.** `responsetime`/`arrivaltime` are repurposed by note only; `approvedbypersonid`/`approvedat` are left physically in place (writes/reads stop).
- **Verify live proc signatures before any `CREATE OR REPLACE`/`DROP`.** Match live parameter names and return types; adding an output column changes the return type and requires `DROP FUNCTION` + `CREATE`. `recovered-shavings-procs.live.sql` is the verbatim-from-live reference.
- **Sequencing — read-proc column removal (CAP-7) must deploy *with* the backend, never ahead of it.** The currently-deployed DAL reads `reader["approvedbypersonid"]`/`["approvedat"]` by name (`ShavingsOrderDAL.cs:345-353`); dropping those columns while the old backend is live crashes that read.
- **Mobile release is decoupled by design — no hard ordering gate.** Because claim keeps the order `Pending` (CAP-2) and the stored token set stays `{Pending, Delivered}` (CAP-5), an installed old app — which shows the deliver button on `deliveryStatus === "Pending"` (`WorkerShavingsOrderCard.jsx:86`) — keeps working through the whole flow even if its update lags store review. Interim cosmetic only: an un-updated app shows the raw `Delivered` badge (no styled terminal block) on delivered orders; benign, no worker action needed.
- **Every live DB write is shown to Oren as exact SQL and confirmed before it runs, then re-read as proof** (RideOn live-DB-ops discipline; project `sxplumrexbolpwqacpiz`).
- **After any `.cs` change run `dotnet build` in `RideOnServer/`, then grep for call paths that bypass the changed logic.** Work on a feature branch off `main`.
- **The timestamps are authoritative; `deliverystatus` is a coarse token.** `responsetime` = seen-clock, `arrivaltime` = delivered-at (drives status). Stored `deliverystatus` carries only `{Pending, Delivered}`; the three-state `Pending → Seen → Delivered` view is derived by both the worker app and the secretary read (`Delivered` if `arrivaltime` set, else `Seen` if `workersystemuserid` set, else `Pending`).

## Non-goals

- **Secretary web page redesign (Spec 2)** — ranch/status grouping (#29), SLA highlighting (#30), add-order form UX (#32). Spec 1 only exposes the fields; it does not design UI. `spec-2-handoff.md` lists exactly what Spec 2 consumes.
- **Notification push (#31/#46)** — no transport exists; entirely out of scope for this spec.
- **Column renames/drops or fixing the `responsetime` timezone inconsistency** (`timestamp without time zone` vs siblings `with`) — explicitly left as-is under the no-DB-churn rule.
- **Reworking the billing/charge split inside `usp_createshavingsorder`** — recovered and committed as-is for hygiene; its behavior is not changed here.

## Success signal

A worker in the field opens a shavings order, taps "קח טיפול" (the order flips to **Seen** with `responsetime` stamped), delivers the bags, and confirms delivery — with a photo when signal allows, or with the no-photo fallback when the upload fails — and the order flips to **Delivered** with `arrivaltime` stamped, no secretary action anywhere in the loop. The secretary's page (Spec 2) can then read seen/delivered/creation timestamps straight off the order, and no order is ever stuck in `WaitingApproval` again.

## Resolved decisions (Oren, 2026-07-24)

- **Legacy `responsetime` backfill:** leave NULL. Legacy claimed-undelivered rows carry no seen-SLA clock (test rows only) — they still read as `Seen` because `workersystemuserid` is set.
- **No-photo button:** fallback-only — surfaces after a photo-upload failure; the photo path stays primary. Not a co-equal standalone button.
- **Token-migration strategy:** release-mechanism-agnostic (backward-compatible-by-design), per the mobile-release constraint above — no dependency on Expo OTA vs app-store timing.
