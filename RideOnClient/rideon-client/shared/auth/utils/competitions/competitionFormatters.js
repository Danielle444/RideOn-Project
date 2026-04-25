function formatCompetitionDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return "";
  }

  var start = new Date(startDate);
  var end = new Date(endDate);

  // Check if dates are valid
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  var startDay = start.getDate();
  var startMonth = start.getMonth();
  var startYear = start.getFullYear();

  var startMonth = start.getMonth();
  var startYear = start.getFullYear();

  var endDay = end.getDate();
  var endMonth = end.getMonth();
  var endYear = end.getFullYear();

  // Case 1: Different Years
  // Example: "30 בדצמבר 2025 - 2 בינואר 2026"
  if (startYear !== endYear) {
    return (
      start.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) +
      " - " +
      end.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })
    );
  }

  // Case 2: Same Year, Different Months
  // Example: "31 באוגוסט - 2 בספטמבר 2025"
  if (startMonth !== endMonth) {
    return (
      start.toLocaleDateString("he-IL", { day: "numeric", month: "long" }) +
      " - " +
      end.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })
    );
  }

  // Case 3: Same Month and Year
  // Example: "12-14 באוקטובר 2025"
  var monthYear = end.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  if (startDay === endDay) {
    return startDay + " " + monthYear;
  }

  if (startDay === endDay) {
    return startDay + " " + monthYear;
  }

  return startDay + "-" + endDay + " " + monthYear;
}

export { formatCompetitionDateRange };
export { formatCompetitionDateRange };