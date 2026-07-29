# Per-ticket change list (file anchors)

All paths under `RideOnClient/rideon-client/web/src/`. "Read" = verified in repo this session (2026-07-29); "infer" = not individually opened, listed for the implementer to confirm.

## Server confirmation — judge English/country (#5) — VERIFIED LIVE

Read against live DB (project `sxplumrexbolpwqacpiz`, 2026-07-29):

- `judge.firstnameenglish`, `judge.lastnameenglish`, `judge.country` → all `is_nullable = YES`.
- **Zero CHECK constraints** on the `judge` table.
- `BL/Judge.cs` `ValidateJudge` (lines 71-85) requires only `firstNameHebrew`, `lastNameHebrew`, `fieldIdsCsv` — does **not** check English names or country.
- `usp_insertjudge` (live) does a plain `INSERT` with no validation; DAL passes empty strings for blank English/country.

**Conclusion: D2 (English/country optional) needs NO backend, proc, or DB change.** #5 is entirely frontend. (Latent note, not in scope: `ValidateJudge` throws English-language messages — unreachable once client-side field validation lands.)

## CAP-1 — inline field-error standard

- **Reference (leave as-is):** `components/secretary/ClassInCompetitionModal.jsx:548-552` and its `FIELD_VALIDATION_RULES` (line 13) + `PaidTimeSlotInCompetitionModal.jsx` (same pattern). These define the target.
- Migrate every other form's per-field error rendering to this exact treatment (see CAP-4/CAP-5 forms).

## CAP-2 — global/page error standard

- `components/common/ToastMessage.jsx` (read) — the page toast, error + success variants.
- Pages already wiring `ToastMessage` (read, grep): `ArenasAndStallsPage`, `CompetitionChangeTrackingPage`, `CompetitionClassesPage`, `CompetitionFormPage`, `CompetitionPaidTimePage`, `CompetitionsBoardPage`, `CompetitionShavingsPage`, `CompetitionStallsPage`, `ProfileSettingsPage`, `ServicePricesPage`, `WorkersManagementPage`, and superuser pages `ClassesManagementPage`, `FieldsManagementPage`, `FinesManagementPage`, `JudgesManagementPage`, `PrizesManagementPage`, `ReiningPatternsManagementPage`. Audit these for any ad-hoc inline error strings that should route through the toast or an inline field error per the rule.

## CAP-3 — Hebrew copy → see `hebrew-strings.md`.

## CAP-4 — required-field asterisk enumeration

**Already compliant (no change):**
- `components/secretary/arenas-stalls/ArenaModal.jsx` — `Field required` on שם מגרש (read).
- `components/secretary/arenas-stalls/StallCompoundModal.jsx` — `Field required` on שם מתחם / סוג תאים / תבנית מספור (read).
- `components/secretary/service-prices/ServiceProductModal.jsx` — `Field required` on שם מוצר / משך בדקות / מחיר (read).

**Forms to mark (do NOT use `Field`, or use raw labels — confirm each field against its validation source):**

