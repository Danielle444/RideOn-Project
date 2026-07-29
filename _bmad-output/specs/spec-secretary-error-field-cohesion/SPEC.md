---
id: SPEC-secretary-error-field-cohesion
companions:
  - error-convention.md
  - change-list.md
  - hebrew-strings.md
  - implementation-handoff.md
sources: []
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents (the secretary-qa-cleanup triage) are for traceability only.

# Secretary Web — Error Handling & Required-Field Cohesion

## Why

A **pain to solve**, and the core of Oren's "cohesive presentation" priority. The secretary web app surfaces errors three different ways depending on which screen a user is on — a fixed page toast here, an ad-hoc red block there, small inline text in a third place — and required fields are marked inconsistently (a shared asterisk exists but only a handful of forms use it). The judge form is the sharpest edge: any save failure collapses to one generic Hebrew catch-all with no indication of which field is wrong. The result reads as unfinished software to a secretary who moves between forms all day. Everything needed to fix this already exists in the codebase (a `required` asterisk in `Field.jsx`, an inline field-error pattern in the class modal, a `ToastMessage` component, three copies of one `getErrorMessage` helper); the work is to pick one convention for each surface and apply it everywhere, not to build new machinery. Retires tracker tickets **#55** (umbrella), **#5**, **#2**, **#4**, optionally **#17**.

## Capabilities

- **CAP-1 — One inline field-error treatment**
  - **intent:** A secretary sees the specific field that failed validation flagged inline, directly under that field, with identical presentation on every form in the app.
  - **success:** Every form's per-field validation error renders through the single agreed inline treatment (the `mt-1.5 text-right text-xs text-red-600` under-field pattern already in `ClassInCompetitionModal.jsx:548-552`); no form renders a bespoke inline error style. Demonstrable by triggering a field error on the judge form and the class form and seeing identical treatment.

- **CAP-2 — One global / page-level error treatment (uniform with existing forms)**
  - **intent:** A secretary sees asynchronous / submit-level failures (load failed, save rejected by server) in one consistent surface, distinct from inline field errors.
  - **success:** Matches the pattern the class form already uses (verified): a form-submit rejection surfaces as **both** the in-modal banner (`props.error`, error palette) **and** a page error `ToastMessage`, both fed by the same `getErrorMessage` string. Page-only async failures (list load, delete) use `ToastMessage`. No screen invents a fourth surface. Rule written in `error-convention.md`.

- **CAP-3 — Cohesive Hebrew error/label copy**
  - **intent:** Error and required-field copy reads in one consistent Hebrew voice across the app.
  - **success:** Every proposed or changed Hebrew string appears in `hebrew-strings.md` for Oren's sign-off; no string ships until approved. (Existing approved strings are carried forward unchanged.)

