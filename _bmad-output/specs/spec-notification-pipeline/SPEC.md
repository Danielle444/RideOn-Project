---
id: SPEC-notification-pipeline
companions:
  - data-model.md
  - callers.md
  - build-phases.md
  - architecture-diagrams.md
sources:
  - ../../notification-pipeline-scope.md
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability only — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# RideOn Unified Push-Notification Pipeline

## Why

RideOn has **no push transport at all** — `Notification.cs` is a bare POCO, the `notification` / `notificationtype` tables sit empty, and nothing registers a device token. Two tracker items need to reach people on their phones: **#46** (a secretary wants to nudge a ranch's admins that registration is open) and **#31** (a secretary wants to signal a ranch's field workers that shaving orders are waiting). Built as two features they would duplicate token storage, recipient resolution, and send logic twice — and a third, a per-order delivery reminder, is already visible on the horizon. This spec builds **one** per-ranch, role-resolved broadcast + targeted push pipeline (transport = Expo, manually triggered by a secretary) with a mandatory confirm-before-send gate and a dedupe/throttle; #46, #31, and the delivery reminder are just *callers* hanging off it. The pipeline is the cake; the two tracker buttons are the cherry, built last. The genuinely hard, timeline-defining work is **push-token registration inside two mobile apps**, one of which the parallel "Shavings end-to-end" track is editing at the same time.

## Capabilities

- **CAP-1 — Push-token registration (both mobile apps)**
  - **intent:** A logged-in user's device can register for push so the pipeline can later reach them, with tokens kept current as they rotate.
  - **success:** On login in either app (worker and admin/payer), the app requests notification permission, obtains an Expo push token with the real `projectId`, and upserts it to the push-token table keyed on `personid`; a re-register replaces the prior token, and a send that returns Expo `DeviceNotRegistered` prunes the stale row. Demonstrable on a **real device**, not only an emulator.
- **CAP-2 — Per-ranch, role-resolved, approved-only recipient resolution**
  - **intent:** The pipeline can resolve exactly who to notify for a given caller and ranch, without ever touching rejected or pending role applicants.
  - **success:** A resolution SP takes `@ranchid`, returns the `personid` set for the caller's role, and filters `rolestatus = 'Approved'`; against live data (Approved 78 / Rejected 4 / Pending 4) it returns only the Approved rows. #46 resolves `roleid = 2`; #31 resolves `roleid = 4`. See [callers.md](callers.md) and [data-model.md](data-model.md).
- **CAP-3 — Send path with swappable transport (Expo built)**
  - **intent:** The pipeline can deliver a resolved notification through a transport chosen per notification type, with Expo as the one implemented channel.
  - **success:** A `controller → BL → DAL → DBServices.cs → stored procedure` path sends a push via Expo on a manual trigger; the send SP/BL selects transport off `notificationtype` (no `"Expo"` hardcoded into its bones), so a second channel could be added later without rewriting the send core. A push lands on a registered device.
- **CAP-4 — Sent-notification audit + dedupe/throttle**
  - **intent:** Every send is recorded, and a repeat send inside a per-type window is suppressed so a jumpy secretary cannot spam a ranch.
  - **success:** Each send writes one row to the sent-notification table; before sending, a throttle check (`ranchid` AND `notificationtypeid` AND `competitionid` AND `sentdate > now() - interval 'N minutes'`) blocks a duplicate. Tapping "nudge" twice in quick succession produces one push, not two.
