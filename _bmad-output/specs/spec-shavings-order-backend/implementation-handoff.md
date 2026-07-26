# Implementation Hand-off → `bmad-quick-dev` (Spec 1: Shavings order-table & backend follow-through)

> Paste the block below into a fresh `bmad-quick-dev` session. It is self-contained.

---

**GOAL:** Implement **Spec 1 — Shavings order-table & backend follow-through** for the RideOn
equestrian system end-to-end (DB migrations, ASP.NET backend, worker mobile app, data migration,
repo hygiene). Run until every capability CAP-1…CAP-11 in the SPEC is built, verified, and the repo
`.sql` files match live. This is backend **and** frontend (worker mobile) work in one branch.

**Load skills first:** `ride-on-system-knowledge` + `ride-on-live-db-ops` (system facts + live-DB rules).

**The canonical contract — read these before writing anything (do NOT re-derive; they are ratified ground truth):**
- `_bmad-output/specs/spec-shavings-order-backend/SPEC.md` — the kernel: Why, CAP-1…CAP-11, Constraints, Non-goals, Resolved decisions.
- `_bmad-output/specs/spec-shavings-order-backend/change-set.md` — the file-by-file / proc-by-proc migration drafts (M1–M8, backend, mobile, verification). **This is your build sheet.**
- `_bmad-output/specs/spec-shavings-order-backend/state-machine.md` — the lifecycle + the derived-state matrix.
- `_bmad-output/specs/spec-shavings-order-backend/repo-hygiene.md` — proc split/renumber map (CAP-11).
- `_bmad-output/specs/spec-shavings-order-backend/spec-2-handoff.md` — what Spec 2 will consume; keep these fields/reads intact.
- Reference only (already absorbed): `_bmad-output/shavings-redesign/shavings-data-layer-map.md` and `recovered-shavings-procs.live.sql`.

**The single most important design decision (do not deviate):**
The token model is **backward-compatible by design**. Stored `deliverystatus` carries ONLY
`{Pending, Delivered}`. **`Seen` is a DERIVED state, never a stored token** — derived as
`Delivered` if `arrivaltime` set, else `Seen` if `workersystemuserid` set, else `Pending`.
- `usp_claimshavingsorder` sets `workersystemuserid` + `responsetime=now()` and **leaves `deliverystatus='Pending'`** (M1). Do NOT write a `Seen` token.
- `usp_savedeliveryphoto` / new `usp_markdelivered` set `deliverystatus='Delivered'` + `arrivaltime` (M2/M3).
- The worker mobile card must compute the derived state and branch on it — branching on the raw `deliveryStatus` alone would never reach `Seen`.
This is what lets an installed old mobile app keep working through the whole flow if its update lags store review — so there is **no hard sequencing gate on the mobile side**.

**Resolved decisions (Oren, 2026-07-24) — already baked into the contract, do not re-open:**
1. Secretary approval is killed entirely (procs, DAL, controller endpoints, web approval action).
2. `responsetime`→"seen", `arrivaltime`→"delivered-at" — repurposed by NOTE ONLY, **no DB rename, no DB drop**.
3. No-photo delivery is **fallback-only** (surfaces after a photo-upload failure), not a co-equal button.
4. Legacy `responsetime` backfill: **leave NULL**.
5. Terminal token is `Delivered`.

**RideOn architecture + live-DB ground rules (hard constraints):**
- Controllers → BL → DAL → `DBServices.cs` → PostgreSQL stored procedures. Positional dict binding in `CreateCommandWithStoredProcedure` — **entry order must match the SP parameter order**.
- Live DB is owned via the Supabase MCP (project `sxplumrexbolpwqacpiz`). For **every** DB change: (a) check the live signature first with `pg_get_functiondef` / `pg_proc` (read-only), (b) show Oren the **exact SQL** and get explicit go-ahead before running, (c) apply via `apply_migration`, (d) re-read as proof it landed. **Repo `.sql` ≠ deployed** — never trust a repo file as evidence a proc is live.
- Return-type changes (adding/removing output columns) require `DROP FUNCTION` + `CREATE` in one migration (M4/M5/M6). `CREATE OR REPLACE` is fine when the signature is unchanged (M1/M2/M3).
- After any `.cs` change: `dotnet build` in `RideOnServer/`, then grep for call paths that bypass the changed logic.
- Work on a **feature branch off `main`** (e.g. `feature/shavings-order-backend`). Do not merge to main or delete branches without Oren's explicit approval, and confirm no other Claude Code session is active in this tree before any branch integration.
- Commit each recovered/verbatim proc `.sql` to match live **character-for-character** (fetch with `pg_get_functiondef` and diff; the recovered file was pulled 2026-07-23, re-confirm no drift).

**Suggested build order (each step verified before the next):**
1. **DB migrations** (M1–M8 in `change-set.md`), each read-first → show SQL → confirm → apply → re-read. Do the data migration (M8) with read-first SELECTs shown to Oren.
2. **Backend** — remove approval (controller/BL/DAL/DTOs), modify the secretary read DTO + DAL for M4's new columns (ships WITH M4), add the `mark-delivered` path (CAP-4), reconcile the DAL conventions (CAP-10, mechanical/behavior-preserving; the `jsonb` `CreateShavingsOrder` exception is documented). `dotnet build` green + grep bypass paths after each.
3. **Worker mobile app** (CAP-9) — `WorkerShavingsOrderCard.jsx` derived-state + buttons, the two worker screens, `shavingsOrderService.js` `markDelivered`. Remove the `WaitingApproval`/"ממתין לאישור מזכירה" limbo everywhere.
4. **Repo hygiene** (CAP-11) — split/renumber per `repo-hygiene.md` (re-list the folder at apply time to confirm 168+ is still free); new `178_usp_MarkDelivered.sql`.
5. **Verification** — walk section D of `change-set.md` capability by capability.

**Out of scope (do NOT touch):**
- The secretary Shavings **page redesign** — that is Spec 2. Only the approval-action removal on that page belongs to Spec 1; leave the rest for Spec 2. Keep the `spec-2-handoff.md` fields/reads intact.
- The **#31/#46 notification push** pipeline — entirely separate track.
- No column renames, no column drops on the live table.

**Definition of done:** all CAP-1…CAP-11 implemented and verified per section D; `dotnet build` green; live procs re-read as proof; every deployed shavings proc has exactly one committed `.sql` matching live; the worker app completes `Pending → (claim) Seen → (photo|no-photo) Delivered` on a device with no approval limbo; the Spec 2 hand-off fields are present and populated. Report commit hashes, what changed, and anything learned that belongs in a skill update.

---

## Why this is a `bmad-quick-dev` job (not another spec pass)
The spec is complete and preservation-validated; every open question is resolved. `bmad-quick-dev`
produces working code artifacts against an existing architecture, which is exactly the remaining
work. Point it at the contract above and let it run the build order to done.
