# Implementation Kickoff Prompt — System-Manager Web Fixes

Paste the block below into a **fresh Claude Code session** in the RideOn repo. It
implements the spec produced by the prior `bmad-spec` stage. This IS an
implementation session (code is written), unlike the spec stage.

The spec is self-contained: SPEC.md + its companions are the canonical input. You
do NOT need the upstream party-mode BRIEF (it lives in another worktree and is
already fully absorbed into the spec).

---

Load `ride-on-system-knowledge` and `ride-on-live-db-ops` for RideOn context.

**Canonical input (read all four, in this order):**
- `_bmad-output/specs/system-manager-web-fixes/SPEC.md` — the kernel: scope, the 5 live items (CAP-1..CAP-5), CAP-6 scratched, constraints, non-goals, success signal.
- `_bmad-output/specs/system-manager-web-fixes/decisions.md` — locked decisions + rationale (canon form-token list, the 7-form inventory, why Fines stay edit-only).
- `_bmad-output/specs/system-manager-web-fixes/frontend-changes.md` — per-file FE changes with verified anchors.
- `_bmad-output/specs/system-manager-web-fixes/backend-changes.md` — CAP-2 (payer 400); root cause already confirmed live.

Treat every "Locked decision" as settled. Do not re-triage or reopen them. If you
hit a genuine contradiction, flag it to Oren rather than silently changing it.

**Goal:** implement the 5 live items so a super-user can log in with the form
owning its own errors, the payer tab loads, all 7 SuperUser forms are one visual
system, the section reads "מנהלי מערכת", and every SuperUser mutation has
consistent success/error messaging. Fines are unchanged (CAP-6, do not add CRUD).

**Before writing ANY file (mandatory):** run `git status` / `git branch`, report
the current branch, and create/switch to a feature branch off `main` (e.g.
`feature/system-manager-web-fixes`) if you are not already on one. Never work on
`main`. The repo git-protection hook blocks merging / switching to main / deleting
branches and any command containing the substring "merge" — those are Oren's to
run; give her the exact PowerShell when a merge is due.

**Recommended order (trivial-first):** CAP-4 (rename) → CAP-1 (401 interceptor) →
CAP-3 (form-system extraction, the big one) → CAP-5 (message contract: build the
helper once, then apply) → CAP-2 (payer 400).

**Per-item pointers (full detail in the companions):**
- **CAP-4** — rename "משתמשי מערכת" → "מנהלי מערכת" in 4 spots. Hebrew copy needs Oren's sign-off before it ships.
- **CAP-1** — scope the global 401 hard-redirect in `services/axiosInstance.js` so the two auth login POSTs opt out; leave the session-expiry redirect intact for every other endpoint. `authService` uses the same shared instance.
- **CAP-3** — build `FormModal`/`FormField`/`TextInput`/`Select`/`Textarea`/boxed-error on the EXACT canon tokens in decisions.md, then migrate all 7 forms. FieldModal is a full rebuild; Judges is extracted from inline page markup into a modal; ClassTypeModal's two English labels are translated (Oren-approved Hebrew); CreateSuperUserModal is restyle-only, NEVER touch its credential fields/values or wire autofill. Absorb `components/common/Field.jsx` (no third label style survives). Keep ReiningPatternModal's maneuver table.
- **CAP-5** — one shared axios-error-to-string helper (model it on the ad-hoc one at `FieldsManagementPage.jsx:149-151`), a success `ToastMessage` on every mutation, a standard error surface everywhere, and no `err.response?.data` passed raw. Sweep the 6 pages listed in frontend-changes.md. New toast copy needs Oren's approval.
- **CAP-2 — READ backend-changes.md FIRST; the root cause is already confirmed.** The 400 is `42P01 relation "public.registrationtoken" does not exist` — the table is missing from live (repo migration `RideOnDB/migrations/add_registration_token_table.sql` was never applied). The fix is that DB migration, **no C# change**. This is a LIVE DB WRITE: confirm with Oren whether it has already been applied this cycle; if not, show her the exact SQL and get her explicit go-ahead before `apply_migration`, then re-read to prove both `public.registrationtoken` and `systemuser.registrationcompleted` exist and the proc returns cleanly (0 rows is the correct empty state). Also do the FE toast-hardening on `UserRequestsPage.jsx` (part of CAP-5).

**Working rules (RideOn):**
- Investigation-first on anything nontrivial: report findings before writing code; mark what you read vs inferred; state what you cannot verify.
- Show diffs before applying changes.
- Any live DB write is shown to Oren as exact SQL and confirmed before it runs, then re-read as proof. Reads are free.
- Hebrew user-facing strings require Oren's approval before shipping.
- These items are FE-only except CAP-2 (DB). If you touch any `.cs` (you shouldn't need to for this spec), run `dotnet build` in `RideOnServer/` and grep for bypass call paths.
- Out of scope: secretary pages, mobile, Fines CRUD.

**When done:** report the branch name, commit hashes, per-item status, whether the
CAP-2 migration was applied (and by whom), and any contradiction you had to flag.
Do not merge to main; hand Oren the merge commands when ready.

---
