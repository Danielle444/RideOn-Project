# Phase 8 — Financial Layer · Planning Handoff (for bmad-spec)

**Date:** 2026-07-22
**Source:** bmad-party-mode planning session (backend/data, secretary, UX, skeptic, PM, data-scientist, ranch-owner perspectives)
**Status:** Planning complete. Spec-ready. All assumptions verified against the live DB (`sxplumrexbolpwqacpiz`).
**Scope note:** No UI exists yet — the whole financial UI is greenfield. The "implemented touchpoints" in earlier notes were designed but never built.

---

## The chain

```
predicted entries → per-day unique horses → competition stalls → shavings & stall income
```

Everything is **read-time derivation** off the existing entry prediction + config tables. **Nothing new is stored.** This mirrors how `entryprediction` already withholds the min/max band (predicted ± RMSE, computed at read time).

---

## Surface — one page, three tabs (mirrors the schedule view)

| Tab | Hebrew | When | Content |
|-----|--------|------|---------|
| **1. Projection** | תחזית | Pre-registration (highest value — the only tab that works with zero entries) | Three **separate** ranges: entry income · stall income · shavings income. Paid time **excluded**. |
| **2. Actual** | בפועל | Post-registration / during | Running totals from real entries + real bookings. **Rename** the existing "סה״כ הכנסות צפויות" so it stops colliding with the projection. |
| **3. Projection vs. Actual** | תחזית מול בפועל | Once actuals exist | Model reliability scorecard + marketing/insight hook ("tracking X% under projection → consider promoting"). Computed as Tab 1 − Tab 2. |

**UX rules:**
- Irrelevant tabs (2 & 3 before registration) are **grayed out with a stated reason**, never hidden. No ghost/silent states.
- Everything is **always labeled a projection**, never dressed as the accounting total.
- Each service band shows **its own assumption and its own width**. A tight entry band next to a wide stall band is the honesty, not a defect.
- Ranges everywhere (never single point estimates) — the customer already expects "בערך, בין X ל-Y".

---

## Derivation assumptions (all source-verified against live DB)

| Step | Rule | Source table / values |
|------|------|-----------------------|
| Entries → horses per day | day's field entries ÷ `maxhorseclassesperday` (band) | `fieldconfig`: reining 1 · cutting 3 · all-around 5 · extreme 5 |
| Horses → stalls (booking duration) | each horse occupies a stall for **D or D−1 days** (both = range endpoints); D = competition length | `competition.competitionstartdate/enddate` |
| Stall tier assignment | fill real capacity: **regular-first = low income band, VIP/upgraded-first = high band**; bounded by actual counts | `stall.stalltype` (3=regular, 4=upgraded); DK has **128 regular / 61 upgraded** |
| Tack (equipment) stalls | **+1 per 3–5 horses** (range). *Softest assumption — flag prominently.* | `stallbooking.isfortack` (~30% of bookings, but tiny 7/23 sample) |
| Stall price | regular **150** / upgraded **200** | `pricecatalog` (product 3 / 4, ranch-scoped) |
| Shavings quantity | **2–3 bags per stall** | `smartconfig` `shavingsperstallmin`=2 / `shavingsperstallmax`=3 |
| Shavings price | **range 40–50** for now (see bug below — two products active) | `pricecatalog` products 5 (40) / 10 (50), ranch-scoped |
| **Shavings — operational output** | predicted **bag order quantity** (for advance purchasing — the secretary orders weeks/months ahead) | derived from stall count × bags/stall |

**Two pricing worlds (do not conflate):**
- Entry income = `classincompetition.organizercost + federationcost` — per class, ~100% populated (3 NULLs in 1,329).
- Stall/shavings income = `pricecatalog` — per product, per ranch. **Only ranch 11 (Double K) is populated; ranch 49 (Green Fields) has zero rows.**
- Prize money (`classprize.prizeamount`) is paid **OUT** — never part of income.

---

## Footgun (open-question C) — RESOLVED

Schedule scheduling-exemption keys off **NULL `minutesperentrymin/max`**, *not* on the absence of a `fieldconfig` row. Confirmed:
- `usp_getscheduleconfigbyfieldid` does `LEFT JOIN fieldconfig`; `classSchedule.utils.js` treats null minutes as "render no schedule columns."
- **Live precedent:** all-around (field 3) *has* a `fieldconfig` row (`maxhorseclassesperday=5`) with **NULL** minute bounds and is correctly schedule-exempt today.

**Decision:** to give jumping (5) / dressage (6) a `maxhorseclassesperday` for stall math, add `fieldconfig` rows with the minute columns **left NULL**. Behaves exactly like all-around — schedule stays off.
- **Guard comment mandatory** on the migration: minutes MUST stay NULL for fields 5/6 or the schedule view regresses.
- **Pre-requisite:** grep the *entire* schedule read-path first to confirm no second code path counts rows (owner: backend/Dana, pre-implementation).

---

## Excluded / cut

- **Paid time** — not entry-derived, ~always fully booked, essentially reining-only. Out of the income projection.
- **Standalone stall count** — nothing actionable (stalls are fixed ranch assets; the owner already knows how many they have). Stalls appear only inside stall *income*.

---

## Residual questions for spec (not blockers)

1. **Shavings tier ambiguity** — two bag products are active at DK simultaneously (a bug, see QA item). Until fixed, project shavings price as the **40–50 range**. Spec should define per-competition bag selection once the bug is resolved.
2. **Cross-day horse-days arithmetic** — formalize the per-day-horse → unique-competition-horse reconciliation beyond the D/D−1 duration range (owner: data-scientist).
3. **Ranch-49 empty pricing state** — copy + behavior. Must show a prompt to set prices, **never a zero**. Proposed copy: `מחירון לא הוגדר עבור החווה — עדכנו מחירי תאים ונסורת כדי לקבל תחזית`.
4. **Tack uplift confidence** — 1-per-3–5 rests on a 7/23 sample; optionally harden against full `stallbooking` history.

---

## Out of scope (explicitly next phase)

Yearly income projections; most-profitable classes/fields/periods; expansion-opportunity analytics. Do not let the spec creep into these.

---

## Model facts (context)

Entry-count model: linear regression, R² 0.766, RMSE 3.086, MAE 2.180, 44 features. Runs in C# from JSON-exported coefficients (`intercept + Σ coef·(x−mean)/scale`, clamped at 0) — no Python service. Predictions cached per class in `entryprediction` (63 rows currently); the ± RMSE band is computed at read time, never stored.
