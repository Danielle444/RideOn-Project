import { FINANCIAL_PROJECTION_COPY } from "./financialProjectionCopy";
import { formatMoney } from "./financialFormat";

// Tab 3 -- reliability scorecard. Judges the FORECAST, not the competition: an actual income
// outside the projected band means the entry forecast was biased, which is a modelling fact, not
// a marketing failure. Colors mirror PlannedVsActualPanel's forecast-reliability framing: on-target
// is green, a biased forecast (either direction) is amber -- there is no red state. Only the entry
// income band is compared (the one with both a projection and a real actual today); stall/shavings
// comparison follows once booking actuals are wired.
function verdictLabel(actual, lo, hi, copy) {
  if (actual < Math.floor(lo)) {
    return {
      text: copy.comparisonBelowBand,
      cardClass: "border-[#EFDCA8] bg-[#FDF8E8] text-[#7A6320]",
    };
  }

  if (actual > Math.ceil(hi)) {
    return {
      text: copy.comparisonAboveBand,
      cardClass: "border-[#EFDCA8] bg-[#FDF8E8] text-[#7A6320]",
    };
  }

  return {
    text: copy.comparisonWithinBand,
    cardClass: "border-[#CBE3D1] bg-[#F2FAF4] text-[#2F6B3B]",
  };
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

      <div
        className={
          "rounded-2xl border px-6 py-5 text-right shadow-sm " + verdict.cardClass
        }
      >
        <p className="text-lg font-black">{verdict.text}</p>
        <p className="mt-2 text-sm leading-relaxed">
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
