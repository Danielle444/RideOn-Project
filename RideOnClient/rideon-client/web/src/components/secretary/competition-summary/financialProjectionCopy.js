// Phase 8 financial layer -- every user-facing string for the three financial tabs on the
// competition-summary page, in one place. The tabs are: a read-time income projection (תחזית),
// the actual running total (בפועל), and a reliability scorecard (תחזית מול בפועל). The tab
// FORMAT is borrowed from the classes-page view tabs (SecretaryClassesViewTabs), but the tabs
// live here, on the summary page, where the money already lives.
//
// Every figure is a labelled PROJECTION and a RANGE -- never a point dressed as an accounting
// total. Each of the three income bands (entry / stall / shavings) states its own assumption and
// shows its own width; a tight entry band beside a wide stall band is the honesty, not a defect.
//
// ABSENCE != ZERO: when a ranch has no active stall/shavings price, the band shows a prompt to
// set prices -- NEVER a silent 0. Ranch 49 (Green Fields) is the live precedent.
//
// ALL STRINGS PENDING OREN'S APPROVAL.
var FINANCIAL_PROJECTION_COPY = {
  // The three sub-tabs. Tabs 2/3 are grayed WITH A STATED REASON before they apply -- never
  // hidden, never a bare "disabled".
  tabs: {
    projection: {
      label: "תחזית",
      hint: "הכנסות ותאים לפני ההרשמה",
    },
    actual: {
      label: "בפועל",
      hint: "הכנסות מתוך הרשמות אמת",
      unavailableHint: "יהיה זמין עם סגירת ההרשמה",
    },
    comparison: {
      label: "תחזית מול בפועל",
      hint: "עד כמה התחזית דייקה",
      unavailableHint: "יהיה זמין כשיצטברו נתוני אמת",
    },
  },

  projectionTitle: "תחזית הכנסות",
  // Shown in a highlighted band under the enlarged title, two lines: first the warning (this is
  // an estimate, not actual income), then the methodology (range = one standard deviation, gross
  // income). This caption is why no per-figure "בערך" prefix is needed -- it says once, up front,
  // that every number below is an estimate.
  projectionCaptionPrimary:
    "המספרים המוצגים מהווים תחזית משוערת בלבד, אין להתייחס אליהם כהכנסות בפועל.",
  projectionCaptionDetail:
    "כל המספרים מבוססים על חיזוי הכניסות, ומוצגים כטווח על מנת לקחת בחשבון סטיית תקן אחת. ההכנסה ברוטו, ללא ניכוי פרסים.",

  // Entry income is split into its two streams. Phrased as "<party>'s income FROM classes"
  // (הכנסת X ממקצים) -- NOT "income from <party>", which would wrongly read as the party paying.
  organizerIncomeLabel: "הכנסת המארגן ממקצים",
  organizerIncomeHint: "כניסות צפויות × עלות המארגן",
  federationIncomeLabel: "הכנסת ההתאחדות ממקצים",
  federationIncomeHint: "כניסות צפויות × עלות ההתאחדות",
  stallIncomeLabel: "הכנסה מתאים",
  stallIncomeHint: "לפי מספר הסוסים הצפוי, במחיר תא ממוצע",
  shavingsIncomeLabel: "הכנסה מנסורת",
  shavingsIncomeHint: "לפי מספר התאים הצפוי, במחיר נסורת ממוצע",
  bagsOrderLabel: "שקי נסורת להזמנה",
  bagsOrderHint: "כמות מוערכת להזמנה מראש",

  // Range template: "בין X ל-Y". A zero-width band renders as a single value (no prefix).
  rangeBetween: "בין ",
  rangeTo: " ל-",

  // Absence -> prompt. `pricingPrompt` covers a ranch with no pricing at all (ranch 49); the
  // per-band prompts cover the independent-degrade case (one priced, the other not).
  pricingPrompt:
    "מחירון לא הוגדר עבור החווה — עדכנו מחירי תאים ונסורת כדי לקבל תחזית",
  stallPricePrompt:
    "מחיר תאים לא הוגדר עבור החווה — עדכנו את המחירון כדי לקבל תחזית הכנסה מתאים",
  shavingsPricePrompt:
    "מחיר נסורת לא הוגדר עבור החווה — עדכנו את המחירון כדי לקבל תחזית הכנסה מנסורת",

  // More than one active shavings product -> flagged as a data issue. The income now uses the
  // AVERAGE of the active prices rather than widening the range.
  shavingsAmbiguousNote:
    "קיימים כמה מוצרי נסורת פעילים; התחזית משתמשת במחיר הממוצע שלהם. כדאי לבחור מוצר נסורת אחד לתחרות.",

  // Tack is its own low-confidence line -- surfaced, never folded silently into the stall number.
  tackNote: function (tackLo, tackHi) {
    var count = tackLo === tackHi ? String(tackLo) : tackLo + " עד " + tackHi;

    return (
      "כולל כ-" + count + " תאי ציוד (הערכה בביטחון נמוך: תא ציוד לכל 4–5 סוסים)"
    );
  },

  atCapacityNote:
    "מספר הסוסים הצפוי מגיע לתקרת התאים בחווה. התחזית נחתכה לפי מלאי התאים הקיים.",

  pricesMissingNote: function (count) {
    return count === 1
      ? "מקצה אחד ללא עלות מוגדרת אינו נכלל בתחזית ההכנסה ממקצים."
      : count + " מקצים ללא עלות מוגדרת אינם נכללים בתחזית ההכנסה ממקצים.";
  },

  unpredictedNote: function (count) {
    return count === 1
      ? "מקצה אחד ללא חיזוי כניסות אינו נכלל בתחזית."
      : count + " מקצים ללא חיזוי כניסות אינם נכללים בתחזית.";
  },

  noPredictions:
    "עדיין אין חיזוי כניסות למקצי תחרות זו, ולכן לא ניתן להציג תחזית הכנסות.",

  // Tab 2 (actual). Entry income is computed from real Active entries; stall/shavings actuals
  // come from real bookings and are not wired yet -- stated, not faked.
  actualTitle: "הכנסות בפועל",
  actualEntryIncomeLabel: "הכנסה ממקצים (בפועל)",
  actualEntryIncomeHint: "כניסות פעילות × עלות המקצה",
  actualBookingsPending:
    "הכנסות מתאים ומנסורת יחושבו מהזמנות בפועל (בפיתוח).",
  actualUnavailable: "התצוגה תהיה זמינה עם סגירת ההרשמה.",

  // Tab 3 (projection vs actual). A reliability scorecard about the FORECAST, not the
  // competition -- the same distinction the planned-vs-actual entries panel makes.
  comparisonTitle: "תחזית מול בפועל",
  comparisonUnavailable: "התצוגה תהיה זמינה כשיצטברו נתוני הרשמה בפועל.",
  comparisonWithinBand: "ההכנסה בפועל בתוך טווח התחזית",
  comparisonBelowBand: "ההכנסה בפועל מתחת לטווח התחזית",
  comparisonAboveBand: "ההכנסה בפועל מעל טווח התחזית",
  comparisonLine: function (actual, lo, hi) {
    return (
      "הכנסה ממקצים בפועל " + actual + " מול תחזית של " + lo + " עד " + hi
    );
  },
};

export { FINANCIAL_PROJECTION_COPY };