- **CAP-4 — App-wide required-field asterisk (#2)**
  - **intent:** A secretary can tell at a glance which fields are mandatory on every form, via the same red asterisk.
  - **success:** Every field that a form's own save/continue validation treats as mandatory is marked with the `Field.required` asterisk (or the equivalent inline asterisk where a form does not use `Field`). The enumeration in `change-list.md` is complete and each marked field maps to a validation rule. Arena / StallCompound / ServiceProduct modals already comply and are left unchanged.

- **CAP-5 — Judge form field-specific errors; English/country optional (#5)**
  - **intent:** A secretary saving a judge sees which Hebrew-name field is missing (not a generic error), and can save with English names and country left blank.
  - **success:** Empty Hebrew first/last name each produce a field-specific inline error (CAP-1 treatment) before submit; the generic catch-all in `useJudgeCreation.js:68` no longer fires for a missing mandatory field. English first/last name and country save successfully when blank. **Confirmed frontend-only — the server already accepts empty English/country (see `change-list.md` §Server confirmation).**

- **CAP-6 — Closing-date picker guards invalid dates immediately, both bounds (#4)**
  - **intent:** A secretary picking the registration-closing date on a competition (create or edit) is prevented from — or told immediately about — a date that falls outside its valid window, instead of only being blocked at save.
  - **success:** The registration-end date input carries a `min` bound (registration-open date) **and** a `max` bound (competition-start date — registration closes before the competition begins), **and** shows an immediate inline invalid-date message when an out-of-window date is chosen, on **both create and edit** (shared `CompetitionDetailsSection.jsx`). The existing save-time rule (`competitionForm.utils.js:165-171`) still holds as backstop; a matching competition-start backstop is added.

- **CAP-7 — Prize-type dropdown blocks duplicates at entry (#17)**
  - **intent:** A secretary adding prize rows to a class only sees prize types not already chosen in another row, so duplicates cannot be entered.
  - **success:** Each prize-row `CustomDropdown` in `ClassInCompetitionModal.jsx` offers only prize types unused by sibling rows. The save-time duplicate rejection (`validatePrizeRows` lines 124-128) remains as backstop.

- **CAP-8 — Single `getErrorMessage` helper**
  - **intent:** All error-message extraction flows through one shared helper so every surface derives the user-facing string the same way.
  - **success:** The three independent definitions (`competitionForm.utils.js:88`, `useCompetitionPaymentsPage.js:34`, `WorkersManagementPage.jsx:108`) collapse to one shared helper (the superset behavior of the richest copy); all ~19 importing files reference it; `npm run build` and `npm run lint` pass.

## Constraints

- **The convention is chosen from what already exists, not invented.** Inline = the class-modal `text-xs text-red-600` under-field pattern; page = `ToastMessage`; asterisk = `Field.required` (`Field.jsx:34`). Do not introduce a new component library or a competing style.
- **No Hebrew string ships without Oren's sign-off.** `hebrew-strings.md` is the gate.
- **Frontend-only.** The server is not touched: #5's optionality was confirmed live to need no backend/proc/DB change. Build/verify gate is web `npm run build` + `npm run lint`; no `dotnet build` required.
- **Backward-compatible presentation.** Existing approved strings and the already-compliant forms (Arena/StallCompound/ServiceProduct) stay unchanged; this is additive cohesion, not a redesign.

## Non-goals

- Web button cohesion (103 raw `<button>` files, no shared primitive) — separate future spec.
- #57 gender dropdown — global sibling pattern, done after this lands, not here.
- Loading-vs-missing states, cosmetic fixes, backend date-filter overlap semantics, and repo hygiene — those are Specs 2 and 3.
- Any change to the backend judge validation, proc, or `judge` table.
- Rewriting `ClassInCompetitionModal` / `PaidTimeSlotInCompetitionModal` validation architecture — they already embody the target inline pattern and are the reference, not the work.

## Success signal

A secretary moving between the judge form, the class form, the competition-details form, and the superuser management forms experiences one consistent language of errors: mandatory fields wear the same asterisk, a bad field lights up inline in the same way everywhere, and load/save failures always appear in the same page surface. Saving a judge with blank English names succeeds; saving one with a blank Hebrew name points at exactly that field. Picking a closing date before the registration-open date is caught at the picker, not deferred to save.

## Assumptions

- Field-using forms already carrying `required` (Arena, StallCompound, ServiceProduct modals) are correct and out of the change set. `RegisterScreen.jsx` and `ChangePasswordPage.jsx` use `Field` but their per-field asterisk state was not individually verified this session — implementation must confirm.
- The full per-field mandatory list for forms that do **not** use `Field` is enumerated at the form level in `change-list.md`; the exact field-by-field marking is finalized during implementation by walking each form's save/continue validation (the source anchors are given).

## Open Questions

<!-- Resolved by Oren 2026-07-29: CAP-2 = match existing forms (in-modal banner + page toast, same string); CAP-7 = in scope now; CAP-6 = guard both bounds (registration-open min, competition-start max), both create + edit. -->

- **Hebrew copy:** the proposed strings in `hebrew-strings.md` still need Oren's line-by-line approval before CAP-1/3/5/6 finalize.
