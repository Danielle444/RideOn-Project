import { FINANCIAL_PROJECTION_COPY } from "./financialProjectionCopy";
import { formatMoneyRange, formatCountRange } from "./financialFormat";
import SummarySectionShell from "./SummarySectionShell";
import SummaryFigureCard from "./SummaryFigureCard";

function Advisory(props) {
  return (
    <li className="rounded-xl border border-[#EFE3DC] bg-[#FBF7F4] px-4 py-2 text-xs text-[#8D6E63]">
      {props.children}
    </li>
  );
}

export default function FinancialProjectionPanel(props) {
  var copy = FINANCIAL_PROJECTION_COPY;
  var projection = props.projection;

  // Loading must win over the empty state: while the projection data is still being fetched,
  // finClasses is [] and deriveFinancialProjection returns predictedClassCount === 0, which is
  // indistinguishable from a genuine no-prediction competition. Show a loading placeholder first
  // so the panel never claims "no prediction available" mid-fetch.
  if (props.loading) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D9C7BD] bg-[#FBF7F4] px-5 py-6 text-center text-sm text-[#8D6E63]">
        {copy.loading}
      </div>
    );
  }

  if (!projection || !projection.entry || projection.entry.predictedClassCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#D9C7BD] bg-[#FBF7F4] px-5 py-6 text-center text-sm text-[#8D6E63]">
        {copy.noPredictions}
      </div>
    );
  }

  var entry = projection.entry;
  var stall = projection.stall;
  var shavings = projection.shavings;

  // The stall prompt is ranch-wide when the host ranch has no pricing at all (the ranch-49 case:
  // no stall price AND no shavings price), otherwise the stall-specific prompt.
  var noAnyPricing = stall && !stall.available && shavings && !shavings.incomeAvailable;
  var stallPrompt = noAnyPricing ? copy.pricingPrompt : copy.stallPricePrompt;

  var advisories = [];

  if (entry.pricesMissingCount > 0) {
    advisories.push({
      key: "pricesMissing",
      text: copy.pricesMissingNote(entry.pricesMissingCount),
    });
  }

  if (entry.unpredictedCount > 0) {
    advisories.push({
      key: "unpredicted",
      text: copy.unpredictedNote(entry.unpredictedCount),
    });
  }

  if (stall && stall.available && (stall.tackLo > 0 || stall.tackHi > 0)) {
    advisories.push({ key: "tack", text: copy.tackNote(stall.tackLo, stall.tackHi) });
  }

  if (stall && stall.atCapacity) {
    advisories.push({ key: "atCapacity", text: copy.atCapacityNote });
  }

  if (shavings && shavings.ambiguous) {
    advisories.push({ key: "ambiguous", text: copy.shavingsAmbiguousNote });
  }

  return (
    <SummarySectionShell title={copy.projectionTitle}>
      <div className="space-y-5">
        {/* Highlighted caption band: says once, up front, that every figure below is an estimate
            shown as a range -- so no per-figure "בערך" is needed. First line is the warning
            (estimate, not actual income); second is the methodology. Reconciled onto the
            reference surface family (mirrors ImportResultBox) so it reads as one system with
            Actual instead of a foreign accent color. */}
        <div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] px-5 py-3 text-right">
          <p className="text-sm font-bold text-[#7B5A4D]">
            {copy.projectionCaptionPrimary}
          </p>
          <p className="mt-1 text-xs text-[#8D6E63]">{copy.projectionCaptionDetail}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SummaryFigureCard
            title={copy.organizerIncomeLabel}
            hint={copy.organizerIncomeHint}
            available={entry.available}
            value={formatMoneyRange(entry.organizerLo, entry.organizerHi)}
          />

          <SummaryFigureCard
            title={copy.federationIncomeLabel}
            hint={copy.federationIncomeHint}
            available={entry.available}
            value={formatMoneyRange(entry.federationLo, entry.federationHi)}
          />

          <SummaryFigureCard
            title={copy.stallIncomeLabel}
            hint={copy.stallIncomeHint}
            available={!!stall && stall.available}
            value={stall && stall.available ? formatMoneyRange(stall.lo, stall.hi) : null}
            prompt={stallPrompt}
          />

          <SummaryFigureCard
            title={copy.shavingsIncomeLabel}
            hint={copy.shavingsIncomeHint}
            available={!!shavings && shavings.incomeAvailable}
            value={
              shavings && shavings.incomeAvailable
                ? formatMoneyRange(shavings.lo, shavings.hi)
                : null
            }
            prompt={copy.shavingsPricePrompt}
          />

          {/* The bag-order quantity always shows, even without a price -- ordering does not need
              one. It is a count, not money. */}
          <SummaryFigureCard
            title={copy.bagsOrderLabel}
            hint={copy.bagsOrderHint}
            available={!!shavings && shavings.bagsAvailable}
            value={
              shavings && shavings.bagsAvailable
                ? formatCountRange(shavings.bagsLo, shavings.bagsHi)
                : null
            }
          />
        </div>

        {advisories.length > 0 ? (
          <ul className="space-y-2">
            {advisories.map(function (advisory) {
              return <Advisory key={advisory.key}>{advisory.text}</Advisory>;
            })}
          </ul>
        ) : null}
      </div>
    </SummarySectionShell>
  );
}
