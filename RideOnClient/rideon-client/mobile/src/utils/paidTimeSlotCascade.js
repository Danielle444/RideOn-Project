// CAP-10: לוגיקה טהורה לבניית מדרג תאריך -> חלק יום -> מגרש מעל
// requestableSlots הקיים. מופרד מהקומפוננטה כדי שאפשר לבדוק אותו בלי
// תלות ב-react-native.

export function getUniqueOrderedValues(items, getValue) {
  var seen = {};
  var result = [];

  items.forEach(function (item) {
    var rawValue = getValue(item);
    var value =
      rawValue === null || rawValue === undefined ? "" : String(rawValue);

    if (!Object.prototype.hasOwnProperty.call(seen, value)) {
      seen[value] = true;
      result.push(value);
    }
  });

  return result;
}

export function getBucketLabel(value, fallbackLabel) {
  var trimmed = String(value || "").trim();
  return trimmed || fallbackLabel;
}
