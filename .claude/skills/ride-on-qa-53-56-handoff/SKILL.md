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
- **QA #53** (backend, committed; **proc APPLIED LIVE 2026-07-30** — do NOT re-apply):
  - `RideOnDB/StoredProcedures/PostgreSQL/Individual/183_usp_DeleteServiceProduct.sql` —
    detects usage through `pricecatalog` for BOTH `productrequest.pricecatalogid` and
    `paidtimerequest.pricecatalogid`; raises Hebrew SQLSTATE `RN001` guards; hard-deletes
    only zero-stall / zero-order products. Fixes the old `productrequest.productid`
    (42703) crash and the missing `paidtimerequest` FK (23503) hole.
  - `ServicePriceDAL.DeleteServiceProduct` catches `PostgresException` `SqlState == "RN001"`
    → rethrows `BL.ValidationException(ex.MessageText)`.
  - `ServicePricesController.DeleteProduct` catches `ValidationException` →
    `BadRequest(ex.Message)`, so the Hebrew guard text reaches the user.

## Current state (updated 2026-07-30 — read this before the goals below)

**Step 1 is DONE. Steps 2 and 3 are not.** Work continued on branch
`fix/qa-53-56-db-and-verify` (cut from `fix/qa-53-56-arenas-stalls-service-delete`).

- **Proc applied live 2026-07-30**, migration `qa53_fix_deleteserviceproduct_guards_rn001`,
  with Oren's explicit go-ahead. `CREATE OR REPLACE`, oid 21844, signature unchanged.
  Deployed body is byte-identical to the repo file (`prosrc` md5
  `1b36cbffb32c9ee44cad876f682386da`, 1240 chars). **Do not re-apply.**
  Pre-apply smoke test ran in a rolled-back transaction and the rollback was re-read and
  confirmed. Post-apply, against the deployed proc: products 2, 3 and 5 all raise `RN001`
  with the Hebrew guard — the 42703 crash is gone.
- **The proc file was renumbered 181 → 183.** `181_usp_GetRealHorsesByRanch.sql` was
  already on main and `182_usp_ApplyAutoScheduleV2.sql` was claimed by a concurrent
  branch. Same collision class as the old 164 clash. Cite **183**, never 181.
- **NOT merged, NOT deployed.** The branch is 6 commits behind main and main is 6 behind
  it, with **zero file overlap** (so a conflict-free merge is expected). Main's only touch
  inside the #53 path is `ServicePriceManager.cs`, and that change is purely additive
  (`GetActiveServicePricesForRanch`) — `DeleteProduct` is untouched.
- Because the C# is unmerged, the deployed app is in the runbook's **"new proc + old C#"**
  row: correct blocking, message still the generic Hebrew fallback. No worse than before.
- **E2E was never run.** CAP-1 was verified only by static tracing (handlers exist and are
  returned by the hook, `StallCompoundsTable` invokes the props, the modal prefills via
  `initialItem={page.editingCompound}`). No browser check happened.

### ⚠️ Before testing CAP-1 Delete: it is DESTRUCTIVE on every current compound

`usp_deletecompound` (read live 2026-07-30) guards on **`stallbooking`, NOT on stalls**. When
no booking exists it runs `DELETE FROM stall WHERE ranchid AND compoundid` and only then
deletes the compound. So a compound with stalls but no bookings is deleted **along with all
its stall rows, silently, with no guard and no undo.**

All four ranch-11 compounds currently have **zero bookings**:

| compound | stalls | outcome if Delete is clicked |
|---|---|---|
| `מתחם תאי תחרות` (1) | 98 | deletes compound **+ 98 stall rows** |
| `מתחם חנית קרונות` (2) | 30 | deletes compound **+ 30 stall rows** |
| `מתחם B2W` (3) | 21 | deletes compound **+ 21 stall rows** |
| `מתחם DK` (4) | 40 | deletes compound **+ 40 stall rows** |

This corrects an earlier claim in this session that Delete "will likely hit the booking
guard" — it will not; the guard is bookings, and there are none.

**Do NOT test CAP-1 Delete on a real compound.** Use this self-contained sequence instead —
it exercises all three CAP-1 actions on data the test itself creates, so nothing pre-existing
is ever at risk:

1. **Add** — "הוספת מתחם", give it an obviously-disposable unique name (e.g. `בדיקה QA56`).
   `usp_CreateCompoundWithStallsByPattern` creates the compound **and its stalls** from the
   numbering pattern, so the new compound owns fresh throwaway stalls. It has a
   duplicate-name guard, so the name must be unique in the ranch.
2. **Edit** — reopen it and confirm the name field is **prefilled** with that name. Rename it
   and save. (Guarded by `usp_UpdateCompoundName`: blank name and duplicate name both raise.)
3. **Delete** — delete that same compound. It has zero bookings, so it removes cleanly along
   with only the stalls step 1 created.

That covers "Add opens the modal / Edit opens prefilled / Delete confirms and removes" in full
without touching the 189 real stall rows.

Note this is NOT the scoped-out controller follow-up. It is a property of the delete proc
itself and a hazard in the acceptance test. Related: the proc's `RAISE` carries no `ERRCODE`,
so it surfaces as `P0001` and the controller still swallows it into a generic Hebrew string —
that swallowing IS the accepted non-goal, so even when the booking guard does fire, the
specific message will not reach the secretary.

**Local dev caveat learned the hard way:** `rideon-local.ps1` and the backend env vars
(`ConnectionStrings__DefaultConnection`, `Jwt__Key`, …) exist on **Oren's** machine only.
On Danielle's box (`C:\Users\betka`) the script does not exist at any path, no env var is
set at session/User/Machine scope, and `appsettings.json` carries no `ConnectionStrings`
or `Jwt` section at all — so a local backend cannot be started there without pulling both
secrets from the Render dashboard first. `appsettings.Development.json` is also **tracked**
in git, contrary to CLAUDE.md's claim that it is gitignored.

## Execution goals (in order)

1. ~~**Apply the #53 proc live**~~ — **DONE 2026-07-30, see Current state above.**
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
