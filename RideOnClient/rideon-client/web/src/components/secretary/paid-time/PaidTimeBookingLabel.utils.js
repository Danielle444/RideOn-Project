export function getPaidTimeIdentityLines(item) {
  if (!item) return ["", "", ""];

  var horseName =
    item.barnName || item.BarnName || item.horseName || item.HorseName || "";
  var riderName = item.riderName || item.RiderName || "";
  var coachName = item.coachName || item.CoachName;
  var productName = item.productName || item.ProductName;

  return [
    horseName,
    riderName + " " + (productName ? "• " + productName : ""),
    "מאמן/ת: " + (coachName || "לא צוין"),
  ];
}
