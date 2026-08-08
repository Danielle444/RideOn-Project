# Spec-Session Prompt — Admin Paid-Time redesign track

**For:** a `bmad-spec` session Oren will run. **Not** an implementation prompt.
**Produced by:** party-mode triage 2026-08-06 (branch `claude/payers-pay-time-ui-issues-a7a895`), verified live against source by three investigators.
**Companion required:** this spec session MUST emit `implementation-prompt.md` (the self-contained goal prompt a colleague runs cold), carrying the Colleague execution rules verbatim (bottom of this file).

---

## Why

The admin paid-time surfaces are half-migrated after the secretary "publish slots" workflow landed, and the payer-account paid-time tab has a dead Edit. Four low-risk FE bugs were **already fixed-now** on the triage branch and are OUT of this spec (see Non-goals). What remains is the heavier, backend-touching redesign Oren explicitly asked for.

## Context already verified (read vs inferred marked in the party transcript)

- **Payer-account ADD** = `PaidTimeCreateModal.jsx` → `CompetitionPaidTimeTab.jsx` → `CompetitionPaidTimeFormCard.jsx` (full sectioned form: date→time-of-day→arena→exact-time cascade, type cards, coach/horse/rider/payer, notes). Data hook `useAdminCompetitionPaidTimes.js`. This is the "correct" surface Oren wants everything to converge on.
- **Payer-account EDIT** = a *different*, sparse component `PaidTimeEditModal.jsx` (only notes + one slot radio + one type radio; no coach/rider/payer).
- **EDIT is dead** because proc `usp_getpayercompetitionaccount` (212) `paidTimes[]` JSON (source lines ~843-867) does **not** emit `canModify` / `canCancel` / `requestedCompSlotId` / `priceCatalogId`. `PaidTimeEditModal.jsx:71-72` reads `item.canModify`/`item.canCancel` → `undefined` → both selectors `disabled` (opacity 0.5). Only Notes is editable. It also shows a misleading locked reason `"נותרו <24h - שינוי סוג חסום"` (`PaidTimeEditModal.jsx:286`) when the true cause is "server didn't send the field."
- The **other** consumer, `AdminCompetitionPaidTimesScreen.jsx`, feeds `PaidTimeEditModal` from `getMyCompetitionPaidTimeRequests` (`/PaidTimeRequests/my-competition`), whose rows DO carry `canCancel` (`PaidTimeCardActions.jsx:10-11`). So the gating fields exist on one endpoint and not the other — an asymmetry to reconcile.
- **Admin-page ADD** (`AddPaidTimeButton.jsx`) navigates away to `AdminCompetitionRegistrations` paidTimes tab; it does NOT mount the in-place `PaidTimeCreateModal`. `PaidTimeCreateModal`'s payer lock is soft-gated on a truthy `lockedPayerPersonId` (`.jsx:84-102`, `payerFieldDisabled` at `:222`) — so mounting it with **no** `lockedPayerPersonId` *should* render a selectable payer dropdown, but that unlocked path is **exercised nowhere today** and is UNVERIFIED.
- **Schedule** (`PaidTimeScheduleView.jsx`): group key **fuses** date+time+arena into one string (`:148`), so there is no separate day level; group headers are plain `Text` (`:197-217`), not collapsible; only per-entry `ScheduleRow` collapses (`expandedIds` keyed by `paidTimeRequestId`, screen `:147`). No publish-state filter anywhere in the display path — `assignedSlotIsPublished` only exists on **assigned** rows and today only gates the per-row "eye" icon.

## Capabilities to spec (locked decisions)

1. **EDIT = ADD, full redesign.** Editing a paid-time reuses the ADD form (`CompetitionPaidTimeFormCard` via `CompetitionPaidTimeTab`/a create-modal-like shell) with **every existing choice pre-selected** (date/time-of-day/arena/exact-time, type, coach, horse, rider, payer, notes). `PaidTimeEditModal` is retired. Requires:
   - a **new paid-time UPDATE path** (the current hook only calls `createPaidTimeRequest`) — server `.cs` + a new/extended stored procedure;
   - **enriching proc 212** `paidTimes[]` with the IDs needed to hydrate + pre-select the form (`requestedCompSlotId`, `priceCatalogId`/product id, coach/trainer id, rider id, horse id if not already usable, payer person id) **and** `canModify`/`canCancel` for the edit gate;
   - form hydration from an existing request; edit-vs-create submit branch.
