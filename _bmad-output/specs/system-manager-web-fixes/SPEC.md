---
slug: system-manager-web-fixes
topic: SuperUser ("system manager") web app fixes — 5 live items + 1 scratched
companions:
  - decisions.md
  - frontend-changes.md
  - backend-changes.md
sources:
  - ../../../../zealous-euclid-264540/_bmad-output/specs/system-manager-web-fixes/BRIEF.md
---

# SPEC — System-Manager Web Fixes

## Why

The SuperUser ("system manager") web app has five defects/inconsistencies that a
party-mode triage locked into decisions: a failed super-user login bounces the
user off the screen, the payer-registrations tab errors with a 400, the admin
forms have drifted into three incompatible visual styles with no shared
primitive, the sidebar mislabels the section "system users" instead of "system
managers", and error/success messaging is copy-pasted inconsistently (sometimes
rendering a raw server object, sometimes silent on success). This spec distills
the locked BRIEF into an implementation contract a colleague can build cold, one
capability at a time.

All file:line anchors below were re-verified against live code in this worktree
during spec authoring; the BRIEF's `[read]` markings held.

## Capabilities

### CAP-1 — Failed super-user login stays on the login screen
- **intent:** A failed login (wrong credentials) keeps the user on the current
  login screen and shows the form's own Hebrew error, instead of hard-redirecting
  to `/login`. Session-expiry 401s on every *other* endpoint keep their current
  redirect behavior unchanged.
- **success:** Entering wrong super-user credentials shows the in-form error and
  the URL does not change; a real 401 on a data endpoint (e.g. expired token
  mid-session) still clears auth and lands on `/login`.
