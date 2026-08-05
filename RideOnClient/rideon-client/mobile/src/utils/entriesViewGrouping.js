// Pure day-band grouping for EntriesViewModal (CAP-1). classGroups is
// expected already sorted by date/orderInDay/startTime (see
// EntriesViewModal.jsx's own `groups` useMemo) - this only folds
// CONSECUTIVE same-day entries into day bands, it never re-sorts, so the
// existing sort semantics are preserved exactly.

function getDayKey(classDate) {
  if (!classDate) {
    return "no-date";
  }

  var d = new Date(classDate);

  if (Number.isNaN(d.getTime())) {
    return "no-date";
  }

  return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
}

function groupClassesByDay(classGroups) {
  var list = Array.isArray(classGroups) ? classGroups : [];
  var result = [];
  var currentDay = null;

  list.forEach(function (classGroup) {
    var dayKey = getDayKey(classGroup.classDate);

    if (!currentDay || currentDay.dayKey !== dayKey) {
      currentDay = {
        dayKey: dayKey,
        classDate: classGroup.classDate,
        classes: [],
      };
      result.push(currentDay);
    }

    currentDay.classes.push(classGroup);
  });

  return result;
}

export { getDayKey, groupClassesByDay };
