# Data Model — Notification Pipeline

Schema reference for the pipeline. **Live-verified against Supabase `sxplumrexbolpwqacpiz` on 2026-07-24.** `RideOnDB/schema.sql` is stale — this file, not that one, is the schema of record for this work. Two tables are **new** (built P0 via `apply_migration`, exact SQL confirmed with Oren before running); the rest **exist** and are reused.

## New tables (build in P0)

### Push-token table — keyed on `personid`

Holds one Expo push token per person/device plus lifecycle timestamps.

- **Key: `personid`** — deliberately **unlike** the `passwordresettoken` precedent, which keys on `systemuserid`. Mirror the precedent's *shape*, not its key.
- Stores: the Expo push token string, created/updated timestamps (for pruning stale tokens), and whatever device-scoping the final column shape settles on.
- **Upsert on re-register** (token rotation); **prune** the row when a send returns Expo `DeviceNotRegistered`.
- Open: one row per device vs. per person, and whether device metadata is stored — see SPEC Open Questions.

### Sent-notification record — audit + dedupe + throttle

One row per send. This is a **seatbelt, not bookkeeping**: without it, a jumpy secretary taps "nudge" four times and a ranch's admins get four identical, un-recallable pushes.

- Written on every send (all callers, including the delivery reminder).
- Powers the **throttle check run before send**:
  `WHERE ranchid = @ranch AND notificationtypeid = @type AND competitionid = @comp AND sentdate > now() - interval 'N minutes'` → if a row exists, suppress.
- Carries at minimum: ranch, notification type, competition (nullable for callers with no competition context), send timestamp, and resolved recipient scope for audit.

## Existing tables (reuse — do not recreate)

### `personranchrole` — recipient resolution spine

`(personid integer, ranchid integer, roleid smallint, rolestatus varchar)`. Keyed **per ranch**, not per competition — there is no worker↔competition assignment table.

- **Roles:** `1 = משלם` Payer · `2 = אדמין חווה` Ranch Admin/owner · `3 = מזכירת חווה מארחת` Secretary · `4 = עובד חווה` Field Worker.
- **Live `rolestatus` distribution: Approved 78 · Rejected 4 · Pending 4.** Every resolution SP **must** filter `rolestatus = 'Approved'`.

### `notification` / `notificationtype` — reuse for content + swappable copy

- `notification (notificationid, notificationtypeid, notificationcontent varchar, senddate timestamptz, createddatetime timestamptz, status varchar)`.
- `notificationtype (notificationtypeid, notificationtypename varchar, notificationtypedescription varchar)`.
- Copy is meant to live on `notificationtype` so wording is swappable without a code change. **Note:** live `notificationtype` has no dedicated body column — only `notificationtypename` + `notificationtypedescription`. v1 either reuses `notificationtypedescription` as the copy or adds a column (SPEC Open Question).

### `passwordresettoken` — the shape precedent (not the key precedent)

`(tokenid, systemuserid integer, tokenhash varchar, createdat timestamptz, expiresat timestamptz, isused boolean)`. Mirror its hash + timestamp + upsert/prune **shape** for the push-token table; **do not copy its `systemuserid` key** — the push-token table keys on `personid`.

### `shavingsorder` → worker, and → ranch (delivery-reminder only)

- `shavingsorder.workersystemuserid` is a **`systemuserid`** (not a personid), ~40% populated live (4 of 10 rows). It is the assigned worker for the delivery reminder.
- **Ranch of an order** is indirect: `shavingsorder → shavingsorderforstallbooking.stallbookingid → stallbooking.ranchid`.
- `shavingsorder.responsetime` / `arrivaltime` are **dead here** (0/10) and owned by the parallel Shavings end-to-end track — do not read or write them in this pipeline.

### `personmanagedbysystemuser` — the systemuser→person bridge (delivery-reminder edge only)

`(systemuserid integer, personid integer, requestdate timestamptz, updatedate timestamptz, approvalstatus varchar)`. Used **only** by `SendDeliveryReminder` to translate `workersystemuserid → personid` before token lookup. It carries `approvalstatus` — whether to filter on it is a SPEC Open Question.
