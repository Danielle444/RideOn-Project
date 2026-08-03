# Decisions — System-Manager Web Fixes

Locked decisions and their rationale. The three most-relitigated ones are D6
(Fines edit-only), D3 (extract, don't align-in-place), and the Item-3 screen
identity (SuperUser catalog, not secretary). Do not reopen these without new
evidence of the kind noted.

---

## D1 — 401 fix belongs in the interceptor, scoped to auth

Auth requests opt out of the global 401 hard-redirect; the form owns its own
error. `LoginScreen.jsx` is already correct (catches `!result.ok`, sets
`errorMessage` in place). The bounce is the global response interceptor
(`axiosInstance.js:25-29`): on *any* 401 it calls `clearAuthStorage()` +
`window.location.href = "/login"`, which fires before `loginSuperUser`'s catch
(`AuthContext.jsx:155`) can return its Hebrew message. Because super-user mode is
a toggle-only state, `/login` lands on the secretary-flavored screen — hence the
"bounce."

**Why not fix it in the login component:** the component is already correct; the
redirect happens at the transport layer before the component's promise resolves.

**Why keep the 401 redirect for other endpoints:** 401-means-session-expired is
the right behavior everywhere else. The fix narrows the redirect, it does not
remove it. `authService.js` uses the shared `axiosInstance`, so an auth-scoped
opt-out (config marker on the login requests, or an auth-URL-prefix check in the
interceptor) reaches exactly these calls.

---

## D2 — Payer 400 is server/DB, plus a defensive FE toast fix

The 400 is the server rejecting the request; it is not a FE bug and not a
timeout. Root-cause work is backend + live-DB (see backend-changes.md). Two
independent decisions:

1. **Investigate & fix the 400 server-side** — capture the live proc body first.
2. **Harden the toast** so it never renders a raw `.data` object — this is the
   same anti-pattern that seeds D5, so CAP-2's toast is fixed using the CAP-5
   helper rather than a one-off.

---

## D3 — Item 3 = extract a shared primitive, applied to ALL SuperUser forms

**Scope expanded 2026-08-03 by Oren:** from "fix ClassTypeModal" to a
design-system extraction across every SuperUser form. Trigger was the
`ניהול ענפים` (Fields) modal looking "weird / different format."

**Decision: extract shared primitives, do NOT align each form in place.** There
is no shared form-field primitive today. `components/common/Field.jsx` exists
(label + required + info-popup) but no SuperUser modal uses it, and it is itself
a *third* style (`text-xs text-[#4E342E]` labels vs the modals'
`text-sm text-[#5D4037]`). Aligning form-by-form would re-seed the same drift;
one primitive built once is the fix.

**Item 3 screen identity: the SuperUser catalog, not a secretary flow.** The
party's first guess (secretary) was wrong; Oren corrected it.

### Canon tokens (locked) — the Prize/Fine/Class/Reining house style

Build the primitives to exactly these:

- **Shell:** `rounded-[28px]` · `border border-[#E6DCD5]` · `shadow-lg` · `overflow-hidden`
- **Header:** `border-b border-[#EFE5DF]` · `px-6 py-5` · title `text-2xl font-bold text-[#3F312B]` · close `rounded-full p-2 hover:bg-[#F6F1EE]` with `<X size={18}/>`
- **Body:** `px-6 py-6` · `space-y-5`
- **Label:** `text-sm font-semibold text-[#5D4037]` + required `<span className="text-red-500 mr-0.5">*</span>` (reconcile `Field.jsx` to this; drop its `text-xs/#4E342E` variant)
- **Input/Select/Textarea:** `h-12 w-full rounded-xl border border-[#D8CBC3] bg-white px-4 text-[#3F312B] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D2B7A7]`
- **Error surface:** `rounded-2xl border border-[#E7BABA] bg-[#FDF4F4] px-4 py-3 text-sm text-[#A54848]`
- **Footer:** `mt-8 flex justify-end gap-3` · cancel `rounded-xl border border-[#D8CBC3] px-5 py-2.5 hover:bg-[#F8F5F2]` · submit `rounded-xl bg-[#8B6352] px-5 py-2.5 hover:bg-[#7A5547]` (+ `disabled:opacity-70` while saving)

### Form inventory (verified present in `components/superuser/` + Judges page)

| Form | File | State (verified) | Action |
|------|------|-------|--------|
| Prizes (פרסים) | `components/superuser/PrizeTypeModal.jsx` | house style ✓ | reference exemplar → migrate |
| Fines (קנסות) | `components/superuser/FineModal.jsx` | house style ✓ (edit-only) | migrate |
| Class-Types (מקצים) | `components/superuser/ClassTypeModal.jsx` | house shell, **English labels** at `:94`, `:106` | migrate + translate to Hebrew |
| Reining (מסלולי ריינינג) | `components/superuser/ReiningPatternModal.jsx` | house style ✓, complex dual-pane | migrate simple fields; keep maneuver-table |
| **Fields (ענפים)** | **`components/superuser/FieldModal.jsx`** | **STRUCTURAL RELIC** | **full rebuild** on the primitives |
| Judges (שופטים) | **inline in `pages/superuser/JudgesManagementPage.jsx`** | not extracted (a `JudgesTable.jsx` exists, but the form is inline) | **extract to a modal** on the primitive |
| Create SuperUser | `components/superuser/CreateSuperUserModal.jsx` | has password fields | migrate — **restyle inputs only, NEVER wire autofill or touch credential values** |
| Filter/search inputs | `components/superuser/RequestsFiltersBar.jsx`, page selects | already `#D8CBC3`+ring | low priority; align only if trivial |

---

## D4 — Rename to "מנהלי מערכת" for consistency

The sidebar/label says "משתמשי מערכת" (system *users*); it should be "מנהלי
מערכת" (system *managers*). `LoginScreen.jsx` already uses "מצב מנהל מערכת" /
"כניסת מנהל מערכת", so the section is the outlier — the rename increases
consistency rather than introducing new vocabulary. Adjust surrounding copy so it
reads naturally (e.g. subtitle "...משתמשי מערכת קיימים" → "...מנהלי מערכת קיימים").

Verified occurrences (4): `SuperUsersManagementPage.jsx:98` (title), `:101`
(subtitle), `SuperUsersTable.jsx:39` (empty-state), `superUserMenu.js:14`
(sidebar).

---

## D5 — Message-standardization contract

The real rot is not `alert()` (only ~4, mostly secretary-side, out of scope). It
is the copy-pasted `err.response?.data || "<fallback>"` pattern that sometimes
renders a raw server string and sometimes an object, plus mutations that succeed
with no confirmation toast.

**Contract (all SuperUser pages):**
1. One shared error-extraction helper: given an axios error, always return a
   **string** — handle object (`.data.title` / `.data.message` / nested), string,
   and network/no-response cases; never return `.data` raw.
2. `ToastMessage` (success) on **every** mutating action.
3. A standard error surface on every mutating action (toast or inline modal
   error — pick per context, but consistently).
4. Replace remaining `alert()` calls (the in-scope SuperUser ones).

**Seed already in the code:** `FieldsManagementPage.jsx:149-151` hand-rolls a
`title || message || (string) || fallback` extraction — formalize that shape into
the shared helper and replace all ad-hoc uses.

---

## D6 — Fines stay edit-only (SCRATCHED) — do NOT reopen

**History:** reversed twice in one session. Prior triage locked "edit-only =
CORRECT"; this session Oren first asked for full CRUD, then re-scratched it:
*"fines are automatically applied based on a set of predetermined rules."*

**Why edit-only is correct (verified):** `BL/Services/FineResolver.cs` auto-fires
a fine by matching an **active policy** on `FineReason` + a fixed trigger
vocabulary (`None`/`After`/`Between` over events `RegistrationEnd`,
`CompetitionStart`). A superuser-authored fine with a reason/event the resolver
never emits would be a **dead row**. `FinesController.cs` intentionally exposes
only GET+PUT (no POST/DELETE); `FineDAL.cs` has no create/delete. Adding fines is
*incoherent* with how they are applied, not merely unsupported.

`FinesTable.jsx` already uses the shared product-table primitives
(`DataTableShell`, `TableActionButton`, ₪ formatting) and correctly omits delete —
it is already "in the product format."

**Do not reopen** without first changing the fine-application engine
(`FineResolver`). The earlier "closed enum" claim was an inference from a FE
switch and was disproven — `FineReason` is `string?`; the real constraint is the
resolver's fixed vocabulary, not a type.

---

## Contradictions flagged during spec authoring

None. Every BRIEF `[read]` anchor was re-verified against live code in this
worktree and held (interceptor lines, authService shared-instance import, the 4
rename spots, ClassTypeModal English labels at `:94`/`:106`, the Judges inline
form, the widespread `err.response?.data` pattern, and the Payers
controller→BL→DAL→proc chain). The one open item is OQ-1: the payer-400 root
cause is a hypothesis until read against live DB.
