# Backend / DB Changes — Change Tracking Polish

Load-bearing implementation detail for **CAP-1** (hide paid Pending zombies) and **CAP-2** (type-filter fix). All proc bodies below were read live via Supabase MCP on 2026-07-27 (`pg_get_functiondef`). The four procs are **live-only — not in the repo**; re-verify the live body immediately before editing, because it may have drifted since.

Project id: `sxplumrexbolpwqacpiz`.

---

## The authoritative "paid" definition (do not paraphrase)

Both answer procs gate on this exact `exists`. The CAP-1 hide-filter must mirror it character-for-character so the list, the badge, and the answer-guard can never disagree:

**Entry** (`usp_answerchangeentryrequest`):
```sql
exists (
    select 1 from public.billcharge bc
    where bc.sourcetype = 'Entry'
      and bc.sourceid = <original entry id>
      and bc.chargestatus = 'Paid'
)
```

**Product** (`usp_answerproductchangerequest`):
```sql
exists (
    select 1 from public.billcharge bc
    where bc.sourcetype = 'ProductRequest'
      and bc.sourceid = <original product-request id>
      and bc.chargestatus = 'Paid'
)
```

In the list proc the original ids are `cer.originalentryid` and `pcr.originalprequestid`; in the count proc they are the same columns on `cer` / `pcr`.

---

## CAP-1a — List proc: `usp_getsecretarycompetitionchangerequests`

20 output columns, PascalCase, unchanged. This is a **pure `WHERE`-clause addition** to each of the two `UNION ALL` branches — no column added, no type change, **no `DROP FUNCTION` needed** (`CREATE OR REPLACE` is safe). The predicate is **Pending-scoped**: answered (Approved/Rejected) history stays visible even if paid; only un-answerable Pending zombies are hidden.

**Entry branch** — append to its `where` (currently `original_cic.competitionid = p_competitionid and c.hostranchid = p_ranchid and (p_status is null or lower(cer.status)=lower(p_status))`):
```sql
      and (
            lower(cer.status) <> 'pending'
            or not exists (
                select 1 from public.billcharge bc
                where bc.sourcetype = 'Entry'
                  and bc.sourceid = cer.originalentryid
                  and bc.chargestatus = 'Paid'
            )
      )
```

**Product branch** — append to its `where` (currently `original_pr.competitionid = p_competitionid and c.hostranchid = p_ranchid and (p_status is null or lower(pcr.status)=lower(p_status))`):
```sql
      and (
            lower(pcr.status) <> 'pending'
            or not exists (
                select 1 from public.billcharge bc
                where bc.sourcetype = 'ProductRequest'
                  and bc.sourceid = pcr.originalprequestid
                  and bc.chargestatus = 'Paid'
            )
      )
```

The `lower(status) <> 'pending' or …` shape is what preserves answered history when the proc is called with `p_status` null or a non-Pending value; when called with the default `'Pending'`, the status filter already restricts to pending and the `not exists` always applies.

## CAP-1b — Count proc: `usp_gethostsecretarypendingchangerequestscount`

Ranch-wide, already `where … lower(status)='pending'` in both correlated subqueries, so it is already Pending-only — just add the same `not exists`. Single `PendingCount` output column unchanged; `CREATE OR REPLACE` safe.

**Entry subquery** — add inside its `where`:
```sql
                  and not exists (
                      select 1 from public.billcharge bc
                      where bc.sourcetype = 'Entry'
                        and bc.sourceid = cer.originalentryid
                        and bc.chargestatus = 'Paid'
                  )
```

**Product subquery** — add inside its `where`:
```sql
                  and not exists (
                      select 1 from public.billcharge bc
                      where bc.sourcetype = 'ProductRequest'
                        and bc.sourceid = pcr.originalprequestid
                        and bc.chargestatus = 'Paid'
                  )
```

**Badge-vs-list scope caveat (pre-existing, not introduced here):** the count proc is **ranch-wide** while the list is **competition-scoped**. Mirroring the paid-filter keeps them consistent *per request*, but the badge total can still legitimately exceed the current competition's visible rows because it spans all the ranch's competitions. Do not "fix" that mismatch here — it is by design.

## Deploy / verify protocol for CAP-1

1. Re-read both live bodies (`pg_get_functiondef`) and diff against the versions captured 2026-07-27 before editing.
2. Show Oren the exact `CREATE OR REPLACE` SQL for each proc; get explicit go-ahead.
3. Apply via `apply_migration` (records in migration history).
4. Re-read live afterward as proof it landed.
5. Commit the applied SQL to the repo. **These procs have no committed `.sql` today** — decide with Oren where they land (a new `RideOnDB/StoredProcedures/PostgreSQL/Individual/` file per proc, matching existing numbering) so the repo stops being blind to this feature.
6. These are read/answer procs deployed independently of the app and must stay backward-compatible with the currently deployed backend — the `WHERE`-only change satisfies that.

---

## CAP-2 — Type-filter fix (frontend only)

**File:** `RideOnClient/rideon-client/web/src/components/secretary/change-tracking/ChangeRequestsFilters.jsx` and the matching predicate in `hooks/secretary/useCompetitionChangeTrackingPage.js`.

**Bug:** the `סוג בקשה` filter compares each request's `RequestType` against the hardcoded entry-only strings `'שינוי מקצה'` / `'ביטול מקצה'`. Product requests carry `'שינוי מוצר'` / `'ביטול מוצר'`, so **every product request is silently filtered out** whenever the type filter is engaged.

**Fix:** the filter's real dimension is change-vs-cancel across *both* sources. Filter on the `IsCancelled` boolean (`true` → cancellation, `false` → change), not on the localized `RequestType` string. This makes the filter source-agnostic and stops product requests from vanishing. Update the filter option definitions and the hook's matching logic together (both read the same request objects).

No backend change for CAP-2.
