---
title: Loading-vs-missing 3-state cohesion + cosmetic (#28, #62) + change-tracking dead-code (#52)
slug: loading-cosmetic-hygiene
date: 2026-07-29
status: draft
project: RideOn — secretary/superuser web (RideOnClient/rideon-client/web)
branch_base: main
companions:
  - empty-state-sites.md
  - change-list.md
  - hebrew-copy.md
sources:
  - ../secretary-qa-cleanup/spec2-loading-cosmetic-hygiene-handoff.md
  - ../secretary-qa-cleanup/triage-and-thread-summary.md
---

# SPEC — Loading-vs-missing cohesion + cosmetic + FE hygiene

## Why

The web admin app flags data as **"missing"** before its fetch has finished, so
list/table surfaces flash a "לא נמצאו…"/"אין נתונים" message during load and only
then fill in. The shared primitives to fix this already exist and 15 surfaces use
them correctly — the rest hand-roll their own empty string, and a subset of those
have **no loading awareness at all**, which is the visible bug. This is a wiring
and cleanup pass, not a build: route every data-fetch list through the existing
three-state (`loading → empty → data`), plus two trivial cosmetic fixes (#28, #62)
and one dead-code removal (#52). No product decisions.

## Capabilities

### CAP-1 — Loading-vs-missing three-state standard
- **Intent:** Every secretary/superuser **data-fetch** list/table/detail surface
  renders the shared loading state while its fetch is in flight, the shared empty
  state only when the fetch has completed AND the data is genuinely empty, and the
  rows otherwise. Migrate hand-rolled empties to the shared primitives; thread a
  `loading` prop through where one is missing. Reference impl:
  `components/secretary/CompetitionsTable.jsx:256-263`. Full enumerated site list,
  per-site tier (A = no gate/flashes, B = gated but hand-rolled), and the
  taxonomy of what is in vs out are in `empty-state-sites.md`.
- **Success:** No enumerated surface displays an empty/"missing" message while its
  own fetch is in flight (loading state shows instead); every migrated site uses
  `DataTableLoadingState` + `DataTableEmptyState` (or `LoadingSpinner` for
  page-level, non-table surfaces); `npm run build` and `npm run lint` are clean.

### CAP-2 — #28 remove the dead duplicate stall-order button
- **Intent:** On the stalls page there are two "הוסף תא" buttons: a permanently
  **disabled** greyed placeholder in the header and a working one that opens the
  create modal. Remove the disabled placeholder; keep the working one.
- **Success:** Exactly one add-stall control on the page, and clicking it opens the
  create-booking modal; no now-unused imports remain (lint clean).

### CAP-3 — #62 fix summary income/paid-unpaid overflow
- **Intent:** The summary dashboard's income + paid/unpaid amount cards overflow
  horizontally when the viewport narrows. Apply responsive containment so the
  figures wrap/shrink within their cards instead of pushing page-level horizontal
  scroll.
- **Success:** At widths 320 / 375 / 768 / 1024 / 1440, the summary amount cards
  show no clipped figure and produce no horizontal page overflow.

### CAP-4 — #52 remove change-tracking dead casing + de-duplicate `buildChangedFields`
- **Intent:** The change-tracking table, details modal, and page hook defensively
  read `camelKey || pascalKey` although the API returns consistent PascalCase.
  Remove the dead camelCase half. Extract the byte-identical `buildChangedFields`
  helper cluster (duplicated across the table and the modal) into the existing
  `utils/changeTracking.utils.js`.
- **Success:** One `buildChangedFields` definition, imported by both consumers; no
  `camelKey` lookups remain in the three files; the page renders identically
  (behavior unchanged); `npm run build` + `npm run lint` clean. Exact anchors and
  edits in `change-list.md`.

## Constraints

- **Reuse existing primitives only** — `DataTableLoadingState.jsx`,
  `DataTableEmptyState.jsx`, `LoadingSpinner.jsx`. Do not build new components.
- **Data-fetch surfaces only.** Do NOT migrate: dropdown/picker *search*-empties
  (`CustomDropdown`, `MultiSelectPicker`, any `noResultsText` prop), per-field
  "not set" text (`לא הוגדר מיקום`, `ריק`), or auth/error banners (`AuthContext`,
  `ChangePasswordPage`, `SelectRanchPage`). These are not loading-vs-missing.
- **Preserve action-bearing empties.** `ChangeRequestsTable` splits a filter-empty
  (carries a "ניקוי סינון" clear button) from a true-empty. Keep both; reuse only
  the shared *loading* state there, do not flatten the empties.
- **Copy unification is mechanism, not wording.** The shared empty default is
  `"לא נמצאו נתונים להצגה"`. Surfaces with a meaningfully more specific message keep
  it via the `message` prop. Any string that actually changes is listed for Oren
  in `hebrew-copy.md`.
- **API casing is PascalCase** (verified against the deployed change-tracking read
  procs) — dropping the camelCase half is safe.
- **No server changes.** No `.cs`, no procs, no DB. Verify with `npm run build` +
  `npm run lint` only (no `dotnet`).
- **Branch off `main`.** Per-item commits are fine; keep #52 (behavior-neutral
  cleanup) separable from the CAP-1 wiring.

## Non-goals

- **#20** (classes tab missing entry counts) — a genuine backend proc gap
  (`usp_getclassesbycompetitionid` returns no entry columns), NOT a loading bug.
  Its own backend ticket; untouched here.
- **Spec 1** (error-message + required-field cohesion) and **Spec 3** (backend
  date-filter overlap + backend hygiene #34/#35) — separate sessions.
- **Web button cohesion** (103 files, no shared web `Button`) — future dedicated
  effort.
- **Mobile** — web only.
- No visual redesign of the loading/empty primitives themselves.

## Success signal

A reviewer, loading each enumerated secretary/superuser list surface with a
throttled/slow network, sees a spinner (never an "empty/missing" message) until the
fetch resolves, then either rows or a single empty message. The stalls page has one
working add-stall button. The summary amount cards hold their figures with no
horizontal page scroll from 320px up. The change-tracking files have a single
`buildChangedFields` and no `camelKey` fallbacks, and the page behaves exactly as
before. `npm run build` and `npm run lint` both pass with no new warnings.
