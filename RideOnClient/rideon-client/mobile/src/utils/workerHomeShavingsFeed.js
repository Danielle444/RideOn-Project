// הזמנת נסורת אחת עבור פיד "העבודות שלי להיום" במסך הבית של העובד.
//
// טהור: אין כאן קריאת API, רק מיון והפקת דגלים מתוך מה שהשרת כבר החזיר.
// הפרוצדורה (usp_getworkerhomeshavingsfeed) מפעילה DISTINCT ON לפי shavingsorderid
// לצורך דה-דופ של ה-JOIN לתא, ולכן ה-ORDER BY שלה מוביל עם shavingsorderid ולא עם
// שעת האספקה - סדר התוצאה מהשרת הוא לפי מזהה, לא לפי "שלי קודם" ולא לפי זמן.
// המיון העסקי המלא (שלי קודם, ואז לפי RequestedDeliveryTime עולה) מתבצע כאן בלבד.

function isMyShavingsOrder(order, currentUserId) {
  return order.workerSystemUserId === currentUserId;
}

function isUnclaimedShavingsOrder(order) {
  return (
    order.workerSystemUserId === null || order.workerSystemUserId === undefined
  );
}

// הפרוצדורה כבר מסננת "שלי או לא-נלקח" בלבד, אז מבחינה תיאורטית הזמנה שנלקחה
// על ידי עובד אחר לעולם לא אמורה להגיע לכאן. עדיין מחשבים את זה במפורש (ולא
// מניחים false קבוע) כדי שדגלי הכרטיס יהיו כנים גם אם המסננים משתנים בעתיד.
function isTakenByOtherWorker(order, currentUserId) {
  return !isUnclaimedShavingsOrder(order) && !isMyShavingsOrder(order, currentUserId);
}

export function getWorkerHomeFeedCardFlags(order, currentUserId) {
  return {
    isMyOrder: isMyShavingsOrder(order, currentUserId),
    isUnclaimed: isUnclaimedShavingsOrder(order),
    isTakenByOther: isTakenByOtherWorker(order, currentUserId),
  };
}

