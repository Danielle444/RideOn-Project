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

// The four rows, in the same order as the projection cards. Labels/prompts are mirrored from
// financialProjectionCopy.js verbatim -- no new copy is invented here.
var COMPARISON_ROWS = [
  { key: "organizer", labelKey: "organizerIncomeLabel" },
  { key: "federation", labelKey: "federationIncomeLabel" },
  { key: "stall", labelKey: "stallIncomeLabel", promptKey: "stallPricePrompt" },
  { key: "shavings", labelKey: "shavingsIncomeLabel", promptKey: "shavingsPricePrompt" },
];

function ComparisonRow(props) {
  var copy = props.copy;
  var row = props.row;
  var data = props.data;

  if (!data || !data.available) {
    return (
      <div>
        <p className="text-sm font-bold text-[#6D4C41]">{copy[row.labelKey]}</p>
        <p className="mt-3 rounded-xl border border-dashed border-[#D9C7BD] bg-[#FBF7F4] px-4 py-3 text-sm text-[#8D6E63]">
          {row.promptKey ? copy[row.promptKey] : copy.comparisonUnavailable}
        </p>
      </div>
    );
  }

  var verdict = verdictLabel(data.actual, data.predictedLo, data.predictedHi, copy);
  var delta = computeDelta(data.actual, data.predictedLo, data.predictedHi);

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-[#6D4C41]">{copy[row.labelKey]}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryFigureCard
          title={copy.comparisonPredictedLabel}
          value={formatMoneyRange(data.predictedLo, data.predictedHi)}
        />

        <SummaryFigureCard
          title={copy.comparisonActualLabel}
          value={formatMoney(data.actual)}
          colorClass="text-[#2E7D32]"
        />

        {/* Neutral by design (locked decision) -- the verdict banner below stays the only
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
            formatMoney(data.actual),
            formatMoney(data.predictedLo),
            formatMoney(data.predictedHi),
          )}
        </p>
      </div>
    </div>
  );
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

  return (
    <SummarySectionShell title={copy.comparisonTitle}>
      <div className="space-y-6">
        {COMPARISON_ROWS.map(function (row) {
          return (
            <ComparisonRow key={row.key} copy={copy} row={row} data={actual[row.key]} />
          );
        })}
      </div>
    </SummarySectionShell>
  );
}
