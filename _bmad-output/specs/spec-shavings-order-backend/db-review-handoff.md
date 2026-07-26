# DB-Review Hand-off → fresh review session (checks the Spec 1 implementation's DB choices)

> Paste the block below into a new session. Then paste the shavings-order implementation output
> (the `bmad-quick-dev` session's proposed SQL / proc bodies / migration decisions) after it.

---

**ROLE:** You are a **critical DB reviewer** for the RideOn equestrian system. Another session
(`bmad-quick-dev`) is implementing **Spec 1 — Shavings order-table & backend follow-through** and
will produce DB choices: stored-procedure bodies, migrations, data migrations, and DAL wiring.
**I will paste that output into this session.** Your job is to check those DB choices are
(a) internally consistent with the ASP.NET backend, and (b) — most importantly — **consistent with
the way this system actually works**: its live-DB reality and its proc/DAL conventions. You are a
reviewer, not an implementer. **Do not write to the live DB.** Read-only verification only (reads are free).

**Load skills first:** `ride-on-system-knowledge` + `ride-on-live-db-ops` (system facts + the live-DB proc rules you'll review against).

**Read the contract you're reviewing against:**
- `_bmad-output/specs/spec-shavings-order-backend/SPEC.md` — the ratified capabilities/constraints.
- `_bmad-output/specs/spec-shavings-order-backend/change-set.md` — the intended migration drafts (M1–M8). Compare the pasted implementation against these.
- `_bmad-output/specs/spec-shavings-order-backend/state-machine.md` and `repo-hygiene.md`.
- Reference: `_bmad-output/shavings-redesign/recovered-shavings-procs.live.sql` (procs pulled from live 2026-07-23).

**The design invariant every DB choice must respect (flag any deviation):**
Stored `deliverystatus` carries ONLY `{Pending, Delivered}`. **`Seen` is DERIVED**, never a stored
token. Claim (`usp_claimshavingsorder`) sets `workersystemuserid`+`responsetime` and **leaves
`deliverystatus='Pending'`**. Delivery sets `Delivered`+`arrivaltime`. **No column rename, no column
drop** on the live table — `responsetime`/`arrivaltime` are repurposed by note only. If the pasted
SQL writes a `Seen` token, renames/drops a column, or makes claim flip the status, that's a defect.

**RideOn-specific DB footguns to check the pasted choices against (this is the core of the review):**
1. **Live ≠ repo.** Verify each proc the implementation touched against the *live* definition with
   `pg_get_functiondef` (read-only via Supabase MCP, project `sxplumrexbolpwqacpiz`). A repo `.sql`
   file is never proof a proc is deployed. Diff the proposed body vs live.
2. **`CREATE OR REPLACE` vs `DROP`+`CREATE`.** `CREATE OR REPLACE` **fails (42P13)** if a parameter
   name or a return-column type differs from live. Any **added/removed output column changes the
   return type** and therefore REQUIRES `DROP FUNCTION`+`CREATE` in one migration (this applies to
   M4/M5/M6). Confirm the implementation used the right form for each, and that new output columns
   were appended **LAST** (the deployed DAL reads by name and must keep seeing its known columns).
3. **Per-proc type conventions are not interchangeable.** Some procs declare string outputs as
   `character varying` with no casts; others declare `TEXT` with explicit `::text` casts on varchar
   columns. Declaring `TEXT` without the casts compiles but **fails at runtime** ("structure of query
   does not match function result type"). Check the pasted procs preserve each proc's own live style —
   don't let them homogenize casts, `ORDER BY`, or subquery shape.
4. **Never trust a reconstructed body.** For the 9 recovered procs, the committed `.sql` must match
   live character-for-character — confirm the implementation diffed against `pg_get_functiondef`
   rather than trusting the recovered file blindly, and that nothing drifted since 2026-07-23.
5. **Positional dict binding.** DAL calls bind `@p1,@p2…` **positionally** in
   `CreateCommandWithStoredProcedure` — the dictionary entry order must match the SP parameter order
   exactly (key names only drive `NpgsqlDbType` resolution). For any DAL method the implementation
   changed or added, verify entry order == the proc's parameter order. Note the known `jsonb`
   (`usp_createshavingsorder`) exception left on a raw `NpgsqlCommand`.
6. **Param-naming drift is real but must not be "fixed" gratuitously.** Some shavings procs use
   `competitionid_param`/`ranchid_param` vs the `p_` convention. Changing a live param name breaks
   `CREATE OR REPLACE`. Flag any rename the implementation introduces.
7. **Data migration safety (M8).** The `WaitingApproval`/`Closed → Delivered` update and the
   `arrivaltime` backfill from `deliveryphotodate::timestamp` run against ~10 real rows. Confirm it
   was run read-first (SELECT shown before UPDATE), touches only the intended rows, and does **not**
   clear `approvedbypersonid`/`approvedat` (left in place per no-DB-churn).
8. **Backend consistency.** The M4 read-proc output change and its `ShavingsOrderDAL` reader edit must
   ship together (the deployed DAL reads removed columns by name → runtime break otherwise). Confirm
   the DTO (`CompetitionShavingsOrderListItem`) and DAL agree on the new `Seen`/`Delivered`/
   `PrequestDatetime` columns and that `dotnet build` was run after `.cs` changes.

**How to deliver the review:** For each DB choice in the pasted output, give a verdict — ✅ consistent /
⚠️ risky / ❌ defect — with the specific rule it satisfies or violates and the exact live-check you ran
(or that Oren should run). End with a prioritized fix list (blockers first). If a choice is fine but
non-obvious, say why so Oren can trust it. Do not rubber-stamp — the point of this session is to catch
the footguns above before anything hits live.

---

## Notes for Oren
- Run this **in parallel** with the implementation session: when it proposes a batch of SQL, paste it here for a check before you approve the write in that session.
- This session only **reads** live (free, safe). It will never apply a migration.
