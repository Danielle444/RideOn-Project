# Implementation handoff — Secretary error & required-field cohesion

Paste everything below the line into a fresh Claude Code session in the RideOn repo. It is self-contained: the only external things it relies on are two globally-installed skills. Hand it over as-is.

---

## GOAL

Make error handling and required-field indication **cohesive across the secretary web app**, and fix the judge form's generic error — by applying conventions that **already exist in the codebase**, not by building new machinery. This is frontend-only. When you are done, a secretary moving between forms sees one consistent language of errors: the same required-field asterisk, the same inline field-error, the same submit-failure surface everywhere.

Retires tracker tickets **#55** (umbrella), **#5**, **#2**, **#4**, **#17**, plus a `getErrorMessage` dedupe.

## LOAD FIRST (both are global skills — load them before touching code)

- `ride-on-system-knowledge` — system facts (schema, procs, conventions). Read the "Add Class Form Conventions", "Multiple Prizes Per Class", and "UI Investigation Pattern" sections.
- `ride-on-live-db-ops` — only if you end up needing a live DB check. You should NOT need one: the single server question in this work is already answered below.

## GROUND RULES (from Oren's working protocol — non-negotiable)

- **Investigation-first.** For each ticket, read the anchor files before editing. Mark what you read vs inferred. Show diffs before applying.
- **Branch gating.** Before writing ANY file, run `git status` and `git branch`, report the branch, and create/switch to a feature branch off `main` (e.g. `feature/secretary-error-field-cohesion`). Never work on `main`. Never merge or switch to main yourself — the repo has a git-protection hook that blocks it; hand merge commands to Oren.
- **Frontend-only.** Do NOT touch the server, procs, or DB. The one server question (#5) is resolved below — no `dotnet build` needed.
- **Hebrew strings need Oren's sign-off.** Every user-facing Hebrew string you add or change must be on the approval list at the end of this prompt. Do not invent new Hebrew copy beyond that list without asking.
- **Web app root:** `RideOnClient/rideon-client/web/`. All `src/` paths below are under `RideOnClient/rideon-client/web/src/`.

## CONTEXT YOU CAN TRUST (verified 2026-07-29 — do not re-derive)

**The conventions already exist; your job is to apply them everywhere, uniformly.**

1. **Inline field error (the ONE treatment):** the pattern in `components/secretary/ClassInCompetitionModal.jsx:548-552` —
   ```jsx
   {fieldErrors.<key> ? (
     <div className="mt-1.5 text-right text-xs text-red-600">{fieldErrors.<key>}</div>
   ) : null}
   ```
   driven by a `FIELD_VALIDATION_RULES` array (line 13). `PaidTimeSlotInCompetitionModal.jsx` uses the same. These two are the REFERENCE — leave them as-is and match them elsewhere.

2. **Submit-rejection surface (the ONE pattern, keep uniform):** a form-submit rejected by the server surfaces as **BOTH** an in-modal banner **AND** a page error toast, both fed by the **same `getErrorMessage` string**. Verified: `useSecretaryCompetitionClassesPage.js:471-475` does `setClassModalError(msg)` + `showToast("error", msg)`; the banner renders at `ClassInCompetitionModal.jsx:891-893` (`props.error`, palette `border-[#E7BABA] bg-[#FDF4F4] text-[#A54848]`); `pages/superuser/JudgesManagementPage.jsx` already matches. Any form you touch must follow this exact dual-surface pattern. Page-only async ops (list load, delete) use the page toast alone.

3. **Page toast component:** `components/common/ToastMessage.jsx` (error + success variants), driven by `showToast(type, message)`.

4. **Required asterisk:** `components/common/Field.jsx:34` already renders `{props.required && <span className="text-red-500 mr-0.5">*</span>}`. Passing `required` to a `Field` is the whole mechanism. For a form that does NOT use `Field`, add the identical span to its raw `<label>`: `<span className="text-red-500 mr-0.5">*</span>`. The marker must be identical everywhere. A field is "required" iff the form's own save/continue validation rejects it when empty.

5. **SERVER CONFIRMATION for #5 (verified live):** `judge.firstnameenglish / lastnameenglish / country` are all nullable, the `judge` table has **zero CHECK constraints**, `BL/Judge.cs ValidateJudge` (lines 71-85) requires only Hebrew first/last + at least one field, and `usp_insertjudge` does a plain INSERT. **Making English/country optional needs NO backend/proc/DB change.** #5 is entirely frontend.

## TASKS (each phrased as a goal; implement in this order)

### T1 — Dedupe `getErrorMessage` to one shared helper
- **Goal:** all error-message extraction flows through one helper.
- Three independent defs exist: `utils/competitionForm.utils.js:88` (the **richest** — handles string, `response.data.errors` ModelState dict, `response.data` string, `response.data.title`, `error.message`, fallback), `hooks/secretary/useCompetitionPaymentsPage.js:34` (subset), `pages/secretary/WorkersManagementPage.jsx:108` (minimal `response.data || fallback`).
- Adopt the richest as the single shared helper. Remove the other two local defs and repoint their callers. ~19 files import `getErrorMessage` — repoint all to the one source. Keep the export name stable so imports change path only.
- **Done when:** one definition remains, all importers resolve, `npm run build` + `npm run lint` pass.

### T2 — Required-field asterisk everywhere (#2)
- **Goal:** every mandatory field on every secretary/superuser form wears the same asterisk.
- **Already compliant — DO NOT change:** `components/secretary/arenas-stalls/ArenaModal.jsx`, `StallCompoundModal.jsx`, `components/secretary/service-prices/ServiceProductModal.jsx` (they pass `Field required`).
- **Mark these (walk each form's validation, mark exactly the fields it rejects when empty):**
  - `components/common/JudgeModal.jsx` → שם פרטי בעברית, שם משפחה בעברית, ענפים (at least one). English names + מדינה stay UNMARKED.
  - `components/secretary/ClassInCompetitionModal.jsx` → סוג מקצה, מגרש, עלות מארגן, עלות התאחדות (`FIELD_VALIDATION_RULES` line 13). Judge and date are NOT required.
  - `components/secretary/PaidTimeSlotInCompetitionModal.jsx` → per its `FIELD_VALIDATION_RULES`.
  - `components/secretary/competition-form/CompetitionDetailsSection.jsx` → שם תחרות, ענף, תאריך התחלה, תאריך סיום (`validateDetailsForm` in `utils/competitionForm.utils.js:144-182`). Registration/paid-time dates optional.
  - `components/secretary/shavings/AddShavingsOrderModal.jsx` → ranch (mandatory, #32).
  - Superuser modals — read each and mark per its validation: `components/superuser/ClassTypeModal.jsx`, `FieldModal.jsx`, `FineModal.jsx`, `PrizeTypeModal.jsx`, `ReiningPatternModal.jsx`, `CreateSuperUserModal.jsx`.
  - `pages/secretary/WorkersManagementPage.jsx` — per its inline form validation.
  - Confirm (they use `Field`): `pages/auth/RegisterScreen.jsx`, `pages/shared/ChangePasswordPage.jsx` — verify `required` is already passed; add where missing.
- **Done when:** every field the form rejects-when-empty is marked with the identical asterisk; no unmarked required field; no marked optional field.

### T3 — Judge form field-specific errors (#5)
- **Goal:** a missing Hebrew name points at that field; English/country save blank.
- In `components/common/JudgeModal.jsx`: add a `FIELD_VALIDATION_RULES`-style check for empty Hebrew first/last (and ≥1 ענף) BEFORE `props.onSubmit` (currently `handleSubmit` at line 82 submits unconditionally). Render field-specific inline errors using the T-context inline treatment. Leave English/country inputs optional (they already omit `required`).
- The generic catch-all in `hooks/common/useJudgeCreation.js:68` and the `JudgesManagementPage` submit path stay only as the true-server-error fallback (per the dual-surface pattern in Context #2) — they must no longer be what a user sees for a missing mandatory field.
- **Done when:** blank Hebrew name → specific inline error, no generic message; blank English/country → saves fine.

### T4 — Closing-date picker guards both bounds, create + edit (#4)
- **Goal:** the registration-closing date can't be set outside its window at the picker, on both create and edit.
- In `components/secretary/competition-form/CompetitionDetailsSection.jsx` (date inputs 111-184; registrationEnd at 153-156, registrationOpen at 139-142, competitionStart at 111-114): on the registration-end input add **`min={registrationOpenDate}` AND `max={competitionStartDate}`**, and show an **immediate inline invalid-date message** when out of window. Only apply a bound when its reference date is set (both may be blank).
- Backstops in `utils/competitionForm.utils.js validateDetailsForm`: the registrationEnd < registrationOpen rule exists at 165-171; **add** a registrationEnd > competitionStart backstop for parity.
- Shared component → create and edit are both covered by one change; verify both flows.
- **Done when:** picking a closing date before registration-open OR after competition-start is caught inline on both create and edit; save-time backstops hold.

### T5 — Prize-type dropdown blocks duplicates at entry (#17)
- **Goal:** each prize row only offers prize types not already chosen in a sibling row.
- In `components/secretary/ClassInCompetitionModal.jsx`: the prize-row `CustomDropdown` (~line 744, `options={prizeTypes}`) should filter its `options` per row to prize types unused by other rows. Keep the save-time duplicate rejection (`validatePrizeRows` lines 124-128) as backstop.
- **Done when:** a prize type chosen in one row disappears from the other rows' dropdowns; duplicates are impossible to enter.

## HEBREW STRINGS — need Oren's sign-off before finalizing (do not ship unapproved)

Carried forward unchanged: all existing `FIELD_VALIDATION_RULES` strings, the class-form summary `המקצה לא נשמר. יש למלא את השדות המסומנים.`, and the `validateDetailsForm` date messages (including `תאריך סגירת הרשמה לא יכול להיות לפני תאריך פתיחת הרשמה`).

Proposed NEW (pending approval — ask Oren before finalizing):
1. `יש להזין שם פרטי בעברית` — judge, empty Hebrew first name
2. `יש להזין שם משפחה בעברית` — judge, empty Hebrew last name
3. `יש לבחור לפחות ענף אחד` — judge, no ענפים selected
4. `השופט לא נשמר. יש למלא את השדות המסומנים.` — judge form-level summary
5. (reuse the carried registration-open string verbatim for the lower-bound closing-date message)
6. `תאריך סגירת ההרשמה חייב להיות עד תחילת התחרות` — closing-date upper bound vs competition start

## ACCEPTANCE / VERIFY

- `cd RideOnClient/rideon-client/web && npm run build && npm run lint` — both clean.
- Server untouched → no `dotnet build`.
- Auth-gated pages: Claude Code cannot log in. Verify visually via Claude-in-Chrome on Oren's logged-in session, or a temporary `src/pages/_devtest/` harness route (see `ride-on-system-knowledge` → "UI Investigation Pattern"); remove any harness before finishing.
- Report: branch name, commit hashes, files changed per ticket, and the final Hebrew-string list for Oren's approval.
