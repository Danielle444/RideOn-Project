# Callers — Notification Pipeline

Three callers hang off the shared pipeline. Each supplies a **recipient rule**, **copy**, and a **trigger surface**; the pipeline supplies resolution, transport, throttle, audit, and (for broadcasts) the confirm gate. All resolution filters `rolestatus = 'Approved'`. See [data-model.md](data-model.md) for the tables.

| Caller | Recipients | Resolution rule | Confirm gate | Trigger surface | Multiplicity |
|---|---|---|---|---|---|
| **#46 — registration nudge** (CAP-6) | Ranch **admins only** | `roleid = 2` AND `ranchid = @ranch` AND `rolestatus='Approved'`. **Payers (`roleid 1`) explicitly NOT notified.** | **Yes** (two-step) | `RegistrationWindowPanel` (web) | Broadcast |
| **#31 — pending-orders bat-signal** (CAP-7) | All ranch **field workers** | `roleid = 4` AND `ranchid = @ranch` AND `rolestatus='Approved'`. Ranch-wide; no per-order targeting. | **Yes** (two-step) | Web Shavings page | Broadcast |
| **Delivery reminder** (CAP-8, contract seam) | The **single assigned worker** | Read `shavingsorder.workersystemuserid`; bridge `systemuserid → personid` via `personmanagedbysystemuser`; resolve that person's token. | **No** (single recipient, own order, can't spam) | `SendDeliveryReminder(shavingsOrderId)` — called by the Shavings track | Targeted (one person) |

## #46 — copy & tone (hard requirement)

**Nudge, never scold.** The *trigger* (why the secretary sends: registration is behind) stays **internal / secretary-facing**. The *message* (what the admin's phone shows) is **warm and inviting** — admins are busy paying customers.

- ✅ *"Registration for [competition] is open — a great time to get your riders signed up 🐴"*
- ❌ Anything with "lagging," "behind," "you haven't," or any implication the admin is failing at their job.
- **v1 = one competition, one push.** Multi-competition batching is a Non-goal (parked).

## #31 — copy

A **bat-signal**, not a task assignment (there is no worker↔order link at this stage):

- *"Your ranch has pending shaving orders — please take a look."*

## Delivery reminder — copy & dependency

Targeted and personal:

- *"You have a shaving order to deliver — tap to mark it delivered."*

**Dependency:** the *trigger* is owned by the Shavings end-to-end track — it fires when the worker taps that track's new respond/seen action (which populates `shavingsorder.responsetime`). This pipeline exposes **one method**, `SendDeliveryReminder(shavingsOrderId)`; the Shavings track needs to know nothing about Expo or tokens. The seam is built in v1 but **end-to-end is blocked** until the Shavings respond action ships — see [build-phases.md](build-phases.md).
