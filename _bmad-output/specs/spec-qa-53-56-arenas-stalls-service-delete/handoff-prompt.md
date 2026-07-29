# Goals Handoff Prompt — QA #53 / #56 (paste into a fresh session to execute this spec)

You are picking up QA #53 / #56 on the RideOn project. All code is already written and
committed on branch `fix/qa-53-56-arenas-stalls-service-delete` (off `main`). Your job is
to finish and ship it. Load the RideOn skills first: `ride-on-system-knowledge` and
`ride-on-live-db-ops`.

The full acceptance contract is:
`_bmad-output/specs/spec-qa-53-56-arenas-stalls-service-delete/SPEC.md`
plus its companion `migration-and-deploy.md` (proc body, exact rollback SQL, smoke test,
deploy-coupling table). Read both before acting.

## Goals (in order)

1. **Apply the #53 proc to the live database — requires Oren's explicit go-ahead.**
   Follow the live-DB protocol: show the exact SQL (the body of
   `RideOnDB/StoredProcedures/PostgreSQL/Individual/183_usp_DeleteServiceProduct.sql`),
   get an explicit "go", apply via `apply_migration`, then re-read the deployed definition
   as proof. Run the side-effect-free smoke test from the companion first and confirm the
   rollback. Do NOT apply anything without the go-ahead.

2. **Verify E2E locally** (Oren provides host-secretary login). Backend `dotnet run`
   (stop any running instance so the binary unlocks), frontend `npm run dev` →
   http://localhost:5173.
   - CAP-1 (#56): Arenas & Stalls → "הוספת מתחם" opens the modal; Edit opens prefilled;
     Delete confirms + removes (or shows the booking-guard message).
   - CAP-2 (#53): Service Prices → delete an UNUSED service → succeeds.
   - CAP-3 (#53): Service Prices → delete a USED paid-time service (product 1 or 2) →
     clear Hebrew "יש להשבית אותו במקום זאת", no generic error, no crash.

3. **Ship in one deploy window.** The proc and the C# (DAL RN001 catch + controller
   `ValidationException` → `BadRequest`) must go live together (merge branch → Render) —
   see the deploy-coupling table. Confirm no other Claude Code session is active in the
   working tree, and get Oren's approval before merging to `main`.

## Guardrails

- Success = CAP-1/2/3 all demonstrated on the deployed system with no crash and no generic
  error (see SPEC "Success signal").
- Out of scope (do NOT expand into these): QA #69 onboarding UX; the Arena/Compound
  delete-controller message-swallowing follow-up; any cascade delete or financial-history
  destruction. These are explicit non-goals in the SPEC.
- If any acceptance criterion fails, stop and report — fix the implementation, not the spec.
