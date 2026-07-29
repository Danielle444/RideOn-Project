# Build Phases & Cross-Track Coordination

Sequencing is load-bearing: **the plumbing is first, the tracker buttons (#31/#46) are last.** Build order below; capability IDs reference [SPEC.md](SPEC.md).

| Phase | What | Capabilities | Risk / notes |
|---|---|---|---|
| **P0 — Storage & resolution** (backend, safe, FIRST) | Push-token table (keyed `personid`, mirror `passwordresettoken` shape); sent-notification table (audit + dedupe + throttle); resolution SPs for #46 (`roleid 2`) and #31 (`roleid 4`), both with `rolestatus='Approved'` baked in. | CAP-2, CAP-4 | No user-facing risk. Unblocks everything. |
| **P1 — Token registration in BOTH mobile apps** | Permission → Expo token (real `projectId`) → upsert on login → prune on rotation / `DeviceNotRegistered`. Lives in **this** branch. | CAP-1 | **The long pole. Timeline-defining. Front-load.** Looks done in the emulator, breaks on real devices for weeks (silent permission denials, stale tokens). |
| **P2 — Send path + Expo transport** | `controller → BL → DAL → DBServices.cs → send SPs`; Expo push; **manual trigger**; throttle check on send. | CAP-3, CAP-4 | Transport swappable, **not** hardcoded to Expo. |
| **P3 — Callers #46 & #31 + confirm UX** | #46 into `RegistrationWindowPanel` (warm copy); #31 ranch bat-signal into web Shavings page; both behind the shared two-step confirm dialog. | CAP-5, CAP-6, CAP-7 | Broadcasts only get the confirm wall. |
| **P3.5 — Delivery reminder** (BLOCKED on Shavings track) | Contract method `SendDeliveryReminder(shavingsOrderId)`; target `workersystemuserid → personid`; single-recipient, no confirm wall. | CAP-8 | Seam built against contract now; wired/tested when the Shavings respond action ships. |
| **P4+ — Later** | Automated triggers, deep-links, fg/bg polish, multi-competition batching, second channel. | — | All Non-goals in [SPEC.md](SPEC.md). |

## Cross-track coordination (a dependency, not a branch fight)

Two facts govern the relationship with the parallel **Shavings end-to-end** track:

1. **Both tracks edit the same worker mobile app.** This pipeline's **token registration lives in THIS branch** (confirmed by Oren — not the shavings branch). But the Shavings track also edits the worker app (its respond/seen button). Coordinate the **worker-app startup / notification bootstrap** so both tracks aren't rewriting the same entry code — **agree merge order**.
2. **The delivery reminder consumes the Shavings track's output.** Its **target** (`shavingsorder.workersystemuserid`) is ours to read and already exists; its **trigger** (worker response → `responsetime`) is theirs to create and does not exist yet. Hence the contract seam (P3.5): build now, wire when their button ships.
