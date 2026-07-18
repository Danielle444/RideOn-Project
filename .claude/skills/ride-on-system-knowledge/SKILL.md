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
3. Known live naming mix: `usp_CheckUsernameExists`, `usp_RegisterSystemUserWithRoles`, `usp_GetSystemUserForLogin`, `usp_CheckSuperUserEmailExists` use `*_param` style; the rest use `p_*`. `usp_GetSystemUserForLogin` returns VARCHAR (not TEXT) for its 5 string columns. Repo files match live as of July 2026 — keep it that way.
4. **`PG_01_Auth.sql` is DEPRECATED — never run it.** Source of truth is `RideOnDB/StoredProcedures/PostgreSQL/Individual/`.
5. Any SQL pasted into the Supabase SQL editor must also be committed to the repo, always.
6. Before removing behavior from a live proc (e.g. an internal delete-before-insert), check whether the C# caller already replicates that behavior itself. If it does, the proc fix is safe to deploy independently of an app deploy; if not, time the proc change with the deploy. (Confirmed this way for the `usp_UpsertClassPrize` fix — `SaveClassPrize`/`SaveClassPrizes` already called `usp_DeleteClassPrizeByClassId` before every upsert call, so removing the proc's internal delete changed nothing for the already-deployed app.)
7. **Drift can run either direction — check both, don't assume the repo is behind.** Usually a proc gets pasted into the SQL editor and the repo file never catches up, so live is ahead. But `usp_GetPaidTimeSlotsByCompId` (repo file 91) was the opposite kind of surprise: the repo copy only had 8 columns (no `PaidTimeSlotId`, `SlotStatus`, `SlotNotes`, or any of the capacity/assignment columns), while the C# DAL reader had been expecting all 17 columns all along — proof the *app* and *live DB* were already in sync and only the *repo file* was stale. Live's actual body computes `TotalCapacityMinutes` as slot minutes minus 10 (floor 0), `UsedCapacityMinutes` as `sum(durationminutes + 1)`, `EstimatedAvailablePlaces` as `floor(remaining / 11)`, and `PendingRequestsCount` via a correlated subquery on `paidtimerequest` — none of that was reconstructable from the repo's stale copy or from column names alone. Fixed by having claude.ai run `pg_get_functiondef` on the live proc and pasting the exact result back into the repo file character for character (never hand-reconstruct a proc body from behavior alone, per rule 2b). Aside: `PG_04_Facilities.sql`'s copy of the same proc is even more stale (different param-naming style, missing columns entirely) — it looks like the same kind of deprecated legacy aggregate as `PG_01_Auth.sql` and was left untouched, not treated as a second source of truth.

Supabase project id: `sxplumrexbolpwqacpiz`. Claude.ai can apply DDL via the Supabase connector (`apply_migration`, records in migration history — `case_insensitive_auth_lookups` was applied this way). Claude Code has no DB credentials; it edits repo files only.

---

## Smart Element — Entry Prediction Integration (July 2026)

The trained entry count model (linear regression, 44 features, R2 0.766, RMSE 3.086, MAE 2.180) is integrated into the backend. Runtime prediction = intercept + sum(coef * (x - mean) / scale), clamped at 0. Source of truth for parameters: `models/entry_prediction_model_v1.json` (exported from `Smart_Element/01_data_prep.ipynb`); parity baseline: `models/parity_reference_v1.csv` (965 historical rows, verified 965/965 against the C# builder).

**Live tables (created via migrations, seeded):**
- `modelversion` — modelversionid serial PK, versionname ('v1'), trainedat, r2, rmse, mae, ntrain, ntest, intercept, isactive (partial unique index: one active)
- `modelparameter` — 44 rows per version: featurename, featureorder 1..44, coefficient, scalermean, scalerscale
- `entryprediction` — cache: classincompid PK, predictedentries, modelversionid, computedat (min/max band is computed at read time as predicted ± rmse, clamped at 0 — never stored)
- `fieldconfig` — per field: minutesperentrymin/max (NULL = exempt from scheduling recommendations, e.g. אולארונד), maxhorseclassesperday (reining 1, cutting 3, all around 5, extreme 5)
- `smartconfig` — global key value: shavingsperstallmin 2 / max 3, betweenclassgapminutes 10, latefinishyellowhour 23 / orangehour 24 / redhour 25 (hours past midnight notation), flatteningguidance (free text; frequency is secretary discretion per competition)

**Deployed procs:** `usp_GetEntryPredictionFeatureInputs(p_classincompid)` (repo file 160) and `usp_GetActiveModelParameters()` (repo file 161).

**Backend components (main):** `ClassNameFeatureExtractor` (pure C#, ports the notebook regexes exactly — NO prefix stripping or typo normalization; those rules belong to historical insert matching only), `FeatureVectorBuilder` (assembles by featurename from DB featureorder, never positional in code), `EntryPredictionDAL`, `PredictionUnavailableException`.

**Non-obvious rules learned:**
- Aggregate features (field_avg_past_entries, classname_avg_past_entries) use completed competitions only, grouped by name text, NO self exclusion, no date cutoff — exact training reproduction.
- Fallbacks: unseen classname falls back to field average; field with no completed history (jumping, dressage) = refuse to predict, never silent zeros.
- classname_avg_past_entries is the dominant feature (coef 6.21) — never default it to 0.
- day_of_week is pandas convention Monday=0 computed on the UTC instant in C#: `((int)dow + 6) % 7`. Never use EXTRACT(DOW) or raw .NET DayOfWeek (both are Sunday=0). Npgsql returns Kind=Utc (verified empirically).
- Month dummies exist only for 4,5,6,8,9,10,11,12; other months map to all zeros (months 1,2,7 are unseen by training — extrapolation).
- has_prize flags = amount > 0 (a zero amount prize row is a false flag). Prizes matched by prizetypeid, never name patterns.
- classes_per_competition counts ALL sibling classes regardless of status — so adding or removing any class changes the feature vector of ALL siblings in that competition (recompute the whole competition, not one class).
- Prediction must never break a main flow: recompute failures are caught, logged, swallowed.

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

The root repo `.env` (SUPABASE_URL/SUPABASE_KEY) serves Python scripts only — not the backend.

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