# מעקב שינויים (Change Tracking) — Deferred Follow-ups

Captured 2026-07-27. These are **explicitly out of scope for the pre-submission push** (committee demo, ~2 weeks out). Filed, not built.

## Context / root cause
A payer can submit a change or cancellation request for an item they have **already paid for**. Both answer stored procedures (`usp_answerproductchangerequest`, `usp_answerchangeentryrequest`) `RAISE` on a `Paid` billcharge — `P0001: Cannot answer change request for a paid ... request` — and the guard sits **above** the approve/reject split, so it blocks *both* actions. Result: a paid change/cancel request becomes an un-clearable "zombie" in the secretary's Pending tab, throwing a 400 on every click.

The pre-submission fix only **hides these Pending rows** in the secretary view (list proc filter) and moves the paid-guard nowhere — it stays as a backstop. The real fixes are below.

## Follow-up 1 — Block at creation (mobile app)
A payer must not be able to *create* a change/cancellation request for a product/entry that is already paid. Block it in the **mobile app** at the source (payer flow), so the request never exists. This is the correct home for the rule; hiding in the secretary view is only a stopgap.

- Where: mobile payer change/cancel flow (RideOnClient/rideon-client/mobile).
- Backend: the `usp_createstallchangerequestbypayer` / entry-change-request creation procs and their callers should reject when a `Paid` billcharge exists for the source.

## Follow-up 2 — Secretary handling of paid edge cases (if any reach her)
If, despite Follow-up 1, a paid change/cancel request ever reaches a secretary, design how she handles it — e.g. an explicit "already paid — requires refund" state and/or a refund/credit path. **No refund engine exists today.** Only design/build this if it comes back as a real reported need; not now.

## Optional cleanup (noted, low priority)
- The change-tracking hook + table + modal carry dead defensive dual-casing (`camelKey` **or** `pascalKey`) even though the API returns consistent PascalCase (`"RequestId"`, etc.). Safe to delete the camelCase half.
- `buildChangedFields` is duplicated in `ChangeRequestsTable.jsx` and `ChangeRequestDetailsModal.jsx` — extract to a shared util.
