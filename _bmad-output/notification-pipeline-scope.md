# RideOn — Unified Push-Notification Pipeline · Scope & Phased Build Plan

**Status:** Scope only — no code. Ready to hand to `bmad-spec`.
**Date:** 2026-07-24
**Owner branch:** new feature branch off `main` (shared infra — NOT a shavings feature branch).
**Covers tracker issues:** #31 (nudge field workers re: pending shaving orders) and #46 (nudge ranch admins re: registration). **One pipeline, multiple callers** — not two features.
**Prior lineage:** originally recommended by the party-mode room as iss42; split into #31 + #46.

---

## 1. One-line scope

A per-ranch, role-resolved **broadcast + targeted push pipeline** with a **confirm-before-send** gate and a **dedupe/throttle**, transport = **Expo push, manually triggered** by a secretary. #31, #46, and a later delivery-reminder are just *callers* hanging off one shared pipeline. The genuinely hard, timeline-defining work is **push-token registration inside two mobile apps** (worker + admin/payer), one of which is being edited in parallel by the "Shavings end-to-end" track.

---

## 2. Ground truth (verified live against Supabase `sxplumrexbolpwqacpiz`, 2026-07-24)

Do not design off `RideOnDB/schema.sql` — it is known stale. These were confirmed live:

- **No transport exists.** `Notification.cs` is a bare 16-line POCO. No DAL / BL method / controller / web service. No `expo-notifications`, no token storage, no Firebase — server or mobile.
- **Tables that exist (bare):** `notification`, `notificationtype`. Matching the POCO. Reusable.
- **Token-storage precedent:** `passwordresettoken` already ships (OTP flow). Mirror its pattern for the new push-token table — do not invent from scratch.
- **Recipient join:** `personranchrole (personid, ranchid, roleid smallint, rolestatus varchar)`. **Keyed per ranch, not per competition.** There is no worker↔competition assignment table.
- **Roles:** `1 = משלם` (Payer), `2 = אדמין חווה` (Ranch Admin / owner), `3 = מזכירת חווה מארחת` (Secretary), `4 = עובד חווה` (Field Worker).
- **`rolestatus` is NOT all Approved:** live counts `Approved=78, Rejected=4, Pending=4`. **Every resolution SP MUST filter `rolestatus='Approved'`** or it will notify rejected/pending applicants.
- **Shaving order → worker:** `shavingsorder.workersystemuserid` exists and is **already ~40% populated** (4/10). This is a **`systemuserid`**, not a personid.
- **Shaving order → ranch:** indirect — `shavingsorder → shavingsorderforstallbooking.stallbookingid → stallbooking.ranchid`.
- **Dead columns owned by the shavings track:** `shavingsorder.responsetime` and `arrivaltime` are 0/10 populated. The Shavings end-to-end track will begin writing `responsetime` when the worker taps its new respond/seen action.

---

## 3. Recipient resolution (open question #1 — RESOLVED)

All resolution SPs take a `@ranchid` and filter `rolestatus='Approved'`.

| Caller | Recipients | Rule |
|---|---|---|
| **#46** registration nudge | Ranch **admins only** | `roleid = 2` AND `ranchid = @ranch` AND `rolestatus='Approved'`. **Payers (`roleid 1`) are explicitly NOT notified** — they are paying customers; bother them as little as possible. |
| **#31** pending-orders bat-signal | **All ranch field workers** | `roleid = 4` AND `ranchid = @ranch` AND `rolestatus='Approved'`. Ranch-wide; there is no per-order worker targeting at this stage. |
| **Delivery reminder** (later, contract) | **The single assigned worker** | Read `shavingsorder.workersystemuserid`, **bridge systemuserid → personid** via `personmanagedbysystemuser`, then resolve that person's token. |

---

## 4. Identity & token key (open question — RESOLVED)

**The push-token table is keyed on `personid`.** Confirmed by Oren.

- Login is personid; roles are personid; therefore #31 and #46 resolve directly to personids and "just work."
- Shaving orders carry `workersystemuserid` (a *systemuser* id). The **delivery reminder** is the *only* caller that must translate `systemuserid → personid` (via `personmanagedbysystemuser`) before looking up a token. This translation is a **single, named step at the edge of that one caller** — not a system-wide concern.
- **Why this matters:** a wrongly-keyed token silently pushes to nobody — no error, no crash. Keying on personid removes that landmine.

---

## 5. Storage (open question #3 — RESOLVED)

