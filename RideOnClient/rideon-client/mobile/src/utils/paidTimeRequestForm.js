// לוגיקה טהורה של טופס בקשת פייד טיים בודדת (מסלול "הזמנה אחת" של אדמין חווה).
//
// הקובץ הזה לא מייבא react-native ולא שירותים - רק חישוב על אובייקטים.
// המטרה: ולידציה של כל השדות במכה אחת, בניית מודל התצוגה למסך האישור,
// ובניית ה-payload - בלי לשנות את החוזה מול השרת.
//
// אין כאן שום כלל עסקי חדש: הודעות הוולידציה והמפתחות של ה-payload הועתקו
// אחד לאחד מ-useAdminCompetitionPaidTimes.

// סדר המערך = סדר ההופעה במסך. הוא זה שקובע מהו "השדה הלא תקין הראשון"
// שאליו גוללים אחרי כישלון ולידציה.
var PAID_TIME_REQUIRED_FIELDS = [
  {
    key: "requestedSlot",
    section: "when",
    idKey: "paidTimeSlotInCompId",
    message: "יש לבחור סלוט מבוקש",
  },
  {
    key: "priceCatalog",
    section: "type",
    idKey: "priceCatalogId",
    message: "יש לבחור סוג פייד טיים",
  },
  {
    key: "horse",
    section: "details",
    idKey: "horseId",
    message: "יש לבחור סוס",
  },
  {
    key: "rider",
    section: "details",
    idKey: "federationMemberId",
    message: "יש לבחור רוכב",
  },
  {
    key: "coach",
    section: "details",
    idKey: "federationMemberId",
    message: "יש לבחור מאמן",
  },
  {
    key: "payer",
    section: "details",
    idKey: "personId",
    message: "יש לבחור משלם",
  },
];

function hasSelectedId(value, idKey) {
  if (!value) {
    return false;
  }

  var id = value[idKey];

  return id !== null && id !== undefined && id !== "";
}

function getSafeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

// ולידציה של כל השדות יחד - לא נעצרת בשגיאה הראשונה.
// מחזירה:
//   fieldErrors           - מפה של fieldKey -> הודעה, ריקה כשהטופס תקין
//   firstInvalidFieldKey  - השדה הראשון לפי סדר המסך, או null
//   firstInvalidSection   - הסקשן שלו, או null
//   contextError          - שגיאה שאינה של שדה בטופס (משתמש/חווה חסרים)
//   isValid               - אין שגיאות שדה ואין שגיאת הקשר
export function validatePaidTimeForm(values) {
  var safeValues = values || {};
  var fieldErrors = {};
  var firstInvalidFieldKey = null;
  var firstInvalidSection = null;

  PAID_TIME_REQUIRED_FIELDS.forEach(function (field) {
    if (hasSelectedId(safeValues[field.key], field.idKey)) {
      return;
    }

    fieldErrors[field.key] = field.message;

    if (!firstInvalidFieldKey) {
      firstInvalidFieldKey = field.key;
      firstInvalidSection = field.section;
    }
  });

  var contextError = "";

  if (!safeValues.user || !safeValues.user.personId) {
    contextError = "לא נמצאו פרטי משתמש מחובר";
  } else if (!safeValues.activeRole || !safeValues.activeRole.ranchId) {
    contextError = "לא נמצאה חווה פעילה";
  }

  return {
    fieldErrors: fieldErrors,
    firstInvalidFieldKey: firstInvalidFieldKey,
    firstInvalidSection: firstInvalidSection,
    contextError: contextError,
    isValid: firstInvalidFieldKey === null && contextError === "",
  };
}

// מחזירה עותק חדש של מפת השגיאות בלי המפתח שתוקן.
// אם אין שגיאה על השדה - מוחזר בדיוק אותו אובייקט, כדי לא לגרום ל-render מיותר.
export function clearFieldError(fieldErrors, fieldKey) {
  var safeErrors = fieldErrors || {};

  if (!fieldKey || !safeErrors[fieldKey]) {
    return safeErrors;
  }

  var next = {};

  Object.keys(safeErrors).forEach(function (key) {
    if (key !== fieldKey) {
      next[key] = safeErrors[key];
    }
  });

  return next;
}

export function getFieldSection(fieldKey) {
  var match = PAID_TIME_REQUIRED_FIELDS.find(function (field) {
    return field.key === fieldKey;
  });

  return match ? match.section : null;
}

export function formatDisplayTime(timeValue) {
  var timeText = getSafeText(timeValue);

  if (!timeText) {
    return "";
  }

  if (timeText.length >= 5) {
    return timeText.slice(0, 5);
  }

  return timeText;
}

export function getHebrewDateLabel(dateValue) {
  if (!dateValue) {
    return "";
  }

  try {
    var date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "numeric",
    });
  } catch (error) {
    return "";
  }
}

// משך זמן חסר הוא מצב לגיטימי בקטלוג - במקרה כזה מוחזרת מחרוזת ריקה
// והצד המציג פשוט לא מרנדר את השורה. אסור ש-"null"/"undefined" יגיעו למסך.
export function formatDurationLabel(durationMinutes) {
  if (
    durationMinutes === null ||
    durationMinutes === undefined ||
    durationMinutes === ""
  ) {
    return "";
  }

  var minutes = Number(durationMinutes);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "";
  }

  return String(minutes) + " דק׳";
}

