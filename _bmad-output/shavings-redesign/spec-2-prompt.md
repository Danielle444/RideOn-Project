# Spec 2 kickoff prompt — Shavings page redesign (secretary web)

> Paste the block below into a fresh session. Run **after Spec 1** is specced — Spec 2 builds on
> the status vocabulary and reads Spec 1 establishes.

---

/ride-on-system-knowledge
/ride-on-live-db-ops
/bmad-spec

Create a SPEC for **Spec 2 — Shavings page redesign** (secretary web app) in the RideOn
equestrian system. This is the **frontend/UX** spec. The order-table, stored-proc, worker-mobile
and approval-removal changes are **Spec 1 — do NOT redesign the data layer here**; consume what
Spec 1 defines. Notification push (#31/#46) is out of scope.

**Read first (verified ground truth, do not re-derive):**
- `_bmad-output/shavings-redesign/shavings-data-layer-map.md` — full data-layer map + §5 ratified
  decisions (the status vocabulary and field meanings you must render).
- The Spec 1 spec output (dependency) — for the finalized `deliverystatus` tokens, the
  `seen`(=responsetime) / `delivered`(=arrivaltime) / created(=`prequestdatetime`) field meanings,
  and the updated `usp_getshavingsordersforcompetitionandranch` shape.

**Scope — three tracker issues:**

**#29 — Redesign the page (scrap & rebuild).** Current page:
`RideOnClient/rideon-client/web/src/pages/secretary/CompetitionShavingsPage.jsx`
(service `web/src/services/shavingsOrderService.js`). Take visual/structural inspiration from the
**end-of-competition summary shavings section** — study
`web/src/components/secretary/competition-summary/SummaryDetailsModal.jsx`,
`CompetitionSummarySection.jsx`, `hooks/secretary/useCompetitionSummaryPage.js`,
`services/competitionSummaryService.js` — and **reuse its reads** (`usp_getcompetitionsummaryshavingsdetails`
/ `usp_getcompetitionsummaryshavingsentries`) rather than reinventing them. The new page shows
**all** shaving orders for the competition, with a **toggle to group by _Ranch_ or by _Order
Status_** (`Pending → Seen → Delivered` — the worker pipeline Spec 1 defines; there is **no
approval state** anymore).

**#30 — SLA highlighting.** Distinct visual flag for delayed orders, two rules:
1. Not **seen** within **3h of creation** (`prequestdatetime` → still `Pending`).
2. **Seen but not delivered** within **3h of being seen** (`responsetime` set, `arrivaltime` null).
Put the 3-hour threshold in a named constant, not a magic number. Consider a dedicated
"needs attention" section or in-row highlighting; the secretary should spot delays at a glance.
(Note: the original issue said "approved within 3h" — approval is removed, so the clock is
**seen**, not approved. Confirm wording with Oren.)

**#32 — Secretary add-order form (required Ranch).** Mirror the admin add-order form but with an
explicit **mandatory Ranch dropdown**. Backend plumbing already exists: `usp_createshavingsorder`
takes `@ranchId` + a `@stalls` jsonb array, and `usp_getstallbookingsforshavings(competitionId,
ranchId)` feeds the stall picker (order attaches to **stall bookings**, not a ranch directly — the
ranch selection scopes which stalls are pickable). Confirm the secretary controller/BL path exists
or specify it.

**Design constraints (apply the web design-quality rules):**
- No default/template look. Intentional hierarchy, rhythm, and state design; the grouping toggle
  and SLA flags should feel like part of a system, not bolted on. RTL Hebrew UI.
- Tailwind CSS v4, React Router v7 (per project). Reuse existing secretary component patterns and
  the competition-summary visual language so the page feels native to the app.
- The grouping toggle and any status/ranch filter belong in URL state where practical.

**Architecture constraints (RideOn):**
- Web reaches the API via the shared `axiosInstance`; data comes from ASP.NET controllers → BL →
  DAL → stored procedures. This spec should NOT author new procs beyond what Spec 1 leaves; if a
  new read is unavoidable, flag it as a Spec 1 dependency instead of inlining SQL.
- Verify behavior in the browser preview (dev server `web/`, `npm run dev`, localhost:5173) — the
  redesign is observable; screenshot the ranch view, the status view, and a flagged-delayed order.

**Deliverable:** the bmad SPEC kernel + companions for the redesigned page — component structure,
the ranch/status grouping model, SLA-flag logic + constant, the add-order form with required ranch,
loading/empty/error states, and an explicit list of any fields/reads it needs **from Spec 1**.