- Detail: [frontend-changes.md](frontend-changes.md#cap-1) · [decisions.md](decisions.md#d1)

### CAP-2 — Payer pending-registrations tab loads
- **intent:** `GET /Payers/pending-registrations` returns the pending list
  instead of 400 so the payer tab in `UserRequestsPage` renders its data. The
  fix is server/DB-side (controller action + `usp_GetPendingPayerRegistrations`);
  the failing toast is additionally hardened so it can never render a raw
  `.data` object.
- **success:** Opening the payer tab shows the pending-payer list (or a clean
  empty state) with no 400 in the console; if the endpoint ever does error, the
  toast shows a readable Hebrew string, never `[object Object]`.
- **Root cause CONFIRMED (live read, 2026-08-03):** the `public.registrationtoken`
  table is missing from live (repo migration `add_registration_token_table.sql`
  never applied); the proc INNER JOINs it and throws `42P01`, surfacing as the
  400. Fix = apply that migration (a live DB write, needs Oren's go-ahead). No C#
  change required. 4 procs + `systemuser.registrationcompleted` share the same
  gap.
- **Gate:** the only item requiring live DB access (a write).
- Detail: [backend-changes.md](backend-changes.md) · toast in [frontend-changes.md](frontend-changes.md#cap-2)

### CAP-3 — Shared SuperUser form system
- **intent:** Build reusable form primitives (`FormModal`, `FormField`,
  `TextInput`/`Select`/`Textarea`, boxed error) on the locked canon tokens, then
  migrate all 7 SuperUser forms onto them so every admin form is one visual
  system. FieldModal is a full rebuild (it is a structural relic); Judges is
  extracted from inline page markup into a modal; ClassTypeModal's two English
  labels are translated to Hebrew; CreateSuperUserModal is restyle-only and its
  credential wiring is never touched.
- **success:** All 7 forms render with identical shell/header/label/input/error/
  footer styling; `components/common/Field.jsx` is absorbed (no third label
  style survives); no English UI text remains in ClassTypeModal; the password
  fields in CreateSuperUserModal behave exactly as before (no autofill added, no
  value handling changed).
- Detail: [frontend-changes.md](frontend-changes.md#cap-3) · canon tokens + inventory in [decisions.md](decisions.md#d3)

### CAP-4 — "System users" → "System managers" rename
- **intent:** Rename the 4 Hebrew occurrences of "משתמשי מערכת" to "מנהלי מערכת"
  across the SuperUsers management surface, adjusting surrounding copy so each
  reads naturally.
- **success:** Title, subtitle, empty-state, and sidebar label all read "מנהלי
  מערכת"; the section now matches `LoginScreen.jsx`'s existing "מצב מנהל מערכת" /
  "כניסת מנהל מערכת" wording; no occurrence of "משתמשי מערכת" remains in the
  SuperUser surface.
- Detail: [frontend-changes.md](frontend-changes.md#cap-4)

### CAP-5 — Message-standardization contract (all SuperUser pages)
- **intent:** Introduce one shared error-extraction helper that always returns a
  string from an axios error (object/string/network cases handled), and apply a
  consistent messaging contract across every SuperUser page: a success
  `ToastMessage` on every mutating action, a standard error surface on every
  mutating action, and no remaining `alert()` calls.
- **success:** No SuperUser page passes `err.response?.data` straight into a
  toast/error setter; every create/update/delete/approve/reject produces a
  visible success toast and a readable error surface on failure; the ~4 `alert()`
  calls in scope are replaced.
- Detail: [frontend-changes.md](frontend-changes.md#cap-5) · helper contract in [decisions.md](decisions.md#d5)

### CAP-6 — Fines stay edit-only (no change) — SCRATCHED
- **intent:** Explicitly make NO code change to Fines. Fines are auto-applied by
  `BL/Services/FineResolver.cs` against active policies + a fixed trigger
  vocabulary; a superuser-authored fine would be a dead row. `FinesController`
  correctly exposes only GET+PUT, and `FinesTable.jsx` already uses the shared
  product-table primitives.
- **success:** Fines CRUD is not added; this capability exists only to record the
  decision so it is not re-litigated a fourth time.
- Detail: [decisions.md](decisions.md#d6)

## Constraints

- **The 401 fix must be scoped to auth requests only.** The global interceptor's
  session-expiry redirect (`axiosInstance.js:25-29`) is correct for every
  non-auth endpoint and must keep working; CAP-1 opts *auth* calls out of the
  redirect branch, it does not remove or weaken it. (`authService.js` confirmed
  to use the same shared `axiosInstance`, so a config marker or auth-URL match on
  the login requests is viable.)
- **CAP-2 is DB-drift-gated.** The deployed DAL (`PayerDAL.cs:466-507`) reads 10
  columns by name; a live proc that renamed/dropped/retyped any of them throws
  and surfaces as the observed 400. Capture the live `usp_GetPendingPayerRegistrations`
  body with `pg_get_functiondef` before any edit; changes to a live proc must
  stay backward-compatible with the currently deployed backend.
- **CAP-3 is extraction, not per-form patching.** The canon tokens are locked
  (see decisions.md#d3); build the primitives once and migrate, do not hand-align
  each modal. `Field.jsx` is reconciled to the canon label style and absorbed,
  not left as a fourth variant.
- **CreateSuperUserModal: restyle inputs only.** Never wire autofill, never touch
  credential values or password-field handling.
- **All new/changed Hebrew user-facing strings require Oren's approval** before
  they ship (rename copy, translated ClassType labels, any new toast text).
- **CAP-3 must preserve each form's complex non-canon layout:** keep
  ReiningPatternModal's maneuver-table dual-pane; migrate only its simple fields.

## Non-goals

- Secretary pages — phase-2 candidate for both the message contract (CAP-5) and
  form-primitive adoption (CAP-3). Not in this spec.
- Mobile app — untouched.
- Fines CRUD — scratched (CAP-6); do not add POST/DELETE to fines.
- Changing the global 401 session-expiry redirect for non-auth endpoints.
- Filter/search inputs (`RequestsFiltersBar.jsx`, page selects) — align only if
  trivial; not required.

## Success signal

A colleague implements all 5 live items from these files alone (no triage
conversation): failed super-user login shows an in-place error without a URL
change; the payer tab loads its list with no 400; all 7 SuperUser forms render as
one visual system with no English labels and no surviving third label style; the
SuperUsers surface reads "מנהלי מערכת" everywhere; and every SuperUser mutation
shows a success toast on success and a readable string on failure with zero raw
`.data` objects and zero `alert()` calls. Fines are unchanged.

## Open questions

- **OQ-1 (CAP-2): RESOLVED (2026-08-03).** Live read confirmed the 400 is
  `42P01 relation "public.registrationtoken" does not exist` (29 occurrences in
  last-24h prod logs). Not DAL drift, not FE. Fix = apply repo migration
  `add_registration_token_table.sql` to live (creates the table +
  `systemuser.registrationcompleted`). Remaining decision for Oren: approve the
  live write. See backend-changes.md.

## Assumptions

- **A-1 (CAP-1):** Flagging the two auth POSTs (`/SystemUsers/login`,
  `/SuperUsers/login`) is sufficient; other auth-adjacent calls
  (forgot/reset/OTP) are not part of the reported bounce and are left on default
  behavior unless the implementer finds they share the symptom.