Two new tables (DDL via `apply_migration`; each write shown to Oren as exact SQL and confirmed before it runs, per live-DB protocol):

1. **Push-token table** — keyed on `personid`. Mirror `passwordresettoken` shape. Holds the Expo push token per person/device, plus timestamps for pruning stale tokens. Supports token rotation (upsert on re-register; prune on Expo "DeviceNotRegistered" errors).
2. **Sent-notification record** — one row per send. Powers **audit**, **dedupe**, and the **throttle** ("already nudged in the last N minutes"). This is a **seatbelt, not bookkeeping**: without it a jumpy secretary taps "nudge" four times and 30 admins get four identical pushes that cannot be recalled. Throttle check before send: `WHERE ranchid AND notificationtypeid AND competitionid AND sentdate > now() - interval 'N minutes'`.

`notificationtype` (existing) carries the message copy so wording is **swappable without a code change**.

---

## 6. Transport (open question #2 — RESOLVED)

**Expo push notifications** — a regular push that pops up on the recipient's phone. Fits the RN/Expo stack; token registration flow needed in **both** mobile apps.

- The send SP / BL must **not hardcode "Expo" into its bones** — treat transport as a swappable leg keyed off `notificationtype`. Build Expo only.
- SMS/email are **NOT in scope.** (`person.cellphone` / `person.email` exist, so a second channel is *possible* later, but the recipients we care about — admins and workers — use the app. Parked, see §11.)

---

## 7. Callers

