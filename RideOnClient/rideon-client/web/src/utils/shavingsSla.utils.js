// SLA delay flagging — Spec 2 (sla-rules.md, CAP-4).
//
// Two delay clocks, ONE named threshold, keyed on Spec 1's shipped fields (WorkerSystemUserId +
// the creation/seen/delivered timestamps) — NOT on the stored DeliveryStatus token. Derived at
// render time; no server flag, no new column.
import {
  getWorkerSystemUserId,
  getDelivered,
  getSeen,
  getCreated,
} from "./shavingsStatus.utils";

// The threshold appears EXACTLY ONCE (CAP-4). Badge strings template the number from it.
export const SHAVINGS_SLA_THRESHOLD_HOURS = 3;

const MS_PER_HOUR = 1000 * 60 * 60;

function hoursSince(value, now) {
  if (!value) {
    return 0;
  }

  const then = new Date(value).getTime();

  if (Number.isNaN(then)) {
    return 0;
  }

  return (now - then) / MS_PER_HOUR;
}

// Rule A — unclaimed too long: created but no worker took it within the window.
export function isUnclaimedTooLong(order, now = Date.now()) {
  return (
    !getWorkerSystemUserId(order) &&
    hoursSince(getCreated(order), now) > SHAVINGS_SLA_THRESHOLD_HOURS
  );
}

// Rule B — undelivered too long: a worker took it but has not delivered within the window.
// Legacy migrated rows can have Seen null though claimed → fall back to the creation clock.
export function isUndeliveredTooLong(order, now = Date.now()) {
  if (!getWorkerSystemUserId(order) || getDelivered(order)) {
    return false;
  }

  const seenClock = getSeen(order) || getCreated(order);

  return hoursSince(seenClock, now) > SHAVINGS_SLA_THRESHOLD_HOURS;
}

export function isDelayed(order, now = Date.now()) {
  return isUnclaimedTooLong(order, now) || isUndeliveredTooLong(order, now);
}

// Which rule tripped, for the in-row badge / needs-attention entry. Null when not delayed.
export function getDelayRule(order, now = Date.now()) {
  if (isUnclaimedTooLong(order, now)) {
    return "A";
  }

  if (isUndeliveredTooLong(order, now)) {
    return "B";
  }

  return null;
}
