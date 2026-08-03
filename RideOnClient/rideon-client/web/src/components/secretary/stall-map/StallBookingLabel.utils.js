export function getStallRanchLine(item) {
  if (!item) return "";

  return item.bookingRanchName || "חווה לא ידועה";
}

export function getStallSecondaryLine(item) {
  if (!item) return "";

  return item.isForTack ? "תא ציוד" : item.barnName || item.horseName || "";
}