### 7a. #46 — Registration nudge to admins
- Recipients: ranch admins (`roleid 2`), approved.
- **Tone is a hard requirement: nudge, never scold.** Admins must **never** see the word "lagging" or anything implying they are behind on their job. They are busy paying customers.
  - **Trigger** (why the secretary sends: registration is behind) stays **internal / secretary-facing.**
  - **Message** (what the admin's phone shows) is **warm and inviting**, e.g. *"Registration for [competition] is open — a great time to get your riders signed up 🐴"*.
- **v1 = one competition, one push.** Multi-competition batching is parked (§11).
- Fired from `RegistrationWindowPanel` (web), behind the two-step confirm.

### 7b. #31 — Pending-orders bat-signal to field workers
- Recipients: all ranch field workers (`roleid 4`), approved. **Ranch-wide, unaddressed to any specific order** — there is no worker↔order link at this stage.
- Message is a **bat-signal**, not a task assignment: *"Your ranch has pending shaving orders — please take a look."*
- Fired from the web Shavings page, behind the two-step confirm.

### 7c. Delivery reminder — the third caller (contract seam, dependency)
- **Approved approach: (a) build the pipeline now + define a contract the shavings track calls into.**
- Recipients: the **single assigned worker** on the order (`workersystemuserid` → personid).
- Message: *"You have a shaving order to deliver — tap to mark it delivered."* Targeted, personal.
- **Trigger is owned by the Shavings end-to-end track**, not this one: it fires when the worker taps the shavings track's new respond/seen action (which populates `shavingsorder.responsetime`). This pipeline exposes **one method** — e.g. `SendDeliveryReminder(shavingsOrderId)` — that the shavings track calls when its button ships. The shavings track needs to know *nothing* about Expo or tokens.
- **This caller is BLOCKED** on the shavings respond action existing. Build the seam now; the delivery reminder itself can't be end-to-end tested until the shavings track lands. See §9.

---

## 8. Send path & safety rails

- **Manual trigger only** (secretary taps a button). Automated triggers are a later phase (§11).
- **Confirm-before-send is mandatory for the two broadcasts (#31, #46)** — broadcast reaches real people and cannot be recalled. **Two-step, never one tap.** The confirm dialog shows: **recipient count**, the **resolved ranch**, and the **exact message text**. The count doubles as a verification surface — if it reads 40 when the secretary expected 12, that number catches a resolution bug before it broadcasts.
- The **single-recipient delivery reminder does NOT need the confirm wall** — it's one person, it's their own order, it can't spam a ranch. Scope the confirm dialog as a **shared component**, applied to broadcasts only.
- New server pieces follow the RideOn stack: **controller → BL → DAL → `DBServices.cs` → PostgreSQL stored procedures only** (no inline SQL). Auth via `UserAccessValidator.EnsureUserHasRoleInRanch`. Dictionary params bound positionally — order must match each SP exactly.

---

## 9. Cross-track coordination (the "collision", explained)

It is **not a branch fight — it is a dependency.** Two facts:

1. **Both tracks edit the same worker mobile app.** This pipeline's **token registration lives in THIS branch** (confirmed by Oren — not the shavings branch). But the Shavings end-to-end track also edits the worker app (its respond/seen button). Coordinate the **worker-app startup / notification bootstrap** so both tracks aren't rewriting the same entry code — agree merge order.
2. **The delivery reminder consumes the shavings track's output.** Its **target** (`workersystemuserid`) is ours to read and already exists; its **trigger** (worker response → `responsetime`) is theirs to create and does not exist yet. Hence the contract seam (§7c): build now, wire when their button ships.

---

## 10. Mobile receiver (scoped, detail deferred to spec)

- **Token registration** in both apps: request permission, obtain Expo push token (real `projectId`), upsert to the token table on login, prune on rotation/`DeviceNotRegistered`. **This is the long pole** — looks done in the emulator, breaks on real devices for weeks (silent permission denials, stale tokens). **Front-load it.**
- Where notifications land, deep-link target, and foreground vs. background handling: **decided in the spec / later phase**, not v1-critical.

---

## 11. Parked / explicitly LATER (captured, out of v1 scope)

- **Multi-competition batched registration push** (one push covering several simultaneous competitions). Oren: "not something I want to get into right now… write it as a QA very-much-later issue." **v1 = one competition, one push.**
- **Second transport channel** (SMS / email via `person.cellphone` / `person.email`).
- **Automated triggers** (send without a human tap).
- **Multiple #46 phrasings / A-B copy** — the swappable-text design (§5) enables it; not built in v1.
- Foreground/background handling polish, deep-link routing refinements.

---

## 12. Phased build plan

| Phase | What | Risk / notes |
|---|---|---|
| **P0 — Storage & resolution (backend, safe, FIRST)** | Push-token table (**keyed personid**, mirror `passwordresettoken`); sent-notification table (audit + dedupe + throttle); resolution SPs for #46 (`roleid 2`) and #31 (`roleid 4`), both with `rolestatus='Approved'` baked in. | No user-facing risk. Unblocks everything. |
| **P1 — Token registration in BOTH mobile apps** | Permission + Expo token + upsert on login + prune. Lives in this branch. Coordinate worker-app bootstrap with the Shavings track. | **The long pole. Timeline-defining. Front-load.** |
| **P2 — Send path + Expo transport** | controller → BL → DAL → send SPs; Expo push; **manual trigger**; throttle check on send. | Transport swappable, not hardcoded. |
| **P3 — Callers #46 & #31 + confirm UX** | #46 into `RegistrationWindowPanel` (warm copy); #31 ranch bat-signal into web Shavings page; both behind the shared two-step confirm dialog. | Broadcasts only get the confirm wall. |
| **P3.5 — Delivery reminder (BLOCKED on shavings track)** | Contract method `SendDeliveryReminder(shavingsOrderId)`; target `workersystemuserid` → personid; single-recipient, no confirm wall. | Built against contract now; wired/tested when shavings respond action ships. |
| **P4+ — Later** | Automated triggers, deep-links, fg/bg polish, multi-competition batching, second channel. | See §11. |

`#31` and `#46` are the **last** buttons, not the first. The plumbing (P0–P2) is the cake; the tickets are the cherry.

---

## 13. Decisions locked (for the spec's decision log)

1. #46 recipients = **admins only** (`roleid 2`); payers untouched.
2. #31 = **ranch-wide bat-signal** (no per-order targeting at this stage).
3. Delivery reminder = **third caller, contract seam, approach (a)** — build now, shavings track calls in.
4. Transport = **Expo push** (app push popping on the phone); swappable design, single channel built.
5. Token table **keyed on `personid`**; systemuser→person bridge only at the delivery-reminder edge.
6. **Confirm-before-send** mandatory for broadcasts; single-recipient reminder exempt.
7. **Throttle/dedupe** via sent-notification table is in-scope for v1, not optional.
8. #46 copy = **warm nudge, never "lagging"**; text swappable via `notificationtype`.
9. v1 = **one competition, one push**; multi-competition batching parked as a later QA issue.
10. Push infra + token registration live in **THIS branch**, off `main`; coordinate worker-app edits with the Shavings end-to-end track.

---

## 14. Open items to confirm during spec/build (not blockers)

- Exact throttle window `N` (minutes) per notification type.
- Token table column shape (device metadata? one row per device vs. per person?).
- The precise contract method signature the shavings track will call.
- Deep-link targets per notification type (P4).
