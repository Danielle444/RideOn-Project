---
name: ride-on-system-knowledge
description: "Use this skill at the start of ANY Claude Code session involving the RIDE ON equestrian competition management system. Provides full system context so the user does not need to re-explain the database schema, class taxonomy, ranch mappings, or conventions. Triggers for any RIDE ON task: data insertion, analytics, schema changes, bug fixes, or queries."
---


# RIDE ON — System Knowledge Reference

## What is RIDE ON

A competition management system for Western equestrian competitions in Israel.
Built on Supabase (PostgreSQL). The user manages data for multiple competition
fields, ranches, classes, entries, prizes, and billing.

Credentials are always in `.env` at repo root:
```
SUPABASE_URL=https://sxplumrexbolpwqacpiz.supabase.co
SUPABASE_KEY=<publishable key>
```

---

## Core Table Reference

| Table | Purpose | Key columns |
|---|---|---|
| `competition` | One row per competition event | `competitionid`, `hostranchid`, `fieldid`, `competitionname`, `competitionstartdate`, `competitionenddate`, `competitionstatus` |
| `classincompetition` | One class instance per competition day | `classincompid`, `competitionid`, `classtypeid`, `classdatetime`, `orderinday`, `organizercost`, `federationcost` |
| `classtype` | Master list of class types | `classtypeid`, `fieldid`, `classname` |
| `field` | Equestrian disciplines | `fieldid`, `fieldname` |
| `entry` | One row per rider entry | `entryid`, `classincompid`, `entrystatus` ('Active'/'Cancelled') |
| `servicerequest` | Parent of entry — links rider+horse+bill | `srequestid`, `horseid`, `riderfederationmemberid`, `billid` |
| `classprize` | Prizes per class (a class can have MULTIPLE prize rows) | PK `(classincompid, prizetypeid)`, `prizeamount` (CHECK >= 0) |
| `prizetype` | Prize type master | `prizetypeid`, `prizetypename` |
| `ranch` | Ranch/venue | `ranchid`, `ranchname`, `latitude`, `longitude` |
| `arena` | Arena within ranch | `ranchid`, `arenaid` |
| `horse` | Horse records | `horseid`, `ranchid`, `horsename` |
| `federationmember` | Rider federation membership | `federationmemberid` (= personid) |
| `person` | Person records | `personid`, `nationalid`, `firstname`, `lastname` |
| `systemuser` | System users | `systemuserid` (= personid), `username` |
| `bill` | Financial bill | `billid`, `paidbypersonid`, `competitionid`, `amounttopay` |

**Entry count query** (always use this):
```sql
COUNT(CASE WHEN e.entrystatus = 'Active' THEN 1 END) AS entrycount
```

**Completed competitions filter**: `WHERE c.competitionstatus = 'הסתיימה'`

---

## Fields (Disciplines)

| fieldid | fieldname | Notes |
|---|---|---|
| 1 | ריינינג | Reining — NRHA/IEF classes |
| 2 | קאטינג | Cutting — NCHA/IEF classes |
| 3 | אולארונד | All-Around — Trail, Horsemanship, Pleasure, Hunter, etc. |
| 4 | אקסטרים | Extreme Cowboy — EXCA/IEF classes |
| 5 | קפיצות | Jumping — exists in live DB but EXCLUDED on purpose from the smart element and most features (client decision: runs once or twice a year, edge case) |
| 6 | דרסז' | Dressage — same exclusion as jumping |

---

## Ranches

| ranchid | ranchname | Also known as | Notes |
|---|---|---|---|
| 11 | דאבל קיי | Double K | lat=32.726, lon=35.467 — main venue |
| 49 | סנדורה | גרין פילדס / Green Fields | No coordinates |

---

## Prize Types

| privetypeid | prizetypename | Meaning |
|---|---|---|
| 1 | שובר | Gift voucher |
| 2 | ג'קפוט | Jackpot — posted per-entry amount |
| 3 | כסף מוסף | Added money — fixed organizer contribution |

`prize_jackpot_final` = `prize_jackpot_posted × entrycount` — reference only, not a model feature.

---

## Class Dimension System

Every classtype is described by 5 independent dimensions extracted from `classname`.
Multiple dimensions can be active simultaneously.

### Dimension 1 — Horse Level
| Value | Patterns |
|---|---|
| `futurity` | פטוריטי, Futurity |
| `novice_horse` | נוביס (on horse), ירוקי (when modifying horse not rider), Green Horse |
| `derby` | דרבי, Derby |
| `no_horse_restriction` | default when none of the above |

### Dimension 2 — Rider Age
| Value | Patterns |
|---|---|
| `youth` | נוער, עד \d+, עד גיל, Youth, Young |
| `adult_plus` | 40+, 50+, בוגרים (standalone), Prime Time |
| `all_ages` | default |

### Dimension 3 — Federation
| Value | Patterns |
|---|---|
| `IEF` | התאחדות, IEF, or no marker (default) |
| `NRHA` | NRHA |
| `NCHA` | NCHA |
| `EXCA` | EXCA |

### Dimension 4 — Rider Level (multi-label)
| Value | Patterns |
|---|---|
| `open` | פתוח, לא מוגבל, unrestricted, Open, OPEN — לא מוגבל IS a positive trigger for open (verified against the trained model notebook July 2026; an earlier version of this table wrongly said to exclude it) |
| `non_pro` | נונ פרו, נונפרו, Non Pro, NonPro, NONPRO |
| `yaroki` | ירוקי רוכב, רוכב ירוקי, רוכב חדש |
| `pro` | PRO standalone — NOT when preceded by non/נונ |
| `limited` | מוגבל, Limited — exclude לא מוגבל |

### Dimension 5 — Sub-type Within Field
**קאטינג (2):** קאו הורס, ראנג' סורטינג, פרימיום, פלאטינום
**אולארונד (3):** טרייל, הורסמנשיפ, פלז'ר/פלזר, האנט סיט אקוויטיישן, האנטר אנדר סאדל, הליכה ג'וג, שואומנשיפ, ווסטרן ריידינג/ראנץ ריידינג
**אקסטרים (4):** ראנג' סורטינג, Intermediate, Young Gun

### Practice Flag
`is_practice = 1` when classname contains **אימון**

---

## Class Name Normalization Rules