| Form | Validation source (mandatory fields) | Mandatory fields to mark |
|---|---|---|
| `components/common/JudgeModal.jsx` | HTML5 `required` on Hebrew inputs (lines 122-141); server `ValidateJudge` | שם פרטי בעברית, שם משפחה בעברית (English names + מדינה **stay unmarked** per D2) |
| `components/secretary/ClassInCompetitionModal.jsx` | `FIELD_VALIDATION_RULES` (line 13): classTypeId, arenaId, organizerCost, federationCost | סוג מקצה, מגרש, עלות מארגן, עלות התאחדות (judge/date NOT required) |
| `components/secretary/PaidTimeSlotInCompetitionModal.jsx` | `FIELD_VALIDATION_RULES` (per system-knowledge: timing choice, day, time-of-day, arena, start/end time) | mark per that rule array |
| `components/secretary/competition-form/CompetitionDetailsSection.jsx` | `validateDetailsForm` (`utils/competitionForm.utils.js:144-182`): competitionName, fieldId, competitionStartDate, competitionEndDate | שם תחרות, ענף, תאריך התחלה, תאריך סיום (registration/paid-time dates optional) |
| `components/secretary/shavings/AddShavingsOrderModal.jsx` | ranch mandatory (#32, per system-knowledge) — confirm in file (infer) | mandatory ranch field |
| `components/superuser/ClassTypeModal.jsx` | confirm in file (infer) | per its validation |
| `components/superuser/FieldModal.jsx` | confirm (infer) | per its validation |
| `components/superuser/FineModal.jsx` | confirm (infer) | per its validation |
| `components/superuser/PrizeTypeModal.jsx` | confirm (infer) | per its validation |
| `components/superuser/ReiningPatternModal.jsx` | confirm (infer) | per its validation |
| `components/superuser/CreateSuperUserModal.jsx` | confirm (infer) | per its validation |
| `pages/secretary/WorkersManagementPage.jsx` | inline form (infer) | per its validation |
| `pages/auth/RegisterScreen.jsx` | uses `Field` — confirm `required` already passed (infer) | confirm state |
| `pages/shared/ChangePasswordPage.jsx` | uses `Field` — confirm `required` already passed (infer) | confirm state |

## CAP-5 — judge form (#5)

- `components/common/JudgeModal.jsx` (read): mark Hebrew first/last with asterisk; add per-field inline errors (CAP-1) for empty Hebrew names before calling `props.onSubmit` (currently `handleSubmit` line 82 submits unconditionally). English/country inputs already omit `required` — leave optional.
- `hooks/common/useJudgeCreation.js:68` (read): the generic catch-all `getErrorMessage(error, "שגיאה בשמירת השופט")` stays only as the true-server-error fallback; missing mandatory fields are caught inline before submit, so it no longer fires for them.
- No backend change (see Server confirmation above).

## CAP-6 — closing-date picker (#4) — BOTH bounds, BOTH create + edit

- `components/secretary/competition-form/CompetitionDetailsSection.jsx` — date inputs at lines 111-184. `registrationEndDate` input at 153-156; `registrationOpenDate` at 139-142; `competitionStartDate` at 111-114.
- On the registration-end input add **`min={registrationOpenDate}` AND `max={competitionStartDate}`** (registration closes on/after it opens and on/before the competition starts), plus an **immediate inline invalid-date message** (CAP-1 treatment) when an out-of-window date is chosen.
- Backstops in `utils/competitionForm.utils.js`: the registrationEnd < registrationOpen rule already exists at 165-171; **add** a registrationEnd > competitionStartDate backstop in `validateDetailsForm` for parity.
- Shared by create + edit (same section component), so both are covered by one change. Guard against empty bounds (registrationOpen/competitionStart may be blank — only apply a bound when its reference date is set).
- Hebrew: reuse the existing registration-open message verbatim; the new competition-start message is row 6 in `hebrew-strings.md` (needs sign-off).

## CAP-7 — prize-type dropdown (#17, optional)

- `components/secretary/ClassInCompetitionModal.jsx`: prize-row `CustomDropdown` at ~line 744 (`options={prizeTypes}`). Filter `options` per row to prize types not selected by sibling rows.
- Save-time duplicate rejection stays: `validatePrizeRows` lines 124-128 + per-row `errors.prizeTypeId` (line 110).

## CAP-8 — getErrorMessage dedupe

- **Three defs (read):**
  - `utils/competitionForm.utils.js:88` — **richest/superset** (handles string, `response.data.errors` ModelState dict, `response.data` string, `response.data.title`, `error.message`, fallback). **Adopt this as the shared helper.**
  - `hooks/secretary/useCompetitionPaymentsPage.js:34` — subset (response.data string / .message).
  - `pages/secretary/WorkersManagementPage.jsx:108` — minimal (`response.data || fallback`).
- Extract the superset to one shared util (e.g. keep in `utils/competitionForm.utils.js` or a new `utils/errorMessage.utils.js`); delete the other two local defs; repoint all ~19 importers.
- Verify: `npm run build` + `npm run lint`.

## Build / verify note

- Web: `cd RideOnClient/rideon-client/web && npm run build && npm run lint`.
- Server: **not touched** — no `dotnet build` required.
- Auth-gated pages can't be logged into by Claude Code — visual verification via Claude-in-Chrome on Oren's session, or a temporary `_devtest` harness route (see system-knowledge "UI Investigation Pattern"); clean up any harness.
