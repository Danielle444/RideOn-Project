import { FINANCIAL_PROJECTION_COPY } from "./financialProjectionCopy";
import { formatMoneyRange, formatCountRange } from "./financialFormat";

// One income band card. A band that is available renders its range; an unavailable one renders
// its prompt (absence != zero) instead of a misleading ₪0.
function BandCard(props) {
  return (
    <div className="rounded-2xl border border-[#E3D7D0] bg-white px-6 py-5 text-right shadow-sm">
      <p className="text-sm font-bold text-[#6D4C41]">{props.title}</p>

      {props.available ? (
        <>
          <p className="mt-3 text-2xl font-black text-[#7B5A4D]">{props.value}</p>
          {props.hint ? (
            <p className="mt-2 text-xs text-[#8D6E63]">{props.hint}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-[#D9C7BD] bg-[#FBF7F4] px-4 py-3 text-sm text-[#8D6E63]">
          {props.prompt}
        </p>
      )}

      {props.footnote ? (
        <p className="mt-3 text-xs text-[#A98E80]">{props.footnote}</p>
      ) : null}
    </div>
  );
}

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

  // The stall prompt is ranch-wide when the host ranch has no pricing at all (the ranch-49
  // case: no stall price AND no shavings price), otherwise the stall-specific prompt.
  var noAnyPricing =
    stall && !stall.available && shavings && !shavings.incomeAvailable;
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
    advisories.push({
      key: "tack",
      text: copy.tackNote(stall.tackLo, stall.tackHi),
    });
  }

  if (stall && stall.atCapacity) {
    advisories.push({ key: "atCapacity", text: copy.atCapacityNote });
  }

  if (shavings && shavings.ambiguous) {
    advisories.push({ key: "ambiguous", text: copy.shavingsAmbiguousNote });
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-[#3F312B]">{copy.projectionTitle}</h3>
        <p className="mt-1 text-xs text-[#8D6E63]">{copy.projectionCaption}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BandCard
          title={copy.entryIncomeLabel}
          hint={copy.entryIncomeHint}
          available={entry.available}
          value={formatMoneyRange(entry.lo, entry.hi)}
        />

        <BandCard
          title={copy.stallIncomeLabel}
          hint={copy.stallIncomeHint}
          available={!!stall && stall.available}
          value={stall && stall.available ? formatMoneyRange(stall.lo, stall.hi) : null}
          prompt={stallPrompt}
        />

        <BandCard
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
        <BandCard
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
  );
}
