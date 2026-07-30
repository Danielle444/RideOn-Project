// מודל תצוגה להזמנה המרוכזת של פייד טיים (הזרימה ה"חכמה").
//
// טהור לחלוטין: אין כאן react-native, אין שירותים, ואין כלל עסקי חדש.
// הקובץ לא בונה את ה-payload ולא מחליט מה יישלח - הוא מקבל את ה-items
// שכבר נבנו ב-usePaidTimeChatbot (buildItems) ומתאר אותם למסך.
//
// לכן ספירת הבקשות והמחיר במסך הסיכום תמיד תואמים למה שבאמת נשלח:
// אותו מקור נתונים, בלי לוגיקה מקבילה.

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function formatHorseLabel(horse) {
  if (!horse) {
    return "";
  }

  var name = safeText(horse.horseName) || "סוס";
  var barn = safeText(horse.barnName);

  return barn ? name + " (" + barn + ")" : name;
}

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

// Number(null) הוא 0, ולכן חובה לסנן ריק/חסר לפני ההמרה - אחרת מחיר חסר
// היה נספר כאפס ומסך הסיכום היה מציג סכום שגוי במקום לומר שאין מחיר.
export function toPriceNumber(itemPrice) {
  if (itemPrice === null || itemPrice === undefined || itemPrice === "") {
    return null;
  }

  var price = Number(itemPrice);

  if (!Number.isFinite(price)) {
    return null;
  }

  return price;
}

export function formatPriceLabel(itemPrice) {
  var price = toPriceNumber(itemPrice);

  if (price === null) {
    return "";
  }

  return String(price) + " ₪";
}

export function buildItemKey(coachId, horseId) {
  return String(coachId) + "-" + String(horseId);
}

// חיפוש פריט הקטלוג לפי המזהה שנשלח בפועל ב-item. אין ניחוש לפי קצר/ארוך -
// אם המזהה לא נמצא, פשוט אין מחיר להצגה.
export function findCatalogItemById(context, priceCatalogId) {
  var all = safeArray(context && context.priceCatalog && context.priceCatalog.all);

  return (
    all.find(function (entry) {
      return String(entry.priceCatalogId) === String(priceCatalogId);
    }) || null
  );
}

// סדר האימון של מאמן, אם נבחר סדר תקין. אחרת - סדר הבחירה המקורי.
// זהו בדיוק אותו כלל שקיים כבר במסך הסיכום הישן.
export function orderSelectedHorses(coach, horsesPerCoach, trainingOrder) {
  var coachId = coach.coachFederationMemberId;
  var selectedIds = safeArray((horsesPerCoach || {})[coachId]).map(String);
  var allHorses = safeArray(coach.horses);

  var selected = allHorses.filter(function (horse) {
    return selectedIds.includes(String(horse.horseId));
  });

  var order = (trainingOrder || {})[coachId];

  if (Array.isArray(order) && order.length === selected.length) {
    var byId = {};

    selected.forEach(function (horse) {
      byId[horse.horseId] = horse;
    });

    var ordered = order
      .map(function (id) {
        return byId[id];
      })
      .filter(Boolean);

    if (ordered.length === selected.length) {
      return ordered;
    }
  }

  return selected;
}

// למה סוס נבחר בכל זאת לא ייווצר עבורו item. הסיבות משקפות את התנאים
// הקיימים ב-buildItems - הן לא משנות אותם, רק מסבירות אותם למשתמשת.
function buildMissingReasons(values) {
  var reasons = [];

  if (!values.hasCatalog) {
    reasons.push("סוג פייד טיים");
  }

  if (!values.hasSlot) {
    reasons.push("סלוט פנוי ליום ולמגרש שנבחרו");
  }

  if (!values.riderId) {
    reasons.push("רוכב");
  }

  if (!values.payerId) {
    reasons.push("משלם");
  }

  return reasons;
}

