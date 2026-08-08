# Frontend Changes — System-Manager Web Fixes

All paths are under `RideOnClient/rideon-client/web/src/`. Line numbers were
verified against this worktree during spec authoring; treat them as anchors, not
guarantees — re-grep before editing.

FE items: CAP-1 (401 interceptor), CAP-3 (form-system extraction), CAP-4
(rename), CAP-5 (message contract), plus CAP-2's toast hardening. Recommended
order (trivial-first): CAP-4 → CAP-1 → CAP-3 → CAP-5 → CAP-2.

---

## CAP-1 — Auth calls opt out of the global 401 redirect {#cap-1}

**File:** `services/axiosInstance.js` (interceptor at lines 20-37; 401 branch at
`:25-29`).

Current behavior: the response interceptor redirects to `/login` on *any* 401.
`authService.js` imports this same instance (`import axios from "./axiosInstance"`),
so its `login`/`loginSuperUser` POSTs pass through the interceptor and a
wrong-password 401 triggers the redirect before `AuthContext.jsx:155`'s catch can
surface the Hebrew error.

**Change:** make the 401 redirect branch skip auth requests. Two viable
mechanisms (implementer's choice; confirm against the actual request configs):

- **Config marker:** have `authService.login`/`loginSuperUser` pass a custom
  axios config field (e.g. `{ skipAuthRedirect: true }`) and guard the redirect
  with `if (status === 401 && !error.config?.skipAuthRedirect)`.
- **URL match:** in the interceptor, skip the redirect when
  `error.config?.url` ends with `/SystemUsers/login` or `/SuperUsers/login`.

Leave the 403 branch (`:31-33`) and the non-auth 401 redirect intact.

**Acceptance:** wrong super-user credentials → in-form Hebrew error, URL
unchanged. A 401 on a data endpoint (expired token) → still clears auth, still
redirects to `/login`.

**Note (A-1):** scope is the two login POSTs. forgot/reset/OTP calls are not part
of the reported bounce; extend only if the implementer finds they share it.

---

## CAP-2 — Payer toast hardening {#cap-2}

**File:** `pages/superuser/UserRequestsPage.jsx` — `loadData` catch at `:116-117`
(toast at `:117`), plus the approve/reject/undo catches at `:189`, `:224`, `:259`.

`:117` does `showToast("error", err.response?.data || "…")`. On a 400,
`err.response.data` can be an **object**, rendering unhelpfully or breaking the
toast. Replace with the CAP-5 shared helper:
`showToast("error", getApiErrorMessage(err, "אירעה שגיאה בטעינת הרשמות משלמים ממתינות"))`.
Apply the same to `:189`, `:224`, `:259`. (This page is also part of the CAP-5
sweep; doing it here satisfies both.)

The server-side 400 root cause is in [backend-changes.md](backend-changes.md).

---

## CAP-3 — SuperUser form-system extraction {#cap-3}

Build the primitives once on the locked canon tokens (full token list:
[decisions.md#d3](decisions.md#d3)), then migrate all 7 forms. This is
extraction, not per-form alignment.

### Primitives to build (suggested location `components/common/form/`)
- **`FormModal`** — backdrop + canon shell (header/body/footer). Props: `title`,
  `onClose`, `onSubmit`, `isSaving`, `submitLabel`, `cancelLabel`, `error`,
  `children`.
- **`FormField`** — label + required asterisk + optional info popup + error slot.
  **Absorb `components/common/Field.jsx`** (reconcile its `text-xs/#4E342E` label
  to the canon `text-sm font-semibold text-[#5D4037]`); update `Field.jsx`'s
  existing importers or re-export from the new primitive to avoid breaking them.
- **`TextInput` / `Select` / `Textarea`** — the canon input styling in one place.
- **Boxed error** component — the canon error surface (reused by CAP-5).

### Migration inventory (7 forms)
1. **`components/superuser/PrizeTypeModal.jsx`** — house style already; use as the
   reference exemplar, then migrate onto the primitive.
2. **`components/superuser/FineModal.jsx`** — house style (edit-only); migrate.
   Do not add create/delete (CAP-6).
3. **`components/superuser/ClassTypeModal.jsx`** — migrate + **translate two
   English labels to Hebrew (needs Oren approval):**
   - `:94` `"Judging Sheet Format"`
   - `:106` `"תיאור / Qualification"`
4. **`components/superuser/ReiningPatternModal.jsx`** — migrate the simple fields
   only; **keep the maneuver-table dual-pane layout** as-is.
5. **`components/superuser/FieldModal.jsx`** — **full rebuild** on the primitives.
   It is a structural relic (flat `p-6`, no border/shadow, `text-xl` title, bare
   `<X/>`, bare-`border` input with no bg/shadow/focus ring, plain-text error,
   `py-2` no-hover buttons). Rebuild to the canon; preserve its fields/validation
   behavior.
6. **Judges — extract inline form to a modal.** The form currently lives inline
   in `pages/superuser/JudgesManagementPage.jsx` (there is no Judges *modal*
   component; `components/superuser/JudgesTable.jsx` is the table only). Create a
   `JudgesModal.jsx` on the primitive and wire it into the page; move the inline
   add/edit fields into it.
7. **`components/superuser/CreateSuperUserModal.jsx`** — migrate shell/inputs
   only. **Never wire autofill; never touch credential values or password-field
   handling.** Restyle the visual layer, leave the auth logic byte-for-byte.

### Low priority (only if trivial)
`components/superuser/RequestsFiltersBar.jsx` and page `<select>`s already use
`#D8CBC3`+ring inputs; align to the primitive only if it is a trivial swap.

**Acceptance:** all 7 forms share one shell/header/label/input/error/footer; no
third label style survives; ClassTypeModal has no English UI text;
CreateSuperUserModal's password behavior is unchanged; ReiningPatternModal's
maneuver table still works.

---

## CAP-4 — Rename "משתמשי מערכת" → "מנהלי מערכת" {#cap-4}

Four verified occurrences — rename all, adjusting surrounding copy to read
naturally (needs Oren approval on final wording):

- `pages/superuser/SuperUsersManagementPage.jsx:98` — title `משתמשי מערכת` → `מנהלי מערכת`
- `pages/superuser/SuperUsersManagementPage.jsx:101` — subtitle `צפייה במשתמשי מערכת קיימים ויצירת משתמש חדש` → `...מנהלי מערכת קיימים...`
- `components/superuser/SuperUsersTable.jsx:39` — empty-state `עדיין לא קיימים משתמשי מערכת להצגה` → `...מנהלי מערכת...`
- `components/superuser/superUserMenu.js:14` — sidebar label `משתמשי מערכת` → `מנהלי מערכת`

**Acceptance:** no occurrence of "משתמשי מערכת" remains in the SuperUser surface;
wording matches `LoginScreen.jsx`'s "מצב מנהל מערכת" / "כניסת מנהל מערכת".

---

## CAP-5 — Message-standardization contract {#cap-5}

### Step 1 — the shared helper
Add one helper (suggested `services/apiError.js` or `utils/apiError.js`), e.g.
`getApiErrorMessage(error, fallback)` that always returns a **string**:
- `error.response?.data` is a string → return it
- `error.response?.data` is an object → prefer `.title`, then `.message`, then
  `fallback` (never return the object)
- no `error.response` (network/timeout) → `fallback`

Model it on the ad-hoc extraction already at
`pages/superuser/FieldsManagementPage.jsx:149-151`.

### Step 2 — apply across SuperUser pages
Replace every `err.response?.data || "<fallback>"` with
`getApiErrorMessage(err, "<fallback>")`, and ensure every mutating action has a
success `ToastMessage` and a standard error surface. Verified occurrences to
sweep:

- `pages/superuser/ClassesManagementPage.jsx` — `:47`, `:58` (loads), `:152`
  (save → `setError`), `:170` (delete)
- `pages/superuser/FieldsManagementPage.jsx` — `:47` (load), `:149-151` (the
  ad-hoc helper → replace with shared), `:175` (delete)
- `pages/superuser/FinesManagementPage.jsx` — `:31` (load), `:105` (save →
  `setError`)
- `pages/superuser/PrizesManagementPage.jsx` — `:44` (load), `:132` (save →
  `setError`), `:150` (delete)
- `pages/superuser/SuperUsersManagementPage.jsx` — `:41` (load), `:85` (create →
  `setCreateErrorMessage`)
- `pages/superuser/UserRequestsPage.jsx` — `:117`, `:189`, `:224`, `:259` (shared
  with CAP-2)

Then confirm each of these pages fires a success toast on every
create/update/delete/approve/reject. Replace any remaining in-scope `alert()`
calls (the ~4 known are mostly secretary-side and out of scope — verify none
remain on SuperUser pages).

**Acceptance:** no SuperUser page passes `err.response?.data` raw into a
toast/error setter; every SuperUser mutation shows a success toast on success and
a readable string on failure; no `alert()` on SuperUser pages.

> New Hebrew strings (any new toast copy) need Oren's approval before shipping.