// מחזיר את שעת האספקה כמספר (מילישניות) לצורך השוואה, או null עבור כל מה
// שאינו תאריך תקין - חסר, ריק, או מחרוזת שלא ניתנת לפענוח. null תמיד נחשב
// "מאוחר יותר" מכל זמן תקין, כדי שהזמנות בלי שעת אספקה תקינה יירדו לסוף הקבוצה.
function getDeliveryTimeOrNull(order) {
  var raw = order.requestedDeliveryTime;

  if (raw === null || raw === undefined || raw === "") {
    return null;
  }

  var parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

// משווה שתי הזמנות בתוך אותה קבוצה (שלי-עם-שלי, לא-נלקח-עם-לא-נלקח): שעת
// אספקה עולה, חסר/לא-תקין בסוף, ותיקו נשבר לפי מיקום המקור במערך שהתקבל -
// זה כשלעצמו קובע סדר יחיד וחד-משמעי (האינדקסים ייחודיים), כך ש-ShavingsOrderId
// לא נדרש כמפתח נוסף.
function compareWithinGroup(a, b) {
  var aTime = getDeliveryTimeOrNull(a.order);
  var bTime = getDeliveryTimeOrNull(b.order);

  var aMissing = aTime === null;
  var bMissing = bTime === null;

  if (aMissing !== bMissing) {
    return aMissing ? 1 : -1;
  }

  if (!aMissing && aTime !== bTime) {
    return aTime - bTime;
  }

  return a.index - b.index;
}

// שלי קודם, אחר כך לא-נלקח; בתוך כל קבוצה - לפי RequestedDeliveryTime עולה,
// עם חסר/לא-תקין בסוף הקבוצה ותיקו יציב לפי סדר הקלט.
export function sortWorkerHomeFeed(orders, currentUserId) {
  var safeOrders = Array.isArray(orders) ? orders : [];

  return safeOrders
    .map(function (order, index) {
      return { order: order, index: index };
    })
    .sort(function (a, b) {
      var aMine = isMyShavingsOrder(a.order, currentUserId) ? 0 : 1;
      var bMine = isMyShavingsOrder(b.order, currentUserId) ? 0 : 1;

      if (aMine !== bMine) {
        return aMine - bMine;
      }

      return compareWithinGroup(a, b);
    })
    .map(function (entry) {
      return entry.order;
    });
}

// --- Worker competition shavings-orders screen bucketing (separate from the
// home-feed sort above: "mine first" semantics are wrong here — see the
// module comment on sortWorkerHomeFeed. This buckets by requested date only.) --

// "Delivered" here matches the card's own deriveState() exactly: the stored
// deliveryStatus token, or an arrivalTime already set.
function isOrderDelivered(order) {
  return order.deliveryStatus === "Delivered" || !!order.arrivalTime;
}

// Local (not UTC) Y-M-D as a single comparable integer, e.g. 2026-08-05 ->
// 20260805. RequestedDeliveryTime is a `timestamp without time zone` and
// parses as local time in JS - comparing local calendar components (not UTC
// date-string slicing) avoids a midnight off-by-one for any caller/timezone.
function toLocalDateKey(value) {
  var date = new Date(value);
  return (
    date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  );
}

// Ascending by requested time, stable tiebreak by original array position -
// same technique as compareWithinGroup, kept separate since this bucketing
// has different group membership rules than the home-feed sort above.
function compareByRequestedTimeAscending(a, b) {
  var aTime = getDeliveryTimeOrNull(a.order);
  var bTime = getDeliveryTimeOrNull(b.order);

  if (aTime !== bTime) {
    return aTime - bTime;
  }

  return a.index - b.index;
}

/**
 * Buckets a worker's competition shavings orders into three sections by the
 * requested delivery date relative to `now`, for the (non-home-feed)
 * competition orders screen:
 *
 *   today  - RequestedDeliveryTime local date === today's local date, sorted
 *            time-ascending.
 *   older  - three concatenated groups, in this exact order: (1) past-date,
 *            not-yet-delivered orders, time-ascending; (2) null/undefined-time
 *            orders (delivery status irrelevant - there is no date to bucket
 *            them by); (3) past-date, delivered orders, time-ascending. Locked
 *            business rule: past delivered orders stay visible here, never
 *            dropped, and render collapsed by default (see the card).
 *   future - local date > today, sorted ascending (a single timestamp compare
 *            already orders by date then time together).
 *
 * Pure: returns fresh arrays, never mutates `orders`.
 * @param {Array<Object>} orders
 * @param {Date|number|string} now
 * @returns {{today: Array<Object>, older: Array<Object>, future: Array<Object>}}
 */
export function bucketWorkerCompetitionOrders(orders, now) {
  var safeOrders = Array.isArray(orders) ? orders : [];
  var todayKey = toLocalDateKey(now);

  var today = [];
  var pastUndelivered = [];
  var nullTime = [];
  var pastDelivered = [];
  var future = [];

  safeOrders.forEach(function (order, index) {
    var entry = { order: order, index: index };
    var time = getDeliveryTimeOrNull(order);

    if (time === null) {
      nullTime.push(entry);
      return;
    }

    var dateKey = toLocalDateKey(time);

    if (dateKey === todayKey) {
      today.push(entry);
    } else if (dateKey < todayKey) {
      if (isOrderDelivered(order)) {
        pastDelivered.push(entry);
      } else {
        pastUndelivered.push(entry);
      }
    } else {
      future.push(entry);
    }
  });

  today.sort(compareByRequestedTimeAscending);
  pastUndelivered.sort(compareByRequestedTimeAscending);
  pastDelivered.sort(compareByRequestedTimeAscending);
  future.sort(compareByRequestedTimeAscending);

  function unwrap(entries) {
    return entries.map(function (entry) {
      return entry.order;
    });
  }

  return {
    today: unwrap(today),
    older: unwrap(pastUndelivered).concat(unwrap(nullTime)).concat(unwrap(pastDelivered)),
    future: unwrap(future),
  };
}
