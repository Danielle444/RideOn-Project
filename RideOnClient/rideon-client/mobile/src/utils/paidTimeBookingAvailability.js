// האם בכלל אפשר להזמין פייד טיים בתחרות הזו.
//
// טהור: מקבל את מה שמסך ההרשמות כבר טען (סלוטים ופריטי מחיר) ומחזיר החלטה.
// אין כאן קריאת API חדשה, אין ברירות מחדל ואין יצירת סלוט/מוצר מדומה.
//
// שתי דרישות המינימום אומתו מול הזרימה הקיימת:
//   סלוטים  - בלעדיהם slotsByDay ריק, שלב "יום ומגרש" לא מאפשר להתקדם,
//             ו-buildItems מדלגת על כל פריט (findSlotForHorse מחזירה null).
//             גם הטופס הבודד חוסם: validateForm דורש selectedRequestedSlot.
//   מחירים  - בלעדיהם priceCatalog.short/long הם null, buildItems מדלגת על כל
//             פריט, ואין priceCatalogId לשלוח. גם הטופס הבודד דורש
//             selectedPriceCatalog.
//
// לכן שתי הדרישות זהות עבור "הזמנה אחת" ועבור "כמה הזמנות יחד".

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

var MESSAGE_NO_SLOTS =
  "לא ניתן ליצור הזמנות פייד־טיים לפני שמגדירים סלוטים לתחרות.";

var MESSAGE_NO_PRICES =
  "לא ניתן ליצור הזמנות פייד־טיים לפני שמגדירים מחירי פייד־טיים לתחרות.";

var MESSAGE_NO_SLOTS_AND_PRICES =
  "לא ניתן ליצור הזמנות פייד־טיים לפני שמגדירים סלוטים ומחירים לתחרות.";

var MESSAGE_NO_CANDIDATES =
  "לא נמצאו מאמנים עם סוסים רשומים למקצים בתחרות הזו עבור החווה שלך. יש לרשום סוסים למקצים לפני יצירת הזמנה מרוכזת.";

var HINT = "אפשר להגדיר זאת במסך ניהול התחרות, או לפנות למזכירות התחרות.";

export function evaluatePaidTimeBookingAvailability(params) {
  var safeParams = params || {};

  var hasSlots = safeArray(safeParams.requestableSlots).length > 0;
  var hasPriceItems = safeArray(safeParams.priceCatalogItems).length > 0;

  var missing = [];

  if (!hasSlots) {
    missing.push("slots");
  }

  if (!hasPriceItems) {
    missing.push("prices");
  }

  var isAvailable = hasSlots && hasPriceItems;
  var message = "";

  if (!hasSlots && !hasPriceItems) {
    message = MESSAGE_NO_SLOTS_AND_PRICES;
  } else if (!hasSlots) {
    message = MESSAGE_NO_SLOTS;
  } else if (!hasPriceItems) {
    message = MESSAGE_NO_PRICES;
  }

  return {
    hasSlots: hasSlots,
    hasPriceItems: hasPriceItems,
    // שתי הזרימות חולקות בדיוק את אותן דרישות מינימום.
    canBookSingle: isAvailable,
    canBookBulk: isAvailable,
    isAvailable: isAvailable,
    missing: missing,
    message: message,
    hint: isAvailable ? "" : HINT,
  };
}

// בדיקה נפרדת, בתוך המודל בלבד: להזמנה מרוכזת נדרשים גם מועמדים
// (מאמן עם סוסים רשומים). המידע הזה נטען רק על ידי שירות ההזמנה המרוכזת,
// ולכן אי אפשר לבדוק אותו בכניסה בלי קריאת API נוספת.
export function evaluateBulkCandidatesAvailability(context) {
  var coachesWithHorses = safeArray(context && context.coachesWithHorses);

  var hasCandidates = coachesWithHorses.some(function (coach) {
    return safeArray(coach.horses).length > 0;
  });

  return {
    hasCandidates: hasCandidates,
    message: hasCandidates ? "" : MESSAGE_NO_CANDIDATES,
  };
}

export {
  MESSAGE_NO_SLOTS,
  MESSAGE_NO_PRICES,
  MESSAGE_NO_SLOTS_AND_PRICES,
  MESSAGE_NO_CANDIDATES,
};
