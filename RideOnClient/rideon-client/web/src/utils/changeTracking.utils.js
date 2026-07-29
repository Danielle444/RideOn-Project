import { getErrorMessage } from "./competitionForm.utils";

// Canonical Hebrew status labels — shared by the table and the details modal
// so the status reads identically in both (CAP-3).
function getStatusLabel(status) {
  if (status === "Pending") {
    return "ממתינה";
  }

  if (status === "Approved") {
    return "אושרה";
  }

  if (status === "Rejected") {
    return "נדחתה";
  }

  return status || "-";
}

function getStatusClass(status) {
  if (status === "Approved") {
    return "bg-[#EEF8F0] text-[#2F6B3B]";
  }

  if (status === "Rejected") {
    return "bg-[#FDECEC] text-[#A33A3A]";
  }

  return "bg-[#FFF4E5] text-[#9A5B00]";
}

function getSourceLabel(source) {
  if (source === "Entry") {
    return "מקצים";
  }

  if (source === "Product") {
    return "מוצרים";
  }

  return source || "-";
}

// CAP-4: answer-call failures must surface as intelligible Hebrew, never as raw
// proc/exception text. The leaked English is used only as a classifier; the
// displayed string is always Hebrew.
function getAnswerErrorMessage(error) {
  var raw = getErrorMessage(error, "");

  if (typeof raw === "string" && raw.toLowerCase().indexOf("paid") !== -1) {
    return "לא ניתן לאשר או לדחות בקשה עבור פריט ששולם.";
  }

  return "הפעולה נכשלה. נסי שוב מאוחר יותר.";
}

// CAP-10: a cancellation approved on/after competition start deliberately keeps
// the full original charge (the answer proc's post-start branch sets
// AmountAfter = AmountBefore). Detect that branch so the UI can explain why no
// money is refunded. Product cancellations always zero out, so this is
// effectively entry-only.
function isPostStartFullChargeCancellation(isCancelled, amountBefore, amountAfter) {
  if (!isCancelled) {
    return false;
  }

  if (
    amountBefore === null ||
    amountBefore === undefined ||
    amountAfter === null ||
    amountAfter === undefined
  ) {
    return false;
  }

  var before = Number(amountBefore);
  var after = Number(amountAfter);

  return before > 0 && after === before;
}

var POST_START_FULL_CHARGE_LABEL =
  "ביטול לאחר תחילת התחרות — החיוב המלא נשמר.";

// #52: BeforeText/AfterText arrive from the read proc as "|"-delimited
// "label: value" strings. These three helpers parse one part; they are private
// to this module and only buildChangedFields is exported.
function splitDetailsText(text) {
  if (!text) {
    return [];
  }

  return String(text)
    .split("|")
    .map(function (part) {
      return part.trim();
    })
    .filter(function (part) {
      return part.length > 0;
    });
}

function getDetailLabel(part) {
  var index = part.indexOf(":");

  if (index === -1) {
    return part.trim();
  }

  return part.substring(0, index).trim();
}

function getDetailValue(part) {
  var index = part.indexOf(":");

  if (index === -1) {
    return "";
  }

  return part.substring(index + 1).trim();
}

// #52: single definition shared by ChangeRequestsTable and
// ChangeRequestDetailsModal (previously duplicated byte-for-byte in both).
// Pairs each before-part with the after-part carrying the same label and keeps
// only the ones whose value actually changed.
function buildChangedFields(beforeText, afterText) {
  var beforeParts = splitDetailsText(beforeText);
  var afterParts = splitDetailsText(afterText);
  var changes = [];

  beforeParts.forEach(function (beforePart) {
    var beforeLabel = getDetailLabel(beforePart);
    var beforeValue = getDetailValue(beforePart);

    var matchingAfterPart = afterParts.find(function (afterPart) {
      return getDetailLabel(afterPart) === beforeLabel;
    });

    if (!matchingAfterPart) {
      return;
    }

    var afterValue = getDetailValue(matchingAfterPart);

    var isMissingAfterValue =
      afterValue === "" ||
      afterValue === "-" ||
      afterValue === "₪" ||
      afterValue === "₪0" ||
      afterValue === "₪0.00";

    var isPayerField = beforeLabel === "משלם" || beforeLabel === "משלמים";

    if (isPayerField && isMissingAfterValue) {
      return;
    }

    // Money is shown once, in the consumer's dedicated money display. Skip the
    // money-labeled parts baked into the proc text so it is not shown twice.
    var isMoneyField =
      beforeLabel === "חיוב" ||
      beforeLabel === "מחיר מחירון" ||
      beforeLabel === "מחיר";

    if (isMoneyField) {
      return;
    }

    if (beforeValue !== afterValue) {
      changes.push({
        label: beforeLabel,
        beforeValue: beforeValue || "-",
        afterValue: afterValue || "-",
      });
    }
  });

  return changes;
}

export {
  getStatusLabel,
  getStatusClass,
  getSourceLabel,
  getAnswerErrorMessage,
  isPostStartFullChargeCancellation,
  POST_START_FULL_CHARGE_LABEL,
  buildChangedFields,
};