2. **Published/unpublished filtering — LOCKED by Oren.** The admin list/schedule MUST be filtered by publish state; that is the entire point of the secretary publish button. The admin sees **published** slots, not a mix. Filter on `assignedSlotIsPublished`. Apply to both the schedule view and the list view (confirm summary counts follow). **Sub-question the spec must still nail (not silently guess):** unassigned/pending requests have no slot and thus no publish state — the intended treatment is to KEEP pending/unassigned requests visible (they're the admin's own submitted-but-unscheduled requests) and apply "published-only" to *assigned* rows. Confirm this with Oren in the spec session; do not hide pending rows as a side effect of the publish filter.
3. **Day → slot → entry collapse** in `PaidTimeScheduleView`: split the fused key into day + slot levels, make both headers `Pressable`, add day/slot collapse state (extend `expandAll`/`collapseAll` beyond entry ids), decide default expanded/collapsed on load.
4. **Admin-page ADD reuses the in-place `PaidTimeCreateModal`** (no navigate-away, no mode chooser) with a **user-selectable payer** (mount without `lockedPayerPersonId`). STAGE-1 of implementation MUST verify the unlocked-payer path (dropdown populates from `paidTime.payers`, submit works with no lock) before relying on it.

## Constraints

- Backend touches: proc 212 enrichment + a paid-time update proc + `.cs`. Follow `ride-on-live-db-ops`: **capture the live proc bodies first** (212 AND the `/my-competition` proc that already returns `canCancel`) — the repo `.sql` is NOT proof of the deployed body. Show exact SQL, confirm with Oren, re-read after.
- After `.cs`: `dotnet build` in `RideOnServer/`, then grep for call paths bypassing the changed logic.
- The `paidTimes[]` binding in `DBServices` is positional — keep parameter order exact if the proc signature changes.

## Non-goals (already shipped fix-now on `claude/payers-pay-time-ui-issues-a7a895`; do NOT re-spec)

- Black-out on `סיום` — fixed by sequencing the nested-modal teardown (`PaidTimeCreateModal.jsx` `handleFinish` + `MODAL_TEARDOWN_DELAY_MS`).
- Bulk "כמה הזמנות יחד" remnant — gated behind `BULK_PAID_TIME_ENTRY_ENABLED` in `AddPaidTimeButton.jsx` (Add now goes straight to single).
- "כל הסלוטים שפורסמו" button removed from the admin paid-time page.
- Filter button copy → `"סינון"`.
- Deleting the dormant `paidTimeChatbot/` bulk wizard is NOT in scope (kept behind the flag per CAP-8).

## Open questions for the spec session to resolve

1. Published filter (base decision LOCKED: list IS filtered by publish state): confirm pending/unassigned rows stay visible, and whether summary counts follow the filter.
2. Collapse defaults across day/slot/entry on load.
3. Unlocked-payer submit path in `PaidTimeCreateModal` — verify before building admin-page reuse.
4. Fix the misleading `"נותרו <24h"` locked copy regardless, or is it moot once `PaidTimeEditModal` is retired?
5. Reconcile the endpoint asymmetry: enrich proc 212 to match `/my-competition`, or unify both surfaces on one enriched endpoint?

## Success signal

Admin edits a paid-time through the same rich form as Add, every existing selection pre-checked, and saves an update that persists. Schedule shows only published slots (per the decided rule) and collapses by day → slot → entry. Admin-page Add opens the in-place single form with a selectable payer.

---

## Colleague execution rules (must appear verbatim in `implementation-prompt.md`)

- New feature branch off `main`; never commit to `main`; never merge/integrate or delete branches without Oren's explicit approval; before any integration confirm no other session is active in the tree.
- Push everything to the **public** remote (`git push -u origin <branch>`) and open a PR against `main`.
- Investigate first: read the current file + the endpoint/proc it consumes before editing; mark verified vs inferred; flag path/spec corrections instead of silently fixing.
- Respect the tech boundary as scoped. If work seems to need something out of boundary, stop and raise it.
- After backend changes: `dotnet build` in `RideOnServer/`, then grep for bypassing call paths. For DB writes: follow `ride-on-live-db-ops` — show exact SQL, confirm, re-read after.
- Frontend: `npm run lint` + build in the relevant client before the PR (mobile has no local `node_modules` in the triage worktree — colleague must `npm install` first).
