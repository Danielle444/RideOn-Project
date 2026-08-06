// Standalone shavings cancellation badge — renders alongside (never instead
// of) ShavingsStatusChip: cancellation state is an orthogonal axis from the
// delivery-lifecycle status that chip already shows. Renders nothing for a
// normal, non-cancelled order.
import {
  getIsCancelled,
  getHasPendingCancellation,
} from "../../../utils/shavingsStatus.utils";

export default function ShavingsCancellationBadge(props) {
  const order = props.order;

  if (getIsCancelled(order)) {
    return (
      <span className="mt-1 inline-block rounded-full bg-[#F3E1DE] px-3 py-1 text-xs font-bold text-[#B23B2E]">
        בוטל
      </span>
    );
  }

  if (getHasPendingCancellation(order)) {
    return (
      <span className="mt-1 inline-block rounded-full bg-[#FDF2E3] px-3 py-1 text-xs font-bold text-[#B26A00]">
        ממתין לביטול
      </span>
    );
  }

  return null;
}
