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
  var endDay = end.getDate();

  var monthYear = end.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  return startDay + "-" + endDay + " " + monthYear;
}

export {
  formatCompetitionDateRange,
};