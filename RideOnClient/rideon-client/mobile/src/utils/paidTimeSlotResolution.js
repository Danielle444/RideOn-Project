// לוגיקה טהורה של שני האפקטים הדו-כיווניים ב-CompetitionPaidTimeFormCard
// (מדרג תאריך/חלק-יום/מגרש <-> הסלוט שנבחר בפועל). מופרד מהקומפוננטה כדי
// שאפשר לבדוק אותו בלי תלות ב-react-native, באותו דפוס כמו
// paidTimeSlotCascade.js ליד הקובץ הזה.

// גזירת שלבי המדרג מהסלוט שנבחר בפועל ("סלוט -> מדרג").
export function computeCascadeFromSlot(selectedSlot) {
  return {
    cascadeDate: selectedSlot ? selectedSlot.slotDate || null : null,
    cascadeTimeOfDay: selectedSlot ? selectedSlot.timeOfDay || null : null,
    cascadeArenaName:
      selectedSlot && selectedSlot.arenaName !== undefined
        ? selectedSlot.arenaName
        : null,
  };
}

// ההחלטה הטהורה של אפקט הרזולוציה האוטומטית ("מדרג -> סלוט").
//
// action אפשריים:
// - "observeExternalChange": הסלוט הנצפה מבחוץ השתנה מאז הריצה הקודמת
//   (hydration של עריכה, או בחירה ישירה בדרופדאון "שעת התחלה מדויקת") -
//   עוצרים לרינדור אחד כדי לתת לאפקט "סלוט -> מדרג" לסנכרן את המדרג קודם.
//   בלי העצירה הזו, הסלוט שזה עתה הוזן מבחוץ נבדק מול מדרג ישן (עדיין ריק)
//   ומתאפס בטעות - זו לולאת ה-hydration שהתגלתה ב-2026-08-08.
// - "wait": המדרג עדיין לא חד-משמעי (needsFinalDisambiguation).
// - "settled": הסלוט הנוכחי כבר תואם את מה שהמדרג פותר אליו - שום דבר
//   לכתוב.
// - "declineResurrection": הגנת a817ff6 - הסלוט אופס מבחוץ (איפוס אחרי
//   שליחה) והמדרג עדיין תקוע על הערך הישן; לא מחייים אותו.
// - "resolve": יש לקרוא ל-setSelectedRequestedSlot(resolvedSlot).
export function computeAutoResolveSlotAction(input) {
  var currentSlotId = input.currentSlotId;

  if (currentSlotId !== input.observedExternalSlotId) {
    return {
      action: "observeExternalChange",
      nextObservedExternalSlotId: currentSlotId,
      nextLastAutoResolvedSlotId: currentSlotId,
    };
  }

  if (input.needsFinalDisambiguation) {
    return { action: "wait" };
  }

  var resolvedSlot =
    input.slotsForFullSelection.length === 1
      ? input.slotsForFullSelection[0]
      : null;
  var resolvedSlotId = resolvedSlot ? resolvedSlot.paidTimeSlotInCompId : null;

  if (currentSlotId === resolvedSlotId) {
    return { action: "settled", nextLastAutoResolvedSlotId: resolvedSlotId };
  }

  if (
    currentSlotId === null &&
    resolvedSlotId !== null &&
    resolvedSlotId === input.lastAutoResolvedSlotId
  ) {
    return { action: "declineResurrection" };
  }

  return {
    action: "resolve",
    resolvedSlot: resolvedSlot,
    nextLastAutoResolvedSlotId: resolvedSlotId,
  };
}