export function formatPriceLabel(itemPrice) {
  if (itemPrice === null || itemPrice === undefined || itemPrice === "") {
    return "";
  }

  var price = Number(itemPrice);

  if (!Number.isFinite(price)) {
    return "";
  }

  return String(price) + " ₪";
}

// סיכום הסלוט הנבחר - רק שדות שכבר קיימים באופציה שנבחרה.
// אין כאן תפוסה, מקומות פנויים או סטטוס פרסום.
export function buildSlotSummary(slot) {
  if (!slot) {
    return null;
  }

  var startTime = formatDisplayTime(slot.startTime);
  var endTime = formatDisplayTime(slot.endTime);

  return {
    dateLabel: getHebrewDateLabel(slot.slotDate),
    timeLabel: [startTime, endTime].filter(Boolean).join(" - "),
    arenaName: getSafeText(slot.arenaName),
  };
}

export function buildTypeSummary(priceCatalogItem) {
  if (!priceCatalogItem) {
    return null;
  }

  return {
    productName: getSafeText(priceCatalogItem.productName),
    durationLabel: formatDurationLabel(priceCatalogItem.durationMinutes),
    priceLabel: formatPriceLabel(priceCatalogItem.itemPrice),
  };
}

// מודל התצוגה של מסך האישור. משתמש אך ורק בערכים שנבחרו בטופס -
// אין כאן שליפה נוספת ואין ערכי ברירת מחדל מומצאים.
export function buildPaidTimeReviewModel(values, labelFormatters) {
  var safeValues = values || {};
  var formatters = labelFormatters || {};

  function applyFormatter(formatterName, item) {
    var formatter = formatters[formatterName];

    if (typeof formatter !== "function" || !item) {
      return "";
    }

    return getSafeText(formatter(item));
  }

  return {
    competitionName: getSafeText(safeValues.competitionName),
    slot: buildSlotSummary(safeValues.requestedSlot),
    type: buildTypeSummary(safeValues.priceCatalog),
    horseLabel: applyFormatter("formatHorseLabel", safeValues.horse),
    riderLabel: applyFormatter("formatMemberLabel", safeValues.rider),
    coachLabel: applyFormatter("formatMemberLabel", safeValues.coach),
    payerLabel: applyFormatter("formatPayerLabel", safeValues.payer),
    notes: getSafeText(safeValues.notes),
  };
}

// חוזה השרת. חייב להישאר זהה לחלוטין למה שנשלח לפני שלב B1.
export function buildPaidTimeRequestPayload(values) {
  var safeValues = values || {};

  return {
    orderedBySystemUserId: safeValues.user.personId,
    ranchId: safeValues.activeRole.ranchId,
    horseId: safeValues.horse.horseId,
    riderFederationMemberId: safeValues.rider.federationMemberId,
    coachFederationMemberId: safeValues.coach.federationMemberId,
    paidByPersonId: safeValues.payer.personId,
    priceCatalogId: safeValues.priceCatalog.priceCatalogId,
    requestedCompSlotId: safeValues.requestedSlot.paidTimeSlotInCompId,
    notes: safeValues.notes ? safeValues.notes.trim() : null,
  };
}

// חוזה העדכון (update-notes). כמו ביצירה - השדות camelCase ואין כאן כלל
// עסקי חדש. שולח תמיד את הבחירה הנוכחית עבור priceCatalogId/requestedCompSlotId
// (גם אם לא השתנתה) - usp_updatepaidtimerequest כבר משווה מול הערך הקיים
// ומדלג בשקט כשהם זהים, כך שאין צורך לשכפל כאן דיפ צד-לקוח. notes נשלח
// תמיד כמחרוזת (אף פעם לא null) כי "" אצל usp_updatepaidtimerequest פירושה
// "נקה", בעוד ש-null פירושה "אל תיגע" - בטופס העריכה יש תמיד ערך notes.
export function buildPaidTimeUpdatePayload(paidTimeRequestId, ranchId, values) {
  var safeValues = values || {};

  return {
    paidTimeRequestId: paidTimeRequestId,
    ranchId: ranchId,
    notes: safeValues.notes ? safeValues.notes.trim() : "",
    priceCatalogId: safeValues.priceCatalog
      ? safeValues.priceCatalog.priceCatalogId
      : null,
    requestedCompSlotId: safeValues.requestedSlot
      ? safeValues.requestedSlot.paidTimeSlotInCompId
      : null,
  };
}

// תמונת מצב לצורך מסך ההצלחה. נלקחת לפני איפוס השדות הלא נעולים,
// כדי שהאיפוס הקיים לא ירוקן את מה שמוצג למשתמשת.
export function buildSuccessSnapshot(values, labelFormatters) {
  var safeValues = values || {};
  var formatters = labelFormatters || {};
  var horseLabel = "";

  if (typeof formatters.formatHorseLabel === "function" && safeValues.horse) {
    horseLabel = getSafeText(formatters.formatHorseLabel(safeValues.horse));
  }

  var typeSummary = buildTypeSummary(safeValues.priceCatalog);

  return {
    horseLabel: horseLabel,
    slot: buildSlotSummary(safeValues.requestedSlot),
    priceLabel: typeSummary ? typeSummary.priceLabel : "",
    typeName: typeSummary ? typeSummary.productName : "",
  };
}

export { PAID_TIME_REQUIRED_FIELDS };
