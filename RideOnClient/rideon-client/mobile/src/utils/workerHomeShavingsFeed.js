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
