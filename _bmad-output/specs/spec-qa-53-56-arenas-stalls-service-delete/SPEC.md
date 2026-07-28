---
id: SPEC-qa-53-56-arenas-stalls-service-delete
companions:
  - migration-and-deploy.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# QA #53 / #56 — Arenas & Stalls Compound Actions + Service Delete

## Why

Two host-secretary (`מזכירת חווה מארחת`) defects in the web app, both blocking real setup and maintenance workflows. **QA #56:** on the Arenas & Stalls page, the stall-compound Add / Edit / Delete controls were wired to no-op functions while working handlers already existed in `useArenasAndStallsPage` — the entire compound section was dead (the arena section above it worked). **QA #53:** on the Service Prices page, "delete service" never worked — the live-only proc `usp_deleteserviceproduct` guarded usage with `productrequest.productid`, a column that does not exist, throwing SQLSTATE 42703 on every delete past the stall guard; and `DELETE FROM pricecatalog` had no guard against the `paidtimerequest` FK, so a used paid-time product FK-exploded (23503) even once the column bug was fixed; the controller then swallowed the DB message into a generic Hebrew string, so the secretary never learned why. Both fixes are committed on branch `fix/qa-53-56-arenas-stalls-service-delete`; the #56 fix is live-ready, but the #53 proc is **not yet applied to the live database**. This spec is the acceptance contract for finishing #53/#56 — applying the proc and shipping — not for the deferred QA #69 onboarding work.

## Capabilities

- **CAP-1** — Arenas & Stalls compound actions (QA #56, implemented)
  - **intent:** A secretary can add, edit, and delete stall compounds on the Arenas & Stalls page.
  - **success:** "הוספת מתחם" opens the create modal; Edit opens the modal prefilled; Delete confirms then removes the compound (or shows the booking-guard message). No dead controls.

- **CAP-2** — Delete an unused service product (QA #53)
  - **intent:** A secretary can delete a service product that has never been used, and it is removed without touching financial history.
  - **success:** Deleting a product with zero stalls and zero orders removes its `product` / `pricecatalog` / `paidtimeproduct` rows and returns success — no crash, no residual references.

- **CAP-3** — Block deletion of an in-use service product (QA #53)
  - **intent:** When a secretary tries to delete a service product that is assigned to stalls or has been ordered (via `productrequest` or `paidtimerequest`), the delete is blocked with a clear Hebrew "deactivate instead" message and no data loss.
  - **success:** Deleting an in-use product (e.g. paid-time product 1 or 2) surfaces the Hebrew guard text via `BadRequest` — no SQLSTATE 42703/23503 crash, no generic error string, and financial history stays intact.

## Constraints

- Block-and-redirect, never cascade: used products are deactivated, not deleted; the delete path never destroys financial history.
- Usage is detected through `pricecatalog` for **both** request types (`productrequest.pricecatalogid` and `paidtimerequest.pricecatalogid`) — the old `productrequest.productid` column does not exist and was the 42703 crash.
- Honest error surfacing: the proc raises SQLSTATE `RN001` → `ServicePriceDAL` rethrows `BL.ValidationException` → `ServicePricesController` returns `BadRequest(message)`. The Hebrew guard text must reach the user, not a generic fallback string.
- Deploy coupling: fully-correct behavior requires **both** the new proc applied live **and** the C# deployed (merge → Render) in the same deploy window. Neither ordering degrades below today's behavior. See `migration-and-deploy.md`.
- Live-DB protocol: the proc is applied via show-SQL → Oren's explicit go-ahead → `apply_migration` → re-read + side-effect-free smoke test; the exact currently-deployed rollback body is captured before applying. See `migration-and-deploy.md`.

## Non-goals

- QA #69 — onboarding/empty-state UX for the Arenas & Stalls page. Deliberately excluded; parked as a separate item.
- Applying the `RN001` / `ValidationException` honesty pattern to the Arena and Stall-Compound delete controllers. Scoped to the service page only; their procs already raise Hebrew guards that still get swallowed — a known, accepted follow-up, not part of this work.
- Cascade deletion of used products or any destruction of financial history.

## Success signal

On the deployed system, a host secretary adds, edits, and deletes stall compounds with no dead controls; deletes an unused service and it disappears; and when she tries to delete a used service, gets a clear Hebrew "deactivate instead" message — no crash, no generic error.

## Assumptions

- The C# changes (`ServicePriceDAL` RN001 catch, `ServicePricesController` `ValidationException` → `BadRequest`) are committed and compile clean (handoff reports `dotnet build` passing with only running-instance file-lock noise). This spec treats them as the backend contract to deploy alongside the proc.