// המודל המרכזי: מאמן -> סוסים, עם מצב השלמה ומחיר לכל בקשה.
//
// params:
//   answers  - chatbot.state.answers
//   context  - chatbot.state.context
//   items    - chatbot.items (תוצאת buildItems, מקור האמת לשליחה)
export function buildBulkReviewModel(params) {
  var safeParams = params || {};
  var answers = safeParams.answers || {};
  var context = safeParams.context || {};
  var items = safeArray(safeParams.items);

  var coachesWithHorses = safeArray(context.coachesWithHorses);
  var entryLookup = context.entryLookup || {};
  var horsesPerCoach = answers.horsesPerCoach || {};
  var shortLong = answers.shortLong || {};

  var selectedCoachIds = safeArray(answers.selectedCoachIds).map(String);

  var itemsByKey = {};
  items.forEach(function (item) {
    itemsByKey[
      buildItemKey(item.coachFederationMemberId, item.horseId)
    ] = item;
  });

  var totalPrice = 0;
  var totalPriceAvailable = true;

  items.forEach(function (item) {
    var catalogItem = findCatalogItemById(context, item.priceCatalogId);
    var price = toPriceNumber(catalogItem ? catalogItem.itemPrice : null);

    if (price === null) {
      totalPriceAvailable = false;
      return;
    }

    totalPrice = totalPrice + price;
  });

  var selectedCoaches = coachesWithHorses.filter(function (coach) {
    return selectedCoachIds.includes(String(coach.coachFederationMemberId));
  });

  var coaches = selectedCoaches.map(function (coach) {
    var coachId = coach.coachFederationMemberId;
    var orderedHorses = orderSelectedHorses(coach, horsesPerCoach, answers.trainingOrder);

    var horses = orderedHorses.map(function (horse) {
      var key = buildItemKey(coachId, horse.horseId);
      var item = itemsByKey[key] || null;
      var entry = entryLookup[key] || null;

      var lengthChoice = shortLong[horse.horseId] || "short";
      var chosenCatalog =
        (context.priceCatalog && context.priceCatalog[lengthChoice]) || null;

      var catalogItem = item
        ? findCatalogItemById(context, item.priceCatalogId)
        : chosenCatalog;

      var riderId = (answers.riderPerHorse || {})[horse.horseId] ||
        (entry ? entry.riderFederationMemberId : null);
      var payerId = (answers.payerPerHorse || {})[horse.horseId] ||
        (entry ? entry.paidByPersonId : null);

      var missingReasons = item
        ? []
        : buildMissingReasons({
            hasCatalog: !!chosenCatalog,
            hasSlot: !!(item || hasAnySlotForSelection(answers, context)),
            riderId: riderId,
            payerId: payerId,
          });

      return {
        horseId: horse.horseId,
        horseLabel: formatHorseLabel(horse),
        lengthChoice: lengthChoice,
        typeName: catalogItem ? safeText(catalogItem.productName) : "",
        durationLabel: catalogItem
          ? formatDurationLabel(catalogItem.durationMinutes)
          : "",
        priceLabel: catalogItem ? formatPriceLabel(catalogItem.itemPrice) : "",
        riderName: entry ? safeText(entry.riderName) : "",
        payerName: entry ? safeText(entry.payerName) : "",
        slotLabel: item
          ? buildSlotLabel(findSlotById(context, item.requestedCompSlotId))
          : "",
        notes: item ? safeText(item.notes) : "",
        isIncluded: !!item,
        missingReasons: missingReasons,
      };
    });

    var includedCount = horses.filter(function (horse) {
      return horse.isIncluded;
    }).length;

    return {
      coachId: coachId,
      coachName: safeText(coach.coachName) || "מאמן",
      horses: horses,
      selectedCount: horses.length,
      includedCount: includedCount,
      excludedCount: horses.length - includedCount,
    };
  });

  var excludedCount = coaches.reduce(function (sum, coach) {
    return sum + coach.excludedCount;
  }, 0);

  return {
    coaches: coaches,
    requestCount: items.length,
    excludedCount: excludedCount,
    totalPrice: totalPriceAvailable ? totalPrice : null,
    totalPriceLabel: totalPriceAvailable ? formatPriceLabel(totalPrice) : "",
    dayLabel: safeText(answers.day),
    arenaName: findArenaName(context, answers.arenaKey),
  };
}

