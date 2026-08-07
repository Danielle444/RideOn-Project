// CAP-6: pure server-total resolution for the saved horse-stall overview,
// kept framework-free (no react-native/service imports) so it's testable
// with plain vitest - mirrors tackPayerLock.js's pattern of a small
// dedicated utils file backing one specific hook.

// Reads the server's stall-charge total off a raw booking row, trying every
// casing this API has been seen to use. Returns null when the field is
// truly absent (undefined/null) so callers can tell "no server total" apart
// from "server total is legitimately 0" - a plain `||` fallback would
// collapse both to the same value.
function extractServerStallTotal(item) {
  if (!item) {
    return null;
  }

  var raw = item.totalAmount ?? item.TotalAmount ?? item.totalamount;

  if (raw === null || raw === undefined) {
    return null;
  }

  var numeric = Number(raw);

  return Number.isNaN(numeric) ? 0 : numeric;
}

// Prefers the server-computed stall total (even when it is exactly 0) and
// only falls back to the client-side numberOfDays × per-day-price
// recomputation when the server did not provide one at all.
function resolveStallAmount(params) {
  var serverStallAmount = params && params.serverStallAmount;
  var numberOfDays = Number((params && params.numberOfDays) || 0);
  var effectivePerDayPrice = Number((params && params.effectivePerDayPrice) || 0);

  if (serverStallAmount !== null && serverStallAmount !== undefined) {
    return serverStallAmount;
  }

  return (numberOfDays || 1) * effectivePerDayPrice;
}

export { extractServerStallTotal, resolveStallAmount };
