import { FINANCIAL_PROJECTION_COPY } from "./financialProjectionCopy";
import { formatMoney } from "./financialFormat";

// Tab 3 -- reliability scorecard. Judges the FORECAST, not the competition: an actual income
// below the projected band means the entry forecast ran high, which is a modelling fact, not a
// marketing failure. Only the entry income band is compared (the one with both a projection and
// a real actual today); stall/shavings comparison follows once booking actuals are wired.
function verdictLabel(actual, lo, hi, copy) {
  if (actual < Math.floor(lo)) {
    return { text: copy.comparisonBelowBand, color: "text-[#C62828]" };
  }

  if (actual > Math.ceil(hi)) {
    return { text: copy.comparisonAboveBand, color: "text-[#2E7D32]" };
  }

  return { text: copy.comparisonWithinBand, color: "text-[#6D4C41]" };
}

export default function FinancialComparisonPanel(props) {
  var copy = FINANCIAL_PROJECTION_COPY;
  var actual = props.actual;

  if (!actual || !actual.hasActualData) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D9C7BD] bg-[#FBF7F4] px-5 py-6 text-center text-sm text-[#8D6E63]">
        {copy.comparisonUnavailable}
      </div>
    );
  }

  var verdict = verdictLabel(
    actual.entryIncomeActual,
    actual.entryIncomePredictedLo,
    actual.entryIncomePredictedHi,
    copy,
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-[#3F312B]">{copy.comparisonTitle}</h3>

      <div className="rounded-2xl border border-[#E3D7D0] bg-white px-6 py-5 text-right shadow-sm">
        <p className={"text-lg font-black " + verdict.color}>{verdict.text}</p>
        <p className="mt-2 text-sm text-[#6D4C41]">
          {copy.comparisonLine(
            formatMoney(actual.entryIncomeActual),
            formatMoney(actual.entryIncomePredictedLo),
            formatMoney(actual.entryIncomePredictedHi),
          )}
        </p>
      </div>
    </div>
  );
}
