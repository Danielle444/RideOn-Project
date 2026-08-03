import { FINANCIAL_PROJECTION_COPY } from "./financialProjectionCopy";
import { formatMoney, formatMoneyRange } from "./financialFormat";
import SummarySectionShell from "./SummarySectionShell";
import SummaryFigureCard from "./SummaryFigureCard";

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

// Signed gap to the nearest predicted-band edge, using the same floor/ceil tolerance as
// verdictLabel so the delta card and the verdict card never disagree about which side of the
// band actual sits on: within the band -> 0; above the upper bound -> actual - upper bound;
// below the lower bound -> actual - lower bound.
function computeDelta(actual, lo, hi) {
  if (actual < Math.floor(lo)) {
    return actual - lo;
  }

  if (actual > Math.ceil(hi)) {
    return actual - hi;
  }

  return 0;
}

function formatSignedDelta(value) {
  var rounded = Math.round(Number(value) || 0);

  if (rounded > 0) {
    return "+" + formatMoney(rounded);
  }

  if (rounded < 0) {
    return "−" + formatMoney(Math.abs(rounded));
  }

  return formatMoney(0);
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

  var delta = computeDelta(
    actual.entryIncomeActual,
    actual.entryIncomePredictedLo,
    actual.entryIncomePredictedHi,
  );

  return (
    <SummarySectionShell title={copy.comparisonTitle}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryFigureCard
            title={copy.comparisonPredictedLabel}
            value={formatMoneyRange(
              actual.entryIncomePredictedLo,
              actual.entryIncomePredictedHi,
            )}
          />

          <SummaryFigureCard
            title={copy.comparisonActualLabel}
            value={formatMoney(actual.entryIncomeActual)}
            colorClass="text-[#2E7D32]"
          />

          {/* Neutral by design (locked decision) -- the verdict card below stays the only
              green/amber semantic indicator; the delta card is a plain figure, not a second
              verdict. */}
          <SummaryFigureCard
            title={copy.comparisonDeltaLabel}
            value={formatSignedDelta(delta)}
          />
        </div>

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
    </SummarySectionShell>
  );
}
