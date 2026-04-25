function formatCompetitionDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return "";
  }

  var start = new Date(startDate);
  var end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "";
  }

  var startDay = start.getDate();
  var startMonth = start.getMonth();
  var startYear = start.getFullYear();

  var endDay = end.getDate();
  var endMonth = end.getMonth();
  var endYear = end.getFullYear();

  if (startYear !== endYear) {
    return (
      start.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) +
      " - " +
      end.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })
    );
  }

  if (startMonth !== endMonth) {
    return (
      start.toLocaleDateString("he-IL", { day: "numeric", month: "long" }) +
      " - " +
      end.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })
    );
  }

  var monthYear = end.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  if (startDay === endDay) {
    return startDay + " " + monthYear;
  }

  return startDay + "-" + endDay + " " + monthYear;
}

export { formatCompetitionDateRange };
