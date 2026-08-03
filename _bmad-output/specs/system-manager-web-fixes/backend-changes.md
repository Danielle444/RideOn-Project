# Backend Changes — System-Manager Web Fixes (CAP-2 only)

**This is the only item gated on live DB access.** Everything else is FE
(frontend-changes.md).

> **STATUS: ROOT CAUSE CONFIRMED via live DB read (2026-08-03).** The 400 is not a
> DAL/proc column mismatch and not a FE bug. An entire **`registrationtoken`
> table is missing from the live database** — the repo migration that creates it
> was never applied. The fix is a DB migration, not a code change. Details below.
> Follow `ride-on-live-db-ops`: the fix is a live write, so it needs Oren's
> explicit go-ahead and a re-read afterward.

Supabase project id: `sxplumrexbolpwqacpiz`.

---

## CAP-2 — `GET /Payers/pending-registrations` returns 400

### The confirmed root cause

`usp_getpendingpayerregistrations` INNER JOINs `public.registrationtoken` (to read
`rt.createdat` as `RequestDate` and filter `rt.isused = TRUE`). **That table does
not exist in any schema on live.** Running the proc directly returns:

```
ERROR: 42P01: relation "public.registrationtoken" does not exist
CONTEXT: PL/pgSQL function usp_getpendingpayerregistrations() line 3 at RETURN QUERY
```

That runtime error propagates: proc throws → `PayerDAL.cs:503-505` wraps it as a
generic `Exception` → `PayersController.cs:69-73` catch → `BadRequest("אירעה שגיאה
בשליפת הרשמות משלמים ממתינות")` = **the observed 400** (and the exact toast text).

**Production corroboration:** the last-24h Postgres logs carry **29**
`ERROR: relation "public.registrationtoken" does not exist` entries, several
within the same second — matching the "repeated 400s" in the console screenshot.

This is missing-object drift: the procs were deployed but the `CREATE TABLE` never
ran against live (the same failure mode as "Phase 7 shipped dead" in
`ride-on-system-knowledge`). The signature/column hypothesis in the earlier draft
was **disproven** — the proc's declared return columns match the DAL's 10 columns
exactly (`PersonId int, FirstName/LastName/Email/CellPhone/Username/RanchName text,
RanchId int, RoleId smallint, RequestDate timestamptz`).

### This is bigger than the one endpoint — 4 procs depend on the missing table

The whole payer self-registration-token subsystem is dead on live. All four
reference `public.registrationtoken`:

| Proc | Uses the table for | Effect while table is missing |
|------|--------------------|-------------------------------|
| `usp_saveregistrationtoken` | `INSERT` a token when a payer is provisioned | secretary payer-provisioning email step fails |
| `usp_getvalidregistrationtoken` | validate the token from the email link | payer cannot open the set-password link |
| `usp_completepayerregistration` | `UPDATE ... SET isused=TRUE` on completion | payer cannot finish registration |
| `usp_getpendingpayerregistrations` | read pending list (`createdat`, `isused`) | **the 400 in this item** |

`usp_getpendingpayerregistrations` and `usp_completepayerregistration` also filter/
set `systemuser.registrationcompleted`, and **that column is likewise absent on
live** — the repo migration adds it in the same file. So both halves of the
migration are unapplied.

### The fix — apply the repo migration that already exists

`RideOnDB/migrations/add_registration_token_table.sql` is the exact, intended DDL
(verified byte-for-byte in the repo). It is purely additive and backward-
compatible (`IF NOT EXISTS` on both statements); nothing currently working
depends on the table's absence:

```sql
CREATE TABLE IF NOT EXISTS public.registrationtoken (
    tokenid      SERIAL PRIMARY KEY,
    personid     INTEGER NOT NULL REFERENCES public.person(personid),
    tokenhash    TEXT NOT NULL,
    expiresat    TIMESTAMP WITH TIME ZONE NOT NULL,
    isused       BOOLEAN NOT NULL DEFAULT FALSE,
    createdat    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.systemuser
    ADD COLUMN IF NOT EXISTS registrationcompleted BOOLEAN NOT NULL DEFAULT FALSE;
```

**Apply protocol (per `ride-on-live-db-ops`):**
1. Show Oren this exact SQL, get explicit go-ahead (done via the spec/chat).
2. Apply via `apply_migration` with name `add_registration_token_table` (one
   logical change). The DDL is idempotent.
3. **Verify:** re-read that `public.registrationtoken` and
   `systemuser.registrationcompleted` now exist; run
   `SELECT * FROM usp_getpendingpayerregistrations();` — it must return cleanly
   (0 rows is the correct result while no payer registration tokens exist; that is
   a clean 200/empty list, not the 400). Then confirm the endpoint returns 200.
4. **Empty-case note:** because the table starts empty and the proc INNER JOINs it,
   the pending list is legitimately empty until a payer is provisioned. That is
   the designed behavior, not a failure — the point of the fix is that the
   endpoint stops erroring, not that it must return rows today.

**No C# change is required for CAP-2.** The controller, BL, DAL, and all 4 procs
are correct; they were just running against a database missing the table they were
written for.

### Repo reconciliation
The proc `.sql` files (`109`–`112`) and the migration already exist in the repo and
match live proc bodies. After applying, note in the migration/PR that
`add_registration_token_table.sql` was applied to live on the date of the fix (it
had drifted — present in repo, absent on live). No `pg_get_functiondef` re-capture
is needed since no proc body changes.

### FE companion (also in frontend-changes.md#cap-2)
Independent of the DB fix, harden `UserRequestsPage.jsx:117` (and the approve/
reject/undo catches at `:189`, `:224`, `:259`) to use the CAP-5
`getApiErrorMessage` helper so the toast can never render a raw `.data` object.
This is defense-in-depth; the DB migration is what actually clears the 400.

---

## Appendix — how this was determined (read-only trail, 2026-08-03)

1. `pg_get_function_arguments`/`_result` on `usp_getpendingpayerregistrations` →
   signature matches the DAL's 10 columns (drift hypothesis disproven).
2. `pg_get_functiondef` → body INNER JOINs `public.registrationtoken`.
3. `SELECT * FROM usp_getpendingpayerregistrations();` → `42P01 relation
   "public.registrationtoken" does not exist`.
4. `information_schema.tables` for `%registrationtoken%` in every schema → absent
   (only `emailotp`, `passwordresettoken` exist — different flows).
5. Function scan → 4 procs reference the missing table.
6. `systemuser.registrationcompleted` column → also absent.
7. Repo grep → `RideOnDB/migrations/add_registration_token_table.sql` holds the
   exact DDL, never applied to live.
8. `get_logs postgres` → 29 matching production errors in the last 24h.
