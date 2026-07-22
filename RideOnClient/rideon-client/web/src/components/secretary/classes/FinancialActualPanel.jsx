import { FINANCIAL_PROJECTION_COPY } from "./classesViewCopy";
import { formatMoney } from "./financialFormat";

// Tab 2 -- the actual running total. Entry income is real: sum of ACTIVE entries x class cost.
// Stall/shavings actuals come from real bookings and are not wired yet, so they are stated as
// pending rather than faked with a projection number.
export default function FinancialActualPanel(props) {
  var copy = FINANCIAL_PROJECTION_COPY;
  var actual = props.actual;

  if (!actual || !actual.hasActualData) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D9C7BD] bg-[#FBF7F4] px-5 py-6 text-center text-sm text-[#8D6E63]">
        {copy.actualUnavailable}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#3F312B]">{copy.actualTitle}</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#E3D7D0] bg-white px-6 py-5 text-right shadow-sm">
          <p className="text-sm font-bold text-[#6D4C41]">
            {copy.actualEntryIncomeLabel}
          </p>
          <p className="mt-3 text-2xl font-black text-[#2E7D32]">
            {formatMoney(actual.entryIncomeActual)}
          </p>
          <p className="mt-2 text-xs text-[#8D6E63]">{copy.actualEntryIncomeHint}</p>
        </div>
      </div>

      <p className="rounded-xl border border-[#EFE3DC] bg-[#FBF7F4] px-4 py-2 text-xs text-[#8D6E63]">
        {copy.actualBookingsPending}
      </p>
    </div>
  );
}