- **CAP-5 — Confirm-before-send gate for broadcasts**
  - **intent:** Before a broadcast reaches real, un-recallable phones, the secretary must confirm exactly who and what.
  - **success:** A shared two-step confirm component shows the **recipient count**, the **resolved ranch**, and the **exact message text**, and requires a second deliberate action before send; it is applied to both broadcasts (#46, #31) and **not** to the single-recipient delivery reminder. The displayed count is a verification surface — a wrong number (40 when 12 was expected) is caught before broadcast.
- **CAP-6 — Caller #46: registration nudge to ranch admins**
  - **intent:** A secretary can nudge a ranch's admins that registration for a competition is open.
  - **success:** Fired from `RegistrationWindowPanel` (web) behind the confirm gate, it resolves ranch admins (`roleid 2`, Approved) — **never payers** — and sends a **warm** push (e.g. *"Registration for [competition] is open — a great time to get your riders signed up 🐴"*) that never implies the admin is behind. v1 = one competition, one push.
- **CAP-7 — Caller #31: pending-orders bat-signal to field workers**
  - **intent:** A secretary can signal a ranch's field workers that shaving orders are waiting.
  - **success:** Fired from the web Shavings page behind the confirm gate, it resolves all ranch field workers (`roleid 4`, Approved) and sends a ranch-wide bat-signal (e.g. *"Your ranch has pending shaving orders — please take a look."*) addressed to no specific order.
- **CAP-8 — Caller (contract seam): delivery reminder**
  - **intent:** The pipeline exposes a single method the Shavings track can call to remind the one assigned worker to deliver an order.
  - **success:** `SendDeliveryReminder(shavingsOrderId)` exists and, given an order, reads `shavingsorder.workersystemuserid`, bridges `systemuserid → personid` via `personmanagedbysystemuser`, resolves that person's token, and sends a targeted push with **no** confirm gate. The seam is built and unit-callable in v1; **end-to-end wiring is blocked** on the Shavings track's respond action shipping (see Non-goals and [build-phases.md](build-phases.md)).

## Constraints

- **Every resolution SP MUST filter `rolestatus = 'Approved'`.** Live data carries Rejected and Pending rows; an unfiltered resolve notifies rejected/pending applicants.
- **The push-token table is keyed on `personid`, not `systemuserid`.** Mirror `passwordresettoken`'s *shape* (token hash + created/expiry timestamps + upsert-on-reregister + prune) but **not** its key column — it keys on `systemuserid`, this must not. A wrongly-keyed token pushes to nobody silently: no error, no crash.
- **The `systemuserid → personid` translation is confined to the delivery-reminder edge only.** #31 and #46 resolve straight to `personid` (login and roles are personid). No system-wide systemuser handling.
- **Server code is `controller → BL → DAL → DBServices.cs → PostgreSQL stored procedures only` — no inline SQL.** SP dictionary params bind **positionally** (`@p1, @p2…`); entry order must match each SP's parameter order exactly. Authorization via `UserAccessValidator.EnsureUserHasRoleInRanch`, not `[Authorize(Roles=…)]`.
- **Transport must not be hardcoded into the send SP/BL.** Treat it as a swappable leg keyed off `notificationtype`; implement Expo only.
- **Confirm-before-send is mandatory for the two broadcasts and forbidden as a blocker for the single-recipient reminder.** The confirm dialog is a shared component applied to broadcasts (#31, #46) only.
- **#46 copy is a warm nudge, never a scold.** Admins must never see "lagging" or anything implying they are behind; the *trigger* (registration is behind) stays secretary-internal, the *message* stays inviting. Payers (`roleid 1`) are explicitly never notified by #46.
- **The throttle check runs before every send**, keyed on ranch + notification type + competition + time window.
- **Live DB writes go through `apply_migration` and are shown to Oren as exact SQL, confirmed before running, and re-read after.** Do not design off `RideOnDB/schema.sql` — it is stale; the live DB (`sxplumrexbolpwqacpiz`) is ground truth.
- **All push infrastructure and token registration live in one new feature branch off `main`** (shared infra — not a shavings branch). The worker-app startup / notification bootstrap must be coordinated with the parallel Shavings end-to-end track (which edits the same worker app); agree merge order.

## Non-goals

- **Multi-competition batched registration push** — v1 is one competition, one push; batching is parked as a later QA issue.
- **A second transport channel (SMS / email)** via `person.cellphone` / `person.email` — design leaves it swappable, but only Expo is built.
- **Automated (non-human) triggers** — every send in v1 is a manual secretary tap.
- **Multiple #46 phrasings / A-B copy** — the swappable-text design enables it; it is not built in v1.
- **Deep-link routing and foreground/background handling polish** — deferred past v1.
- **Per-order worker targeting for #31** — v1 is ranch-wide only; there is no worker↔order link at this stage.
- **End-to-end delivery-reminder wiring (CAP-8)** — the contract seam is built, but its trigger is owned by the Shavings track and does not exist yet; end-to-end is out of v1.

## Success signal

From the web app, a secretary opens `RegistrationWindowPanel` (or the Shavings page), taps "nudge," and sees a two-step confirm reading *"N recipients · [ranch] · [exact message text]."* She confirms, and the resolved **Approved** admins (#46) or field workers (#31) on **that ranch** — and no one else, never a payer, never a rejected applicant — receive an Expo push on their phones. A second tap within the throttle window sends nothing and no duplicate lands. Every send is recorded as one audit row.

## Assumptions

- The swappable message copy is stored via `notificationtype`; live `notificationtype` has only `notificationtypename` and `notificationtypedescription` (no dedicated body column), so v1 reuses `notificationtypedescription` or adds a column — see Open Questions.
- The delivery-reminder bridge uses only `Approved` mappings when translating `systemuserid → personid`; `personmanagedbysystemuser` carries an `approvalstatus` column — see Open Questions.

## Open Questions

- What is the exact throttle window `N` (minutes) for each notification type?
- What is the push-token table's column shape — one row per device or per person, and does it store device metadata?
- What is the precise signature of `SendDeliveryReminder` the Shavings track will call into?
- Should the `personmanagedbysystemuser` bridge filter on `approvalstatus = 'Approved'` when resolving the delivery-reminder recipient?
- Where does the swappable copy live in `notificationtype` — reuse `notificationtypedescription`, or add a dedicated body column?
- What are the deep-link targets per notification type? (P4, non-blocking.)
