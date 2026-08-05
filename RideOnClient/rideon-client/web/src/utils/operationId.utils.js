// Client-generated operation-id lifecycle for idempotent Federation
// allocation submissions (bulk apply, matching-suggestion approve). Pure,
// framework-agnostic - callers hold the "pending" value in a React ref
// (useRef, not useState - minting/reusing an id must never itself trigger a
// re-render) and pass it in on every submit attempt.
//
// Semantics (must match the server's payload-identity contract exactly - see
// the design report / CompetitionPaymentDAL RN001 handling):
// - First submit of a given payload mints a fresh id.
// - Retrying the SAME still-pending/failed payload (identical signature)
//   reuses the same id, so the server treats it as a retry, not a new
//   operation.
// - Any change to the payload (different signature) mints a fresh id - the
//   server would otherwise reject a same-id/different-payload resubmit with
//   RN001, so callers must never accidentally reuse an id across a changed
//   selection.
// - Callers clear the pending value (pass null back in) on success, on
//   explicit cancel/dismiss, and are never expected to reuse an id past
//   those points - createOperationId() will simply mint the next one.

function createOperationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // No existing UUID dependency exists in this project, and no realistic
  // target browser for this secretary-facing admin tool lacks
  // crypto.randomUUID (Chrome/Edge 92+, Firefox 95+, Safari 15.4+, all
  // 2021-2022; requires a secure context, satisfied by production https and
  // by localhost during development). This is intentionally a loud failure,
  // not a fallback to a weaker random generator - see the design report.
  throw new Error(
    "crypto.randomUUID is not available in this browser - cannot mint an operation id",
  );
}

// pending: { operationId, signature } | null
// signature: any JSON-stringifiable, order-normalized representation of the
// exact payload fields the server's fingerprint also covers.
// Returns { operationId, pending } - callers must store the returned
// `pending` back into their ref for the next call.
function resolveOperationId(pending, signature) {
  if (pending && pending.signature === signature) {
    return { operationId: pending.operationId, pending: pending };
  }

  var operationId = createOperationId();

  return { operationId: operationId, pending: { operationId: operationId, signature: signature } };
}

export { createOperationId, resolveOperationId };
