// Every user-facing string for the three-view classes page, in one place.
//
// THE COPY RULE: the forecast speaks in SUGGESTIONS, the actuals speak in STATEMENTS. Same
// numbers, different verbs. "כדאי להקדים" before the competition; "היום הסתיים" after it.
// Anything added here must pick a voice -- that is why the schedule strings are keyed by
// view rather than shared.
//
// PENDING OREN'S APPROVAL. Nothing outside this file hardcodes a Hebrew literal for this
// feature, so revisions land here and nowhere else.

var CLASSES_VIEW_TABS_COPY = {
  financial: {
    label: "כספים",
    hint: "עלויות ופרסים",
  },
  planning: {
    label: "תכנון",
    hint: "תחזית לקראת התחרות",
  },
  actuals: {
    label: "בפועל",
    hint: "נתוני אמת",
    // Never "disabled" -- the tab says what it is waiting for.
    unavailableHint: "יהיה זמין עם סגירת ההרשמה",
  },
};

var SCHEDULE_COPY = {
  planning: {
    columnHeader: "לוח זמנים משוער",
    dayFinishLabel: "סיום משוער",
    noStartTime: "כדאי להזין שעת התחלה למקצה הראשון כדי לקבל לוח זמנים",
    assumedOrigin: function (startTime) {
      return (
        "לוח הזמנים מבוסס על שעת התחלה משוערת של " +
        startTime +
        ". כדאי להזין שעת התחלה למקצה הראשון כדי לקבל לוח זמנים מדויק."
      );
    },
    applySetLabel: function (startTime) {
      return "הכנס את שעת ההתחלה " + startTime;
    },
    lateFinishYellow: "שעת הסיום המשוערת גבולית. כדאי לעקוב אחרי התקדמות היום.",
    lateFinishHigh: "שעת הסיום המשוערת מאוחרת מאוד.",
    applyAdvanceLabel: function (startTime) {
      return "הקדם את שעת ההתחלה ל-" + startTime;
    },
    insufficient:
      "הקדמת שעת ההתחלה לבדה לא תספיק. כדאי לשקול לפצל את היום או להעביר מקצים ליום אחר.",
  },

  actuals: {
    columnHeader: "לוח זמנים בפועל",
    dayFinishLabel: "סיום",
    noStartTime: "למקצה הראשון לא הוזנה שעת התחלה, ולכן אין לוח זמנים ליום זה.",
    assumedOrigin: function (startTime) {
      return (
        "למקצה הראשון לא הוזנה שעת התחלה. לוח הזמנים מחושב לפי שעת התחלה משוערת של " +
        startTime +
        "."
      );
    },
    applySetLabel: function (startTime) {
      return "קבע את שעת ההתחלה " + startTime;
    },
    lateFinishYellow: "היום מסתיים בשעה גבולית.",
    lateFinishHigh: "היום מסתיים מאוחר מאוד.",
    applyAdvanceLabel: function (startTime) {
      return "הקדם את שעת ההתחלה ל-" + startTime;
    },
    insufficient: "הקדמת שעת ההתחלה לבדה אינה פותרת את אורך היום.",
  },
};

var PLANNED_VS_ACTUAL_COPY = {
  columnHeader: "תחזית מול בפועל",
  panelTitle: "השוואת תחזית לתוצאה בפועל",

  withinBand: "בתוך טווח התחזית",
  belowBand: "מתחת לטווח התחזית",
  aboveBand: "מעל טווח התחזית",

  // The verdicts are about the FORECAST, not about the competition. That distinction is the
  // reason this panel exists: a shortfall that is really a modelling error must not read as
  // a marketing failure.
  verdicts: {
    noData: {
      title: "אין תחזית להשוואה",
      detail: "למקצים של תחרות זו לא נשמרה תחזית כניסות, ולכן אין מה להשוות.",
    },
    onTarget: {
      title: "התחזית התאמתה",
      detail: "כל המקצים שנבדקו נכנסו לטווח התחזית.",
    },
    mixed: {
      title: "התחזית הייתה לא מדויקת",
      detail:
        "יש פערים בין התחזית לבין התוצאה בפועל, אך הם אינם באותו כיוון. הפערים נובעים ממקצים מסוימים ולא מהטיה של התחזית.",
    },
    forecastHigh: {
      title: "התחזית הייתה גבוהה מדי",
      detail:
        "רוב המקצים סיימו מתחת לטווח התחזית. הפער נובע מהתחזית עצמה ולא בהכרח מהיקף ההרשמה לתחרות.",
    },
    forecastLow: {
      title: "התחזית הייתה נמוכה מדי",
      detail:
        "רוב המקצים סיימו מעל טווח התחזית. התחזית הייתה שמרנית מדי עבור תחרות זו.",
    },
  },

  summaryLine: function (summary) {
    return (
      "נבדקו " +
      summary.comparedClasses +
      " מקצים · " +
      summary.withinBandCount +
      " בטווח · " +
      summary.belowBandCount +
      " מתחת · " +
      summary.aboveBandCount +
      " מעל"
    );
  },

  totalsLine: function (summary) {
    return (
      "סה״כ כניסות בפועל " +
      summary.totalActual +
      " מול תחזית של " +
      Math.round(summary.totalPredicted)
    );
  },
};

export { CLASSES_VIEW_TABS_COPY, SCHEDULE_COPY, PLANNED_VS_ACTUAL_COPY };
