// Derived shavings status — Spec 2 (read-model.md).
//
// CRITICAL: status is DERIVED, never the stored token. Spec 1 stores
// `deliverystatus ∈ {Pending, Delivered}` only; a claimed-but-undelivered order is stored
// "Pending" yet must display "Seen". Compute the display/group state from the underlying
// lifecycle fields — never group or label on the stored DeliveryStatus token.

// Casing-tolerant reader (mirrors the summary components' getValue): the API may serialize
// PascalCase or camelCase depending on the path.
export function getValue(item, camelKey, pascalKey, fallback) {
  if (!item) {
    return fallback;
  }

  if (item[camelKey] !== null && item[camelKey] !== undefined) {
    return item[camelKey];
  }

  if (item[pascalKey] !== null && item[pascalKey] !== undefined) {
    return item[pascalKey];
  }

  return fallback;
}

// R2 (#176) field accessors — the SLA/status rules key on these, not on DeliveryStatus.
export function getWorkerSystemUserId(order) {
  return getValue(order, "workerSystemUserId", "WorkerSystemUserId", null);
}

export function getDelivered(order) {
  return getValue(order, "delivered", "Delivered", null);
}

export function getSeen(order) {
  return getValue(order, "seen", "Seen", null);
}

export function getCreated(order) {
  return getValue(order, "prequestDatetime", "PrequestDatetime", null);
}

export function getDeliveryPhotoUrl(order) {
  return getValue(order, "deliveryPhotoUrl", "DeliveryPhotoUrl", null);
}

// The fixed pipeline order the status grouping and chips use.
export const SHAVINGS_STATUS_ORDER = ["Pending", "Seen", "Delivered"];

// Delivered if Delivered(=arrivaltime) set; else Seen if a worker claimed it; else Pending.
export function deriveShavingsStatus(order) {
  if (getDelivered(order)) {
    return "Delivered";
  }

  if (getWorkerSystemUserId(order)) {
    return "Seen";
  }

  return "Pending";
}

// "Delivered without photo" (DEP-1): delivered but no delivery photo recorded. Only meaningful
// once #176 exposes DeliveryPhotoUrl; before that the field is absent and this stays false-y
// for the marker only when explicitly delivered — callers gate the marker on Delivered anyway.
export function isUnverifiedDelivery(order) {
  return !!getDelivered(order) && !getDeliveryPhotoUrl(order);
}
