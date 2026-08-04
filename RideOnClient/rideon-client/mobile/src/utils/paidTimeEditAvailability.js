// Pure predicate for whether the Paid Time Edit action (financial /
// requested-slot changes, via PaidTimeEditModal) may be offered for a given
// payer-account paid-time row.
//
// Deliberately narrow: this governs ONLY the Edit action. It must never be
// reused to decide whether Cancel is available - cancellation is a separate,
// always-available business path (the server never blocks it after
// competition end), and item paid/cancelled locking already governs it
// independently at the call site.
export function canEditPaidTimeRow(item, paidTimesAvailability) {
  var status = String(item?.status || "").toLowerCase();

  return (
    item?.isPaid !== true &&
    status !== "cancelled" &&
    !!paidTimesAvailability?.isEnabled
  );
}
