---
name: ride-on-qa-53-56-handoff
description: "Use this skill when picking up or shipping RideOn QA #53 / #56 — the secretary Arenas & Stalls stall-compound Add/Edit/Delete wiring and the Service Prices 'delete service' fix (block-and-redirect proc + honest RN001 error). Triggers when a teammate is asked to apply the service-delete stored procedure live, verify these fixes E2E, or merge/deploy branch fix/qa-53-56-arenas-stalls-service-delete. Provides the execution goals, the exact proc/rollback/deploy specifics, and pointers to the committed spec — so the handoff survives without the (gitignored) bmad tooling."
---

# RideOn QA #53 / #56 — Handoff (Arenas & Stalls + Service Delete)

Standalone handoff for a team member finishing QA #53/#56. All code is written and
committed on branch **`fix/qa-53-56-arenas-stalls-service-delete`** (off `main`). Your job
is to apply the DB proc live, verify E2E, and ship — not to rewrite anything.

**Load these skills first:** `ride-on-system-knowledge` (system/schema context) and
`ride-on-live-db-ops` (the live-DB protocol you must follow to apply the proc).

## The canonical contract (read before acting)

- `_bmad-output/specs/spec-qa-53-56-arenas-stalls-service-delete/SPEC.md` — 3 capabilities
  (CAP-1 compound Add/Edit/Delete; CAP-2 delete unused service; CAP-3 block used service).
- `_bmad-output/specs/spec-qa-53-56-arenas-stalls-service-delete/migration-and-deploy.md` —
  proc body pointer, exact rollback SQL, side-effect-free smoke test, deploy-coupling table.
- `_bmad-output/specs/spec-qa-53-56-arenas-stalls-service-delete/handoff-prompt.md` — the
  goals prompt to drive execution.

## What already shipped (do not redo)

- **QA #56** (frontend): `ArenasAndStallsPage.jsx` compound Add/Edit/Delete were wired to
  no-op functions; now wired to the real `useArenasAndStallsPage` handlers. Live-ready.
- **QA #53** (backend, committed, proc NOT yet applied live):
  - `RideOnDB/StoredProcedures/PostgreSQL/Individual/183_usp_DeleteServiceProduct.sql` —
    detects usage through `pricecatalog` for BOTH `productrequest.pricecatalogid` and
    `paidtimerequest.pricecatalogid`; raises Hebrew SQLSTATE `RN001` guards; hard-deletes
    only zero-stall / zero-order products. Fixes the old `productrequest.productid`
    (42703) crash and the missing `paidtimerequest` FK (23503) hole.
  - `ServicePriceDAL.DeleteServiceProduct` catches `PostgresException` `SqlState == "RN001"`
    → rethrows `BL.ValidationException(ex.MessageText)`.
  - `ServicePricesController.DeleteProduct` catches `ValidationException` →
    `BadRequest(ex.Message)`, so the Hebrew guard text reaches the user.

## Execution goals (in order)

1. **Apply the #53 proc live — requires Oren's explicit go-ahead.** Follow
   `ride-on-live-db-ops`: show the exact SQL (the 181 file body), get an explicit "go",
   apply via `apply_migration`, re-read the deployed definition as proof. Run the
   side-effect-free smoke test from `migration-and-deploy.md` first and confirm rollback.
   The rollback body (the *broken* prior definition) is in that companion.
2. **Verify E2E** (Oren provides host-secretary login): backend `dotnet run` (stop any
   running instance so the binary unlocks), frontend `npm run dev` → http://localhost:5173.
   - CAP-1: Arenas & Stalls → "הוספת מתחם" opens modal; Edit prefilled; Delete removes.
   - CAP-2: Service Prices → delete an UNUSED service → succeeds.
   - CAP-3: Service Prices → delete a USED paid-time service (product 1 or 2) → Hebrew
     "יש להשבית אותו במקום זאת", no generic error, no crash.
3. **Ship in one deploy window.** Proc + C# must go live together (merge → Render); see the
   deploy-coupling table. Confirm no other Claude Code session is active in the working
   tree, and get Oren's approval before merging to `main`.

## Guardrails / out of scope

- Block-and-redirect, never cascade: used products are deactivated, never hard-deleted;
  never destroy financial history.
- Do NOT expand into: **QA #69** onboarding/empty-state UX (deferred on purpose); the
  Arena/Compound delete-controller message-swallowing consistency follow-up (scoped out —
  service page only). Both are explicit non-goals in the SPEC.
- If any acceptance criterion fails, stop and report — fix the implementation, not the spec.