Always apply before matching to `classtype`:
```python
PREFIXES_TO_STRIP = [
    "ריינינג ", "אקסטרים קאובוי ", "אקס' קאובוי ", "אקס' קאו' "
]
# Strip prefix if name starts with one
# Typo corrections:
#   "הורסמנשי פתוח" → "הורסמנשיפ פתוח"
#   "האנט סיט אקויטיישן" → "האנט סיט אקוויטיישן"
#   "פלזר" = "פלז'ר" (same class)
#   נוביס (Winter) = פתוח לסוסי נוביס
#   ראנץ ריידינג = ווסטרן ריידינג
#   נוער = עד 18 (map to equivalent עד 18 classtype)
```

---

## Fabricated Entry Convention

Historical entries are fabricated with sequential counters (never reuse):
- Reining 2024: counter 10000+
- Reining 2025: counter 20000+
- Extreme/Cutting 2025: counter 30000+
- All-Around 2025: counter 40000+

Pattern: `person.nationalid = f"{n:09d}"`, `lastname = f"היסטורי {n}"`,
`horse.horsename = f"סוס היסטורי {n}"`, `username = f"hist_{n}"`,
`systemuser.isactive = False`

---

## Authentication Architecture

Two separate login identities:
- **systemuser.username** — login identifier for secretary/admin/worker (web + mobile). Procs: `usp_GetSystemUserForLogin`, `usp_CheckUsernameExists`, `usp_RegisterSystemUserWithRoles`
- **superuser.email** — separate table, login for web SuperUser mode. Procs: `usp_GetSuperUserForLogin`, `usp_CheckSuperUserEmailExists`
- **person.email** — used only for SystemUser password reset (`usp_GetSystemUserByEmail`) and OTP (`emailotp` via `usp_GetValidEmailOtp`)
- `usp_CreatePayerWithCredentials` — secretary provisions payer accounts (registrationcompleted flow)

**Identifier normalization convention (July 2026):** all username/email lookups are case-insensitive and whitespace-trimmed at three layers:
- Frontend: `shared/auth/utils/normalizeIdentifier.js` (trim + lowercase), used by web and mobile `authService.js`
- Backend: `RideOnServer/BL/IdentifierNormalizer.cs` (`Trim().ToLowerInvariant()`), applied at the lowest BL method before any DAL call. New usernames are stored lowercase; person.email is trimmed only (display field), lookups use LOWER() in SQL
- DB: all auth procs compare with `LOWER(col) = LOWER(param)`
Any new auth-adjacent lookup must follow this pattern at all three layers.

The C# DAL (`DBServices.cs`) calls stored procs **positionally** (`SELECT * FROM fn(@p1, @p2)`), so proc parameter names are invisible to the app.

The dictionary keys passed to `CreateCommandWithStoredProcedure` do matter for one thing: `AddParameterWithType` resolves `NpgsqlDbType` by matching the (trimmed, lowercased) key against a fixed list of known names (e.g. `classdatetime`/`prequestdatetime`/etc. → `TimestampTz`, `startdate`/`enddate` → `Date`, keys containing `notes`/`name`/`status`/`text`/`url` → `Text`) before falling back to a switch on the value's .NET type. A new DAL param whose key isn't recognized and whose value type doesn't hit a primitive branch falls through to `AddWithValue`, which can silently pick the wrong Postgres type — check `AddParameterWithType` before adding a new date/text-like param key. (A plain `int` value is safe with any key: the int runtime-type branch catches it before the fallthrough — confirmed for `@CompetitionId` in Phase 6.)

**Backend layering has no DI container for BL/DAL.** `Program.cs` only registers ASP.NET infra (controllers, Swagger, JWT auth, CORS) — there is no `AddScoped`/`AddSingleton`/`AddTransient` anywhere for a BL or DAL type. Every BL method is `internal static` and instantiates its own DAL directly: `SomeDAL dal = new SomeDAL(); return dal.Method(...);`. New services should follow this shape, not introduce interfaces/constructor injection — every existing service in the repo does it this way.

---

## Stored Procedure Deployment Rules (critical)

The live Supabase DB and the repo SQL files have **drifted** in the past (procs pasted into the SQL editor without committing back). Before any `CREATE OR REPLACE FUNCTION` against live:

1. **Always check the live signature first** (read-only):
```sql
SELECT p.proname, pg_get_function_arguments(p.oid) AS params,
       pg_get_function_result(p.oid) AS returns
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('<lowercase names>');
```
2. CREATE OR REPLACE **fails** if parameter names OR return column types differ from live (errors 42P13). Match the live names/types instead of DROP whenever possible. **Adding an output column changes the return type** and therefore requires `DROP FUNCTION` + `CREATE FUNCTION` in one migration. When adding columns, append them LAST (the DAL reads by name, but the deployed backend must keep seeing its known columns).
2a. **Per-proc type conventions differ and must each be preserved exactly.** Example: `usp_GetClassById` declares string outputs as `character varying` with no casts; `usp_GetClassesByCompetitionId` declares them `TEXT` with explicit `::text` casts on the varchar table columns. Declaring TEXT without the casts compiles but fails at runtime ("structure of query does not match function result type"). Similarly, the two procs build `JudgesDisplay` differently (concat_ws ordered by name vs trim/coalesce ordered by judgeid) — never homogenize; reproduce each proc's own live style.
2b. **Never trust a reconstruction of a proc that was never in the repo.** Fetch the live definition with `pg_get_functiondef` and diff before applying. Known reconstruction failure modes: dropped output columns, TEXT/varchar cast mismatches, homogenized subqueries, weakened ORDER BY clauses.
3. Known live naming mix: `usp_CheckUsernameExists`, `usp_RegisterSystemUserWithRoles`, `usp_GetSystemUserForLogin`, `usp_CheckSuperUserEmailExists` use `*_param` style; the rest use `p_*`. `usp_GetSystemUserForLogin` returns VARCHAR (not TEXT) for its 5 string columns. Repo files match live as of July 2026 — keep it that way. BRAND-NEW procs are not bound by rule 2's match-live requirement (there is nothing live to match); the Smart Element family (160-163) established `p_*` + lowercase unquoted return column names as the convention for new procs.
4. **`PG_01_Auth.sql` is DEPRECATED — never run it.** Source of truth is `RideOnDB/StoredProcedures/PostgreSQL/Individual/`.
5. Any SQL pasted into the Supabase SQL editor must also be committed to the repo, always.
6. Before removing behavior from a live proc (e.g. an internal delete-before-insert), check whether the C# caller already replicates that behavior itself. If it does, the proc fix is safe to deploy independently of an app deploy; if not, time the proc change with the deploy. (Confirmed this way for the `usp_UpsertClassPrize` fix — `SaveClassPrize`/`SaveClassPrizes` already called `usp_DeleteClassPrizeByClassId` before every upsert call, so removing the proc's internal delete changed nothing for the already-deployed app.)
7. **Drift can run either direction — check both, don't assume the repo is behind.** Usually a proc gets pasted into the SQL editor and the repo file never catches up, so live is ahead. But `usp_GetPaidTimeSlotsByCompId` (repo file 91) was the opposite kind of surprise: the repo copy only had 8 columns (no `PaidTimeSlotId`, `SlotStatus`, `SlotNotes`, or any of the capacity/assignment columns), while the C# DAL reader had been expecting all 17 columns all along — proof the *app* and *live DB* were already in sync and only the *repo file* was stale. Live's actual body computes `TotalCapacityMinutes` as slot minutes minus 10 (floor 0), `UsedCapacityMinutes` as `sum(durationminutes + 1)`, `EstimatedAvailablePlaces` as `floor(remaining / 11)`, and `PendingRequestsCount` via a correlated subquery on `paidtimerequest` — none of that was reconstructable from the repo's stale copy or from column names alone. Fixed by having claude.ai run `pg_get_functiondef` on the live proc and pasting the exact result back into the repo file character for character (never hand-reconstruct a proc body from behavior alone, per rule 2b). Aside: `PG_04_Facilities.sql`'s copy of the same proc is even more stale (different param-naming style, missing columns entirely) — it looks like the same kind of deprecated legacy aggregate as `PG_01_Auth.sql` and was left untouched, not treated as a second source of truth.