function hasAnySlotForSelection(answers, context) {
  var slotsByDay = (context && context.slotsByDay) || {};
  return safeArray(slotsByDay[answers.day]).length > 0;
}

export function formatSlotTime(value) {
  var text = safeText(value);

  if (!text) {
    return "";
  }

  return text.length >= 5 ? text.slice(0, 5) : text;
}

// הסלוט שנשלח בפועל, לפי המזהה שעל ה-item. מחפש בכל הימים שנטענו,
// כדי שהתווית תישאר נכונה גם אם היום שנבחר השתנה אחרי בניית ה-item.
export function findSlotById(context, slotId) {
  var slotsByDay = (context && context.slotsByDay) || {};
  var dayKeys = Object.keys(slotsByDay);

  for (var index = 0; index < dayKeys.length; index++) {
    var slots = safeArray(slotsByDay[dayKeys[index]]);

    var match = slots.find(function (slot) {
      return String(slot.paidTimeSlotInCompId) === String(slotId);
    });

    if (match) {
      return match;
    }
  }

  return null;
}

export function buildSlotLabel(slot) {
  if (!slot) {
    return "";
  }

  var start = formatSlotTime(slot.startTime);
  var end = formatSlotTime(slot.endTime);
  var times = [start, end].filter(Boolean).join(" - ");

  return [times, safeText(slot.arenaName)].filter(Boolean).join(" · ");
}

export function findArenaName(context, arenaKey) {
  var arenas = safeArray(context && context.arenas);

  var match = arenas.find(function (arena) {
    return arena.key === arenaKey;
  });

  return match ? safeText(match.arenaName) : "";
}

// סיכום קצר שמוצג באופן קבוע בראש הזרימה (הרצועה המתמדת).
export function buildSelectionSummary(params) {
  var safeParams = params || {};
  var answers = safeParams.answers || {};
  var context = safeParams.context || {};
  var requestCount = Number(safeParams.requestCount) || 0;

  var coachesWithHorses = safeArray(context.coachesWithHorses);
  var selectedCoachIds = safeArray(answers.selectedCoachIds).map(String);

  var selectedCoaches = coachesWithHorses.filter(function (coach) {
    return selectedCoachIds.includes(String(coach.coachFederationMemberId));
  });

  var horseCount = Object.keys(answers.horsesPerCoach || {}).reduce(
    function (sum, coachId) {
      if (!selectedCoachIds.includes(String(coachId))) {
        return sum;
      }

      return sum + safeArray((answers.horsesPerCoach || {})[coachId]).length;
    },
    0,
  );

  var coachLabel = "";

  if (selectedCoaches.length === 1) {
    coachLabel = safeText(selectedCoaches[0].coachName) || "מאמן";
  } else if (selectedCoaches.length > 1) {
    coachLabel = selectedCoaches.length + " מאמנים";
  }

  return {
    coachLabel: coachLabel,
    coachCount: selectedCoaches.length,
    horseCount: horseCount,
    requestCount: requestCount,
    dayLabel: safeText(answers.day),
    arenaName: findArenaName(context, answers.arenaKey),
  };
}

// שמות השלבים לכותרת. הסדר והמפתחות זהים ל-STEPS שב-usePaidTimeChatbot.
var STEP_TITLES = {
  intro: "פתיחה",
  coaches: "בחירת מאמנים",
  dayArena: "יום ומגרש",
  horses: "בחירת סוסים",
  timePrefs: "העדפות זמן",
  timeConstraints: "אילוצי זמן",
  shortLong: "סוג פייד טיים",
  order: "סדר אימון",
  spacing: "מרווחים",
  summary: "סיכום ושליחה",
};

export function getStepTitle(stepKey) {
  return STEP_TITLES[stepKey] || "";
}

export { STEP_TITLES };
