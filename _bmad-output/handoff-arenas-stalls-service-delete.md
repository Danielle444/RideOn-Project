# Handoff — QA #53 / #56 (Arenas & Stalls + Service Delete)

**Session:** 2026-07-27 (party-mode). **Branch:** `fix/qa-53-56-arenas-stalls-service-delete` (off `main`).
**Scope decided by Oren:** honesty bet + restrained bet. Teaching/onboarding UX deferred → QA #69.

---

## What shipped this session (code, committed on the feature branch)

### QA #56 — Add/Edit/Delete unresponsive on Arenas & Stalls page (+ compound-delete half of #53)
- Root cause: `ArenasAndStallsPage.jsx` wired the `StallCompoundsTable` to **empty no-op functions** (`onCreate={function(){}}`, `onEdit`, `onDelete`) while the hook `useArenasAndStallsPage` already exported working `openCreateCompound` / `openEditCompound` / `handleCompoundDelete`. The arena section three lines above was wired correctly — only compounds were dead.
- Fix: wire the three props to the real hook handlers. Frontend-only, no new logic.
- File: `RideOnClient/rideon-client/web/src/pages/secretary/ArenasAndStallsPage.jsx:100-102`.

### QA #53 — Service delete (Service Prices page) never worked
- Root cause A (crash): the live-only proc `usp_deleteserviceproduct` guarded usage with `productrequest.productid`, **a column that does not exist** → SQLSTATE 42703 on every delete past the stall guard. Live-verified 2026-07-27.
- Root cause B (latent FK): `DELETE FROM pricecatalog` had **no guard against `paidtimerequest`** (FK onto pricecatalog) → 23503 for any used paid-time product even after A is fixed. Live data: paid-time products 1,2 referenced by `paidtimerequest`; products 3,4,5 by `productrequest`.
- Fixes (code committed; **proc APPLIED LIVE 2026-07-30 — see the status block below**):
  - Proc rewrite → `RideOnDB/StoredProcedures/PostgreSQL/Individual/183_usp_DeleteServiceProduct.sql`. Detects usage correctly via `pricecatalog` for BOTH request types; blocks with Hebrew "deactivate instead" tagged `SQLSTATE 'RN001'`; hard-deletes only truly-unused products (never destroys financial history). Matches Oren's ruling: block-and-redirect, not cascade.
  - `ServicePriceDAL.DeleteServiceProduct` — catch `PostgresException` with `SqlState == "RN001"` → rethrow `BL.ValidationException(ex.MessageText)`.
  - `ServicePricesController.DeleteProduct` — catch `ValidationException` → `BadRequest(ex.Message)` (surfaces the Hebrew guard message instead of the generic string). Honesty bet, **service page only** (Oren's scope).

C# compiles clean (`dotnet build` — only MSB file-lock errors from a running server instance, zero CS errors).

---

## ✅ DONE 2026-07-30 — the proc IS applied live. Do not re-apply.

Applied with Oren's explicit go-ahead as migration `qa53_fix_deleteserviceproduct_guards_rn001`.
`CREATE OR REPLACE`, oid 21844, signature unchanged. The deployed body is byte-identical to
`183_usp_DeleteServiceProduct.sql` (`prosrc` md5 `1b36cbffb32c9ee44cad876f682386da`, 1240 chars).

Pre-apply smoke test ran inside a rolled-back transaction (terminating `RAISE`), and the
rollback was re-read and confirmed — counts restored, product 11 and its child rows intact,
throwaway function absent. Post-apply, exercised against the DEPLOYED proc: products 2, 3
and 5 all raise `RN001` with the Hebrew guard text. **The 42703 crash is gone.**

Still outstanding: **the C# is not merged**, so the guard message still reaches the
secretary as the generic Hebrew fallback (the runbook's "new proc + old C#" row — correct
blocking, no worse than before). E2E was never run in a browser; CAP-1 is verified only by
static tracing. Branch: `fix/qa-53-56-db-and-verify`, commits `4876ec8` + `a85a0a6`.

The section below is retained as the historical record of what was to be applied, and for
the rollback body.

**Migration that was applied** = the body in `183_usp_DeleteServiceProduct.sql` (CREATE OR REPLACE).

**Rollback body — the TRUE prior definition, captured from `pg_get_functiondef` 2026-07-30
immediately before the apply.**

> Correction: the version previously recorded here was described as the "exact
> currently-deployed definition" but was **not** byte-exact — it had the `EXISTS` predicates
> flattened onto single lines. The logic was identical, so nothing was decided wrongly on
> it, but it would not have restored the proc character for character. The block below is
> the real one. (Restore only if the new proc must be reverted — it still contains the
> `productrequest.productid` 42703 bug and is never a target state.)

```sql
CREATE OR REPLACE FUNCTION public.usp_deleteserviceproduct(productid_param smallint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM stall s
        WHERE s.stalltype = productid_param
    ) THEN
        RAISE EXCEPTION 'Cannot delete product because it is used by stalls';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM productrequest pr
        WHERE pr.productid = productid_param
    ) THEN
        RAISE EXCEPTION 'Cannot delete product because it is used by requests';
    END IF;

    DELETE FROM paidtimeproduct
    WHERE productid = productid_param;

    DELETE FROM pricecatalog
    WHERE productid = productid_param;

    DELETE FROM product
    WHERE productid = productid_param;
END;
$function$
```

**Smoke test (zero side effects, per skill DO $$ pattern):** create a throwaway product with a pricecatalog row + a paidtimerequest referencing it, call the proc, expect `RN001` "already ordered" raise; then a product with no references, expect clean delete; capture counts and `RAISE EXCEPTION 'SMOKE_RESULT ...'` to roll everything back. Confirm rollback with a follow-up read.

**Deploy coupling:** the C# RN001 catch expects the new proc. Neither ordering breaks worse than today (old proc + new C# → generic message; new proc + old C# → correct block but generic message), but the fully-correct behavior needs BOTH the proc applied AND the C# deployed (merge branch → Render). Apply the proc in the same deploy window as the merge.

---

## Then — run the apps and verify E2E (Oren provides login)

Local flow (PowerShell, one step at a time — see ride-on-system-knowledge → Local Development Setup):
1. Backend: `cd RideOnServer; dotnet run` (stop the currently-running instance first so the binary unlocks).
2. Frontend: `cd RideOnClient/rideon-client/web; npm run dev` → http://localhost:5173.
3. Log in with Oren's host-secretary credentials.
4. **#56:** Arenas & Stalls page → "הוספת מתחם" opens the modal; Edit opens prefilled; Delete confirms + removes (or shows the booking-guard message).
5. **#53:** Service Prices page → delete an UNUSED service → succeeds; delete a USED paid-time service (product 1 or 2) → clear Hebrew "יש להשבית אותו במקום זאת", no generic error, no crash.

---

## Deferred — QA #69 (spec-first, not this session)

Onboarding UX for the Arenas & Stalls page: empty-state guidance + the hidden arena → stall-type (Service Prices category 2) → compound dependency. Artifact: `_bmad-output/qa-tracker-iss69-arenas-stalls-onboarding.json`. Parked by Oren (edge case; not in the presentation; new ranches open rarely).

### Spec handoff prompt (paste into `/bmad-spec` when the item is picked up)
```
Create a spec for onboarding/empty-state UX on the RideOn secretary "Arenas & Stalls"
page (web/src/pages/secretary/ArenasAndStallsPage.jsx).

Context: Host secretaries manage arenas and stall compounds per ranch. A stall
compound requires a stall TYPE, and stall types are defined on a DIFFERENT page —
Service Prices, product category 2 (usp_GetProductsByCategory; the hook filters
sections to categoryId === 2 in useArenasAndStallsPage.js → loadStallTypes). Today
a first-run ranch sees only a grey "no compounds" row and an add button, and if no
stall-type service exists the StallCompoundModal's type dropdown is silently empty
with no explanation.

Problem to solve (two related gaps):
1. Empty-state guidance: when a ranch has no arenas and/or no compounds, guide the
   secretary through the correct order (arena first, then compounds).
2. Make the cross-page dependency visible: when no stall-type service exists, tell
   her a stall type must be defined on the Service Prices page first, ideally with a
   direct link, instead of showing an empty dropdown.

Constraints: no layout rewrite (80/20). Hebrew RTL UI. Reuse existing components
(DataTableEmptyState, ToastMessage, StallCompoundModal). Frontend-only if possible;
flag any backend/proc need. Produce SPEC kernel + companions with acceptance criteria
covering the empty-ranch first-run flow and the missing-stall-type flow.
```

---

## Noted (not filed) — small consistency follow-up
Arena and Stall-Compound delete controllers (`ArenasController`, `StallCompoundsController`) also swallow their DB guard messages into a generic Hebrew string, same as service delete did before this fix. Oren scoped the honesty bet to the service page only, so these were intentionally left. If desired later, apply the same RN001/ValidationException pattern to those two paths for consistency (their procs `usp_deletearena` / `usp_deletecompound` already raise nice Hebrew guard messages that never reach the user).