Supabase project id: `sxplumrexbolpwqacpiz`. Claude.ai can apply DDL via the Supabase connector (`apply_migration`, records in migration history — `case_insensitive_auth_lookups` was applied this way).

**Claude Code DB access changed 2026-07-20.** It previously had no DB credentials and edited repo files only. It now reaches the same project through the Supabase MCP (`execute_sql`, `list_tables`, `apply_migration`). Standing rule from Oren: **reads are free, every write is shown as exact SQL and confirmed with him before it runs**, then re-read afterwards as proof it landed. The old division of labour ("all live DB work goes through claude.ai") is superseded, but the discipline behind it is not — a repo `.sql` file is still never evidence that a proc is deployed. Phase 7 shipped dead for exactly that reason: proc 164 existed in the repo and had never been run against live.

---

## Smart Element — Entry Prediction Integration (July 2026)

The trained entry count model (linear regression, 44 features, R2 0.766, RMSE 3.086, MAE 2.180) is integrated into the backend. Runtime prediction = intercept + sum(coef * (x - mean) / scale), clamped at 0. Source of truth for parameters: `models/entry_prediction_model_v1.json` (exported from `Smart_Element/01_data_prep.ipynb`); parity baseline: `models/parity_reference_v1.csv` (965 historical rows, verified 965/965 against the C# builder).

**Live tables (created via migrations, seeded):**
- `modelversion` — modelversionid serial PK, versionname ('v1'), trainedat, r2, rmse, mae, ntrain, ntest, intercept, isactive (partial unique index: one active)
- `modelparameter` — 44 rows per version: featurename, featureorder 1..44, coefficient, scalermean, scalerscale
- `entryprediction` — cache: classincompid PK, predictedentries, modelversionid, computedat (min/max band is computed at read time as predicted ± rmse, clamped at 0 — never stored)
- `fieldconfig` — per field: minutesperentrymin/max (NULL = exempt from scheduling recommendations, e.g. אולארונד), maxhorseclassesperday (reining 1, cutting 3, all around 5, extreme 5)
- `smartconfig` — global key value: shavingsperstallmin 2 / max 3, betweenclassgapminutes 10, latefinishyellowhour 23 / orangehour 24 / redhour 25 (hours past midnight notation), flatteningguidance (free text; frequency is secretary discretion per competition)

**Deployed procs:** `usp_GetEntryPredictionFeatureInputs(p_classincompid)` (repo file 160), `usp_GetActiveModelParameters()` (repo file 161), `usp_UpsertEntryPrediction(p_classincompid, p_predictedentries, p_modelversionid)` (repo file 162, Phase 5 — upserts the `entryprediction` cache row, `ON CONFLICT (classincompid) DO UPDATE`, always fed already-clamped values), and `usp_GetEntryPredictionsByCompetitionId(p_competitionid)` (repo file 163, Phase 6, LANGUAGE sql — returns classincompid, predictedentries, modelversionid, computedat, rmse for all cached rows of a competition; rmse is joined via the ROW's `modelversionid`, deliberately NOT the active version, so the band always reflects the model that produced the number even if a newer model is active; ordered exactly like `usp_GetClassesByCompetitionId`: classdatetime, orderinday, starttime, classincompid, all asc nulls last; a competition with no cache rows returns 0 rows cleanly, which is designed behavior, not a failure). `usp_DeleteClassInCompetition` (repo file 19, pre-dates this integration) was reconciled in Phase 5 to match live: it now deletes the `entryprediction` cache row (alongside `reiningtype`/`classprize`/`classjudge`) before deleting the `classincompetition` row itself. The explicit-delete convention was chosen over ON DELETE CASCADE after a live audit showed the project's FKs are overwhelmingly NO ACTION with explicit child deletes in procs (only 4 CASCADE exceptions: cashcountline + three on stallassignment).

**Backend components (main):** `ClassNameFeatureExtractor` (pure C#, ports the notebook regexes exactly — NO prefix stripping or typo normalization; those rules belong to historical insert matching only), `FeatureVectorBuilder` (assembles by featurename from DB featureorder, never positional in code — has two overloads, `Build(classIncompId)` fetches `usp_GetActiveModelParameters()` itself, `Build(classIncompId, modelParameters)` accepts an already-fetched set; any code scoring more than one class in a loop must use the second form and fetch parameters once, not once per row), `EntryPredictionDAL` (gained `UpsertEntryPrediction(classIncompId, predictedEntries, modelVersionId)` in Phase 5, and `GetPredictionsByCompetitionId(competitionId)` in Phase 6, a thin reader on `usp_GetEntryPredictionsByCompetitionId` reading the proc's lowercase column names), `PredictionUnavailableException`, `PredictionService` (Phase 5 — computes, clamps, caches, and never throws on the write side; Phase 6 added the read method `GetPredictionsByCompetitionId` which deliberately DOES throw — see Read/Display Path below).

**Non-obvious rules learned:**
- Aggregate features (field_avg_past_entries, classname_avg_past_entries) use completed competitions only, grouped by name text, NO self exclusion, no date cutoff — exact training reproduction.
- Fallbacks: unseen classname falls back to field average; field with no completed history (jumping, dressage) = refuse to predict, never silent zeros.
- classname_avg_past_entries is the dominant feature (coef 6.21) — never default it to 0.
- day_of_week is pandas convention Monday=0 computed on the UTC instant in C#: `((int)dow + 6) % 7`. Never use EXTRACT(DOW) or raw .NET DayOfWeek (both are Sunday=0). Npgsql returns Kind=Utc (verified empirically against live data, July 2026).
- Month dummies exist only for 4,5,6,8,9,10,11,12; other months map to all zeros (months 1,2,7 are unseen by training — extrapolation).
- has_prize flags = amount > 0 (a zero amount prize row is a false flag). Prizes matched by prizetypeid, never name patterns.
- classes_per_competition counts ALL sibling classes regardless of status — so adding or removing any class changes the feature vector of ALL siblings in that competition (recompute the whole competition, not one class).
- `models/parity_reference_v1.csv`'s `predicted_entrycount` column is the **raw, unclamped** `model.predict()` output (three historical rows are genuinely negative — classincompid 10, 838, 846). Comparing against a clamped prediction will show false mismatches; clamp only when serving a prediction to a caller, never when validating against this CSV.

### Recompute Triggers (Phase 5 — merged to main, deployed)

Merged via merge commit `85bf48a`, deployed to production via Render's auto-deploy on `main`.

`PredictionService` (`RideOnServer/BL/PredictionService.cs`):
- `RecomputeCompetition(competitionId)` — public. Fetches `ActiveModelParameters` once, `ClassInCompetition.GetClassesByCompetitionId(competitionId)` once, then loops sequentially (no batch proc — the current one-class-per-proc-call design was judged not worth rewriting for the class counts this system actually sees; a set-based rewrite risks subtle bugs in the parity-verified aggregate CTEs).
- `RecomputeClass` — private, called only from the loop above; no external caller exists yet, so it stays private rather than being exposed speculatively.
- `ComputePrediction(vector)` — public, not `internal` (a deliberate choice to avoid adding `InternalsVisibleTo` just for the test project). Pure function: `intercept + sum(coefficient * (value - scalerMean) / scalerScale)`, clamped at 0.
- **Never throws (write side).** Every recompute-side public method catches broad `Exception`, logs via `Console.WriteLine` (same convention as the rest of the codebase), and returns without rethrowing. Per-class failures inside a competition's recompute loop (e.g. `PredictionUnavailableException` for a field with no completed-competition history) are caught and logged individually — one bad class does not stop its siblings from being recomputed.
- **Placement rationale:** the try/catch lives INSIDE `PredictionService`, not at BL call sites — the class BL methods have no try/catch of their own, so a throwing hook there would propagate to the controller's generic catch and turn a successful save into an error response.

Recompute always covers the whole competition, never just the touched class — see the `classes_per_competition` rule above.

**Hooks (one line each, all in `RideOnServer/BL/`):**
- `ClassInCompetition.CreateClassInCompetition` / `UpdateClassInCompetition` — call `PredictionService.RecomputeCompetition(item.CompetitionId)` after the DAL write.
- `ClassInCompetition.DeleteClassInCompetition` — signature gained a second parameter, `competitionId` (the controller already had it in scope from its own `[FromQuery]` param, so this was not a controller signature change). Recompute runs *after* the DAL delete completes; the deleted class's own `entryprediction` row is removed inside `usp_DeleteClassInCompetition` itself (repo file 19), not by `PredictionService`.
- `Competition.DuplicateCompetition` / `DuplicateCompetitionFromSelection` — call `PredictionService.RecomputeCompetition(response.NewCompetitionId)` after the DAL call returns, using `DuplicateCompetitionResponse.NewCompetitionId`.

Prizes have no separate hook: they are always saved as part of one of the three `ClassInCompetition` methods above (see Multiple Prizes Per Class below), so the class-level hook covers them.

**Verification state (July 2026):**
- Create, edit, and delete are verified end to end against live, including production after the Render deploy: the deployed backend rewrote all 25 `entryprediction` rows of a 25-class test competition (competition 41) in one batch, zero negative values, all on the active model version. Production populates the cache live since the merge: every class save/delete on the deployed app rewrites the whole competition's rows in one batch.
- **Duplication is NOT verified end to end.** The hook is wired and reviewed, but duplication itself fails first, before the hook is ever reached — a pre-existing bug on `main` (unrelated to Phase 5), tracked as **QA issue 36** (see Competition Duplication below); the hook is unreachable while duplication fails, and cannot break duplication when it works. The duplication hook gets its end-to-end verification as part of the issue-36 fix flow — now tracked as its own QA issue 39, blocked on 36.
- **Verification principle worth keeping:** because `PredictionService` swallows failures by design, a successful save in the UI proves nothing about whether recompute actually ran — a silently-swallowed exception looks identical to success from the caller's side. Only fresh `entryprediction` rows, or backend logs (every failure path logs with the `classincompid`/`competitionid` in the message), prove recompute happened.

### Read/Display Path (Phase 6 — merged to main, verified 2026-07-19)

Built on branch `feature/prediction-display` (commit `83aac17`, 10 files), merged to main by Oren, deployed via Render auto-deploy. Verified end to end against live on competition 41 (25 cache rows) with three-path verification: positive path against DB ground truth (values AND band math), per-row absence (delete/restore of one cache row — only that row degraded), and full endpoint failure (proc DROP/recreate — classes page rendered completely normally). Final production check on the deployed site plus a DB read confirming no cache changes during deploy.

- **Endpoint:** `GET api/ClassesInCompetition/{competitionId}/predictions?ranchId=...` on `ClassesInCompetitionController`, reusing the exact ranch-authorization block from `GetClassesByCompetitionId` (personId from claims, `EnsureUserHasRoleInRanch` HostSecretary, competition fetch, `HostRanchId != ranchId` → 403). A SEPARATE endpoint by design — never merge prediction data into the classes query/DTO, so a prediction-layer failure can never sink the classes load.
- **Failure-handling split (deliberate, the mirror of the write side):** the READ path does NOT catch — `PredictionService.GetPredictionsByCompetitionId(competitionId)` lets failures propagate to the controller's normal catch (BadRequest with the Hebrew catch-all string). The FRONTEND is the swallowing layer: `loadPredictions()` in `useSecretaryCompetitionClassesPage.js` has its own internal try/catch, `console.error` only — never `setError`, never a toast, never blocks `loadClasses()`/`loadEntries()` (all three run in one `Promise.all`, predictions failure leaves its state empty). Worst case (proc broken, endpoint 500, zero cache rows) the classes table renders exactly as it did pre-Phase-6.
- **Band math** lives in the BL method, computed at read time, never stored: `MinPredictedEntries = Math.Max(PredictedEntries - (decimal)Rmse, 0)`, `MaxPredictedEntries = PredictedEntries + (decimal)Rmse`. Same clamp-at-0 idiom and layer as `ComputePrediction`.
- **DTOs** (`RideOnServer/BL/DTOs/Prediction/`): `EntryPredictionCacheRow` (DAL row: ClassInCompId, PredictedEntries decimal, ModelVersionId, ComputedAt, Rmse double) and `ClassEntryPrediction` (response: ClassInCompId, PredictedEntries, MinPredictedEntries, MaxPredictedEntries, ModelVersionId, ComputedAt — the latter two kept deliberately for the future update-model feature, QA #37: a cached row's ModelVersionId differing from the active version means it is stale).
- **Response shape:** one item per class that HAS a cache row — classes without one simply don't appear in the array, they are not returned with nulls.
- **Display scope:** the standalone secretary classes page ONLY (web): `SecretaryClassesOverviewTable.jsx` + `useSecretaryCompetitionClassesPage.js` + one prop through `CompetitionClassesPage.jsx` + `getPredictionsByCompetitionId` in `classInCompetitionService.js`. The creation wizard (`ClassesInCompetitionSection.jsx` / `useCompetitionClassesStep.js`) is parked as QA #38 (its hardcoded 8-column grid template would need reworking). Mobile is EXCLUDED by product decision (web secretary only), not parked.
- **UI:** new תחזית כניסות column next to כניסות, with ONE global view switcher in the column header — a two-pill segmented control (מספר / טווח), NOT per-row and NOT a `<select>` dropdown (binary state: one click to flip, current state readable at a glance). Values render via `Math.round`; band renders as `min – max`. An absent prediction renders literally nothing for that row: no dash, no placeholder (unlike the other getters in that file which default to "-"). Table colSpan went 13 → 14.
- **Approved Hebrew strings (Phase 6 set):** column header "תחזית כניסות"; switcher labels "מספר" / "טווח"; switcher tooltips "הצגת התחזית כמספר בודד" / "הצגת התחזית כטווח (מינימום–מקסימום)"; backend 403 "אין לך הרשאה לצפות בתחזיות של תחרות זו"; backend catch-all "אירעה שגיאה בשליפת תחזיות כניסות" (the backend strings almost never reach a user — the frontend swallows this endpoint's failures — but they are approved repo literals).
- **Open items from this phase:** QA #37 (update-model recompute button — all machinery exists, only the trigger UI and staleness indicator are missing), QA #38 (wizard display, future consideration), QA #39 (duplication-hook end-to-end verification, blocked on QA #36).

### Schedule View (Phase 7 — in progress on `feature/schedule-view`)

Two schedule columns on the secretary classes page — לוח זמנים משוער (predicted, from the Phase 6 prediction cache) and לוח זמנים בפועל (live, from Active entries). Math lives in `web/src/utils/classSchedule.utils.js`; config comes from `usp_getscheduleconfigbyfieldid` (proc 164, deployed 2026-07-20) which joins `fieldconfig` duration bounds to the `smartconfig` key/value rows.

- **Schedule math is per DAY, never per competition.** Each day rolls forward from the `starttime` of its first class in `orderInDay` order; the late-finish check and the push-earlier suggestion are per day, and the button writes that day's first class. Where several classes tie for the day's first `orderInDay` (simultaneous, different arenas), the origin is the earliest `starttime` among them — realistically only one ever has it filled in.
- **Writes target ONE class, never the whole tied first group.** `orderInDay` can be null across every class in a day, which makes the tied group the entire day — a bulk write would stamp the start hour onto all of it.
- **Field exemption works by ABSENCE of a `fieldconfig` row**, not by a declared flag. All-around (3) has a row with NULL bounds and an explanatory `notes`; jumping (5) and dressage (6) have no row at all. All three are intended to be exempt and render no schedule columns. Consequence to remember: if jumping or dressage ever gets a `fieldconfig` row for an unrelated reason (e.g. `maxhorseclassesperday` for Phase 8 stall math), schedule columns would silently switch on for it.
- **Flattening gap is REINING ONLY** (confirmed 2026-07-20, superseding a seeded "all fields" note from 2026-07-18 that was wrong). Within reining a gap falls both between each class **and** every 5–7 runs, never doubled where a class boundary coincides with the run interval. `betweenclassgapminutes` = 10. Cutting and extreme get no gap at all.
- **Assumed start time.** When no class on a day carries a `starttime`, the day rolls forward from `smartconfig.defaultfirstclassstarthour` (8) and is flagged `isAssumedOrigin`. The view says so and offers a button to make the assumption real. The push-earlier suggestion is deliberately **suppressed** on assumed days — the finish time derives from an invented origin, so offering to shift off it would be false precision — while tier colouring is kept, since the shape of the day is still informative. If the config key is missing entirely, it falls back to the original durations-only rendering.
- **Post-midnight times render unwrapped** (`24:15`, `25:30`), not `00:15`. This is deliberate and documented in the `latefinishorangehour` smartconfig description ("Hours past midnight use 24+ notation"), not a bug.
- **`minutesperentry` live values:** reining 5/5, cutting 2.5/2.5, extreme 5/7. The רגיל view uses the average, so extreme = 6; for reining and cutting min and max are equal, so all three switcher states show the same number.
- **Late-finish tiers** read live from smartconfig: yellow 23, orange 24, red 25. Yellow is advisory text only, no button.
- **Open at time of writing:** the reining flattening model is not yet implemented (gap is still applied uniformly to every field); the 06:00 suggestion floor clamps silently with no text when the clamped suggestion no longer resolves the overage; the expandable column-group restructure (arena+judges / financial / schedule) is entirely unbuilt; and the `classDateTime` timestamptz round-trip through the apply button is unverified.

### Local Verification (Parity Harness)

`RideOnServer.Tests` (new xUnit project, first test project in this repo) has `FeatureVectorBuilderParityTests`, a live-DB harness comparing the C# builder against all 965 rows of `parity_reference_v1.csv`. Gated behind an env var so `dotnet test` is safe to run without a DB — it no-ops instead of failing when the gate is off. As of Phase 5, `dotnet test` discovers and passes 29 tests total (verified via `--list-tests`, not just the reported count — an earlier "24 + 5" breakdown was off by one): 23 `ClassNameFeatureExtractorTests`, the 1 gated `FeatureVectorBuilderParityTests` (counts as passed when it no-ops), and 5 `PredictionServiceTests` (clamp-at-0 math, and the never-throws swallow contract exercised via a real failure — an unconfigured connection string — rather than a mock). Only the parity test needs the env-var gate to do real work; the other 28 run fully with no DB required. To actually run the parity harness:

```powershell
cd RideOnServer   # DBServices.Connect() uses Directory.GetCurrentDirectory() to find appsettings.json
$env:ConnectionStrings__DefaultConnection = "..."   # only this one — this path never touches Jwt/auth config
$env:RIDEON_RUN_PARITY_HARNESS = "1"
dotnet test ..\RideOnServer.Tests\RideOnServer.Tests.csproj `
    --filter FullyQualifiedName~FeatureVectorBuilderParityTests `
    --logger "console;verbosity=detailed"
```

The `--logger "console;verbosity=detailed"` flag is required, not optional — the harness writes its report via `ITestOutputHelper`, which `dotnet test`'s default logger suppresses even on a passing run. Runs with bounded parallelism (`MaxDegreeOfParallelism = 6`, tune down if the Supabase pooler struggles) and fetches `usp_GetActiveModelParameters()` exactly once for the whole run, not once per row.

`RideOnServer.Tests` pins `FluentAssertions` to `7.1.0` deliberately — versions 8+ introduced a commercial license requirement; do not let a future `dotnet add package FluentAssertions` bump it past 7.x without checking that.

Headless notebook execution (`jupyter nbconvert --to notebook --execute --inplace`) requires `nbconvert`, `nbclient`, and an `ipykernel` registered as `python3`. None were present on Oren's machine as of July 2026 and had to be pip installed; they're local tooling, not committed.

---

## Competition Duplication (July 2026)

- `usp_duplicatecompetition` and `usp_duplicatecompetitionfromselection` each exist on live in **TWO overloads** differing only in start/end date param types (`date` vs `timestamp with time zone`) — drift debt from a past caller-type mismatch patched by adding an overload instead of fixing the caller. Collapse decision pending, live DB change via claude.ai only.
- ALL overloads declare `p_registrationopendate`, `p_registrationenddate`, `p_paidtimeregistrationdate`, `p_paidtimepublicationdate` as `date`.
- **QA issue 36 (open, hypothesis unconfirmed):** duplication fails with 42883 when registration dates are filled — the DAL sends them as `timestamp without time zone` (the `AddParameterWithType` unrecognized-key fallthrough), and timestamp→date is not an implicit cast, so no overload matches. Untyped NULLs coerce fine, which is why empty-date duplications always worked. Fix branch: fix/duplication-date-param-types, repo only.
- **QA issue 39 (open, blocked on 36):** the Phase 5 duplication recompute hook is deployed but unverified end to end. Once 36 is fixed: duplicate a competition and verify via live DB reads that `entryprediction` rows exist for the new classes with fresh computedat timestamps — UI success proves nothing (silent-failure design), DB reads are the only valid proof.

---

## Multiple Prizes Per Class (July 2026)

Classes support multiple prizes (add/remove rows in the form). Current live proc state, repo files match live:

- `usp_GetClassesByCompetitionId` and `usp_GetClassById` return **exactly one row per class** (no row-level classprize join). `PrizesDisplay TEXT` (last column) aggregates all prizes as `prizetypename: amount, ...` ordered by prizetypeid, same technique as `JudgesDisplay`. Legacy `PrizeTypeId`/`PrizeTypeName`/`PrizeAmount` columns are kept for backward compatibility, filled deterministically from the lowest prizetypeid row.
- `usp_GetClassPrizesByClassId(classincompid_param)` (repo file 158) returns the full prize row set — powers the edit-modal prefill.
- `usp_UpsertClassPrize` (repo file 159) is a **true per-row upsert** (`ON CONFLICT (classincompid, prizetypeid) DO UPDATE`). It previously deleted ALL class rows before inserting one — looping it self-erased, silently dropping all but the last prize. If prize saves ever lose rows again, check this proc first.
- Backend save pattern: `DeleteClassPrizeByClassId` once, then loop `usp_UpsertClassPrize` per row, one transaction. Duplicate prize types per class are rejected frontend + backend.
- All class-list surfaces (web + mobile read-only view) read `prizesDisplay`; the singular fields are legacy only.
- Known consumer surfaces to check on any future prize-field change: `SecretaryClassesOverviewTable.jsx`, `ClassesInCompetitionSection.jsx`, `DuplicateCompetitionSetupSection.jsx` (duplicate-competition preview), `CompetitionInvitationManager.cs`/`CompetitionClassInvitationItemDto` (invitation flow), and mobile's `CompetitionClassesSection.jsx`.

---

## Add Class Form Conventions (July 2026)

- A judge is **NOT required** to save a class (customer-confirmed). Downstream code must tolerate judgeless classes.
- Required fields: `classTypeId`, `arenaId`, `organizerCost`, `federationCost` (0 valid; empty/negative invalid). Rules live in one declarative array `FIELD_VALIDATION_RULES` in `ClassInCompetitionModal.jsx` — adding a mandatory field is a one-line change. Backend mirrors via `ValidationException`, caught by the controller to surface the specific Hebrew message.
- `classDate` optional, but when present must fall within the competition's date range (compare on `.Date`; backend reuses the competition already fetched for the ranch-authorization check).
- Feedback convention: `ToastMessage` component + `showToast(type, message)` pattern (see `useCompetitionFormPage.js`). Validation-failure toast: "המקצה לא נשמר. יש למלא את השדות המסומנים." Success: "המקצה נוסף בהצלחה" / "המקצה עודכן בהצלחה". Backend rejections surface via `getErrorMessage(error, fallback)`.
- **`ClassInCompetitionModal` is shared by two separate pages, each with its own data hook**: the competition-creation wizard (`CompetitionFormPage.jsx` → `useCompetitionClassesStep.js`) and the standalone classes page (`CompetitionClassesPage.jsx` → `useSecretaryCompetitionClassesPage.js`). Any change to the modal's behavior (toast wiring, new props, validation) must be wired into both hooks — easy to fix one and miss the other.

---

## Paid Time Domain (July 2026)

- `paidtimeslot` master: 21 rows, days ראשון..שבת (= JS getDay() 0..6) x
  timeofday בוקר/צהריים/ערב, IDs 1-21 day-major. Resolve paidtimeslotid by
  matching against the fetched base-slot list, never a hardcoded table.
- `paidtimeslotincompetition`: slotdate/starttime/endtime NOT NULL, CHECK
  starttime < endtime. `slotstatus` is free text, NO constraint, live data is
  mostly NULL plus a few 'Open' — dropdown conversion is open QA #33, blocked
  on Oren defining the value list. Request statuses ('Pending'/'Assigned')
  live on `paidtimerequest.status`, a different thing.
- `usp_getpaidtimeslotsbycompid` returns 17 columns incl. capacity math:
  total = slot minutes minus 10 (floor 0), used = sum(durationminutes + 1),
  places = floor(remaining / 11), plus a correlated PendingRequestsCount.
- `usp_getpaidtimerequestsforassignment(p_competitionid,
  p_selectedcompslotids, p_includeallpending)`: Assigned rows return ONLY for
  explicitly passed slot ids; Pending rows per the flag. Fixed July 2026
  (timestamptz declaration + seven ::text casts); repo file 121 reconciled.
- Form conventions: before/during toggle. Before = the 3 days preceding
  competitionstartdate, all three times shown. During = the competition range
  days, בוקר/ערב only (no צהריים). No date input — the date is derived from
  the chosen weekday and shown inside the day dropdown label. Hours and
  minutes are two separate CustomDropdowns (minutes 00/15/30/45 only), each
  owning its own scalar state field (startTimeHour etc.); the combined HH:MM
  is derived only at validation and submit — storing the combined string as
  dropdown state caused a select-then-revert bug. The API returns time
  columns as HH:MM:SS; edit-mode prefill must parse that. Quarter-hour
  validation is backend-only (silent guard, the UI makes violations
  impossible), plus a defensive weekday-vs-DayOfWeek backend check.
- Approved Hebrew string set for the paid time form (frontend
  `FIELD_VALIDATION_RULES` in `PaidTimeSlotInCompetitionModal.jsx`, backend
  `ValidationException` messages in `PaidTimeSlotInCompetition.cs` mirror the
  field-level ones exactly):
  - Timing choice required: "יש לבחור אם הסלוט לפני התחרות או במהלכה"
  - Day of week required: "יש לבחור יום בשבוע" (also used as the fallback
    message when `PaidTimeSlotId` fails to resolve/validate server-side,
    since day+time-of-day jointly determine it)
  - Time-of-day required: "יש לבחור מועד ביום"
  - Arena required: "יש לבחור מגרש"
  - Start/end time required: "יש לבחור שעת התחלה" / "יש לבחור שעת סיום"
  - End after start: "שעת הסיום חייבת להיות מאוחרת משעת ההתחלה"
  - Derived date outside window (defensive, also covers the weekday-vs-
    DayOfWeek mismatch check): "התאריך אינו תואם את זמן התחרות"
  - Time-of-day invalid for the before/during choice: "מועד זה אינו זמין
    עבור הבחירה שנעשתה (לפני/במהלך התחרות)"
  - Validation-failure toast: "פייד-טיים סלוט לא נשמר. יש לעקוב אחרי
    ההנחיות בטופס."
  - Success toasts: "פייד-טיים סלוט נוסף בהצלחה" / "פייד-טיים סלוט עודכן
    בהצלחה"
  - Quarter-hour boundary violation (backend-only, no frontend string —
    the UI makes this unreachable): "השעות חייבות להיות בכפולות של רבע
    שעה (00, 15, 30, 45 דקות)"
- `PaidTimeSlotInCompetitionModal` is shared by two pages/hooks (same trap as
  `ClassInCompetitionModal`): the competition-creation wizard
  (`CompetitionFormPage.jsx` → `useCompetitionPaidTimeStep.js`) and the
  standalone paid-time page (`CompetitionPaidTimePage.jsx` →
  `useCompetitionPaidTimePage.js`, which fetches the competition via
  `getCompetitionById` — added July 2026, it previously had no dates at all).
  Any change to the modal's props, validation, or toast wiring needs both
  hooks updated — this bit the class-form work first and repeated here.
- The standalone page's assignment sidebar uses dnd-kit WITH a DragOverlay
  portal (drag previews are never clipped by the scroll container — confirmed
  empirically, see UI Investigation Pattern below, so drag-out clipping is a
  non-issue for any future fix here). Open issue, untracked (no QA number,
  handled in-chat, NOT "QA bug #21" — that was an earlier session's wrong
  guess): constant card bleed above the sidebar list (`בקשות ממתינות`),
  reported on Oren's laptop at desktop width, NOT interaction-dependent (not
  scroll- or drag-triggered). Two isolated Playwright repro rounds — a mock
  harness, then the real `PaidTimeRequestCard` with realistic RTL content at
  1000-1440px spanning the `xl:` 1280px breakpoint — found zero escaping
  cards at rest in either round. The one-line `relative isolate
  overflow-x-hidden` fix on the scroll container is reverted (not applied)
  pending real data. Next step is DevTools computed styles plus browser
  version, zoom level, and OS display-scaling info from the affected
  machine — not more harness rounds.

---

## Local Development Setup

Backend (`RideOnServer`, port 5268): **does NOT load any .env file** — it reads only appsettings + real OS environment variables. Locally, set variables in the same PowerShell session before `dotnet run` (values mirror the Render dashboard):

```powershell
$env:ConnectionStrings__DefaultConnection="Host=...supabase.com;Port=5432;..."
$env:Jwt__Key="..."
$env:Jwt__Issuer="RideOnServer"
$env:Jwt__Audience="RideOnClient"
$env:Jwt__Subject="RideOnServer"
$env:SUPABASE_JWKS_URL="https://sxplumrexbolpwqacpiz.supabase.co/auth/v1/.well-known/jwks.json"
dotnet run
```

Oren keeps this as a script OUTSIDE the repo (`rideon-local.ps1`) and dot-sources it. A missing `Jwt__Key` crashes auth with `ArgumentNullException (Parameter 's')` at Program.cs line ~53; a missing connection string yields generic 400s on login.

Frontend (web): `.env.local` in `RideOnClient/rideon-client/web` with `VITE_API_BASE_URL=http://localhost:5268/api` — the `/api` suffix is mandatory (404 on `/SystemUsers/login` without it). Vite reads env files only at startup; restart `npm run dev` after changes. Verify local vs Render via DevTools Network tab request URLs.

Port 5268 "address already in use": a stale process holds it — `Get-Process -Name RideOnServer | Stop-Process -Force`. A stale running server also locks `RideOnServer.exe` and fails `dotnet build`.

`DBServices.Connect()` prints `=== DB HOST/PORT/USER/DATABASE ===` on **every single call** (RideOnServer/DAL/DBServices.cs:23-26) — pre-existing, not tied to any one feature. Expect four lines of this per DB round trip in any local run or loop-heavy harness; noisy but harmless. Logged as issue 34 in the QA tracker, fix pending on a dedicated branch.

The root repo `.env` (SUPABASE_URL/SUPABASE_KEY) serves Python scripts only — not the backend.

**`dotnet build` baseline (confirmed Phase 6):** a clean build of `RideOnServer` currently reports 0 errors and **171 pre-existing warnings** (`CS8620`/`CS8604`, nullable-reference mismatches between `Dictionary<string, object>` literals and `CreateCommandWithStoredProcedure`'s `Dictionary<string, object?>` parameter, repeated across most DAL files — PasswordResetDAL, HorseDAL, PayerDAL, PatternDAL, ServicePriceDAL, PaidTimeSlotInCompetitionDAL, etc.). This count is unrelated to any single feature branch. When verifying a build after a change, check that the specific files you touched are warning-free — do not expect the total warning count to be zero, and do not treat a nonzero count alone as a regression.

**Bash tool cwd persists across calls in the same session.** Running `cd RideOnServer && dotnet build` leaves the shell's working directory at `RideOnServer` for every subsequent command, including unrelated `git` calls later in the same session — a relative-path `git add RideOnDB/...` after that will fail with "pathspec did not match any files" even though the file exists, because it's being resolved from the wrong root. Either `cd` explicitly back to the repo root before git commands, or use paths/`-C` relative to a known-good root, whenever a build step's `cd` might still be in effect.

`git add` on brand-new files on this Windows checkout prints `warning: ... LF will be replaced by CRLF the next time Git touches it` — expected line-ending normalization noise (the repo's `core.autocrlf`/line-ending config), not a sign of a bad file or a real problem.

---

## UI Investigation Pattern (Playwright Harness)

For isolated frontend repro when Claude Code has no live DB credentials (see
Working Conventions below — Claude.ai owns live DB access):

- Add a temporary unguarded route under `src/pages/_devtest/` (one extra
  import + route entry in `router.jsx`), rendering the real component under
  test fed with mock props instead of going through the API/auth. Reuse the
  actual child components (e.g. `PaidTimeRequestCard`, `CustomDropdown`)
  rather than simplified stand-ins — a first-pass harness with simplified
  mock cards produced a false negative here (it missed that `<DragOverlay>`
  must be nested *inside* `<DndContext>`, not a sibling after it) that only
  surfaced once the real component tree was used.
- Comment temp routes/files with an accurate reason, not a guessed tracker
  number — an earlier harness commented `// TEMP: QA bug #21`, but the
  sidebar-bleed issue it was investigating was never filed with a QA number;
  it's untracked, handled in-chat.
- Install Playwright ephemeral into the session scratchpad
  (`npm install playwright` + `npx playwright install chromium`) — never
  into the repo's `package.json`; it's not a project dependency.
- Geometry checks: compare each card's `getBoundingClientRect()` against the
  scroll container's own box. **`escapesBottom` (a card's bottom edge past
  the container's visible bottom) is benign and expected for any
  below-the-fold row in a scrollable list — `overflow-y: auto` still clips it
  visually even though the raw layout rect exceeds the box.** Only
  `escapesTop`, `escapesLeft`, or `escapesRight` indicate a real visual
  bleed.
- Pull live `getComputedStyle()` values (`overflowX`, `overflowY`,
  `maxHeight`, resolved `height`, `position`, padding/margin) rather than
  assuming behavior from the Tailwind class list — e.g. `overflow-y: auto`
  alone computes `overflow-x: auto` too per the CSS spec (confirmed
  empirically here), so an explicit `overflow-x-hidden` class can be a no-op.
- **Cleanup obligation, non-negotiable**: the temp route (`router.jsx` edit),
  the `_devtest/*.jsx` file(s), and the backgrounded `npm run dev`/Vite
  process must all be removed/killed before ending the investigation. A
  crashed session once left all three behind; the follow-up session had to
  `git status`/`git diff` to confirm exact scope before reverting, and
  `netstat -ano` + `taskkill //PID <pid> //F` to find and kill the orphaned
  Vite process — plain `pkill -f vite` didn't see it, since it's a native
  Windows process rather than one visible in the Bash tool's process tree.

---

## Working Conventions with Oren

- Division of labor: **Claude Code** does repo exploration, edits, git, builds. **Claude.ai** runs live DB reads/writes via the Supabase connector. Oren relays messages between them; draft her Claude Code prompts ready to paste.
- Before any live DB write: run read-only checks first, explain what will happen in plain terms (simple analogies work well), and get her explicit go-ahead. She is appropriately cautious about DB changes.
- Testing flow: feature branch → local backend + frontend against live Supabase → merge to main → Render auto-deploy. DB changes are deployed independently of code and must stay backward compatible with the currently deployed backend.
- Claude Code should verify `dotnet build` and grep for bypass call paths after backend changes, and always show diffs before applying.
- **Git protection hook, exact scope as directly experienced (Phase 6):** `.claude/hooks/block-git.ps1` blocks `git checkout main` outright, and separately blocks ANY git command whose text contains the substring `merge` — including read-only, side-effect-free ones (`git merge-base --is-ancestor <sha> HEAD` was blocked purely on string match, not semantics). Prefer `git log --oneline` and eyeball ancestry instead of `git merge-base` in this repo. The hook does **not** block creating or switching to a brand-new branch (`git checkout -b feature/x` off `main` succeeds cleanly), and untracked files in the working tree survive that branch creation/switch — a file written before a required branch-gating check (e.g. proc 163 in Phase 6, written on `main` before the branch existed) does not need to be rewritten, only staged and committed after switching to the correct branch.

---

## Related Skills

- **ride-on-historical-insert** — insert competition data from Excel + PDF into Supabase
- **ride-on-entry-prediction** — ML pipeline to predict entries per class (linear regression)

---

## Common Task Patterns

**Check entry count for a competition:**
```sql
SELECT ct.classname, COUNT(CASE WHEN e.entrystatus='Active' THEN 1 END) AS entries
FROM classincompetition cic
JOIN classtype ct ON ct.classtypeid = cic.classtypeid
LEFT JOIN entry e ON e.classincompid = cic.classincompid
WHERE cic.competitionid = <id>
GROUP BY ct.classname ORDER BY entries DESC;
```

**Find competitions with missing prizes:**
```sql
SELECT c.competitionname, cic.classincompid
FROM classincompetition cic
JOIN competition c ON c.competitionid = cic.competitionid
LEFT JOIN classprize cp ON cp.classincompid = cic.classincompid
WHERE cp.classincompid IS NULL AND c.competitionstatus = 'הסתיימה';
```

**Delete fabricated entries for a class (for re-insertion):**
```python
# entry → servicerequest → bill → person chain
# person.lastname LIKE 'היסטורי%' identifies fabricated records
```
