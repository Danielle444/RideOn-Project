// Display formatting for the financial projection. Every money figure is a projection RANGE,
// rendered "בערך, בין X ל-Y"; a zero-width band (a single active price, exact math) collapses
// to one approximate value. Rounding to whole shekels is deliberate -- false precision on a
// forecast reads as certainty it does not have.
import { FINANCIAL_PROJECTION_COPY } from "./classesViewCopy";

function roundWhole(value) {
  return Math.round(Number(value) || 0);
}

function formatMoney(value) {
  return "₪" + roundWhole(value).toLocaleString("he-IL");
}

function formatCount(value) {
  return roundWhole(value).toLocaleString("he-IL");
}

// "בערך, בין X ל-Y", or a single approximate value when the band has no width.
function formatRange(lo, hi, formatValue) {
  var copy = FINANCIAL_PROJECTION_COPY;
  var low = roundWhole(lo);
  var high = roundWhole(hi);

  if (low === high) {
    return copy.approxPrefix + formatValue(low);
  }

  return (
    copy.approxPrefix + copy.rangeBetween + formatValue(low) + copy.rangeTo + formatValue(high)
  );
}

function formatMoneyRange(lo, hi) {
  return formatRange(lo, hi, formatMoney);
}

function formatCountRange(lo, hi) {
  return formatRange(lo, hi, formatCount);
}

export { formatMoney, formatCount, formatMoneyRange, formatCountRange };
