// מיפוי בטוח של כשלי התחברות להודעה למשתמש, וזיהוי נקודת הקצה של ההתחברות.
//
// טהור: מקבל את אובייקט השגיאה כפי שהוא מגיע מ-axios ומחזיר אך ורק אחת
// מהמחרוזות הקבועות שמוגדרות כאן. אף פעם לא מוחזר טקסט שמקורו בשרת, ב-DB,
// בשכבת החיבור או ב-axios עצמו — הודעות כאלה עלולות לחשוף שם מארח, נתיב,
// שאילתה או פרט תשתית אחר במסך ההתחברות.
//
// סדר הבדיקות ב-getLoginErrorMessage הוא חלק מהחוזה ולא סגנון:
//   1. isAuthError  - האובייקט הסינתטי של האינטרספטור הגלובלי (סשן שפג).
//   2. PENDING_APPROVAL - מגיע כ-400 עם גוף מוכר, ולכן חייב להיבדק לפני
//      הנפילה הגנרית של כל 400 אחר.
//   3. פסק זמן - לפסק זמן אין response, ולכן בלי שהוא נבדק לפני בדיקת
//      "אין תשובה" הוא היה מקבל את הודעת הרשת במקום את הודעת פסק הזמן.
//   4. יש response - 401 הוא פרטי התחברות שגויים, כל היתר גנרי.
//   5. אין response אבל הבקשה יצאה - כשל רשת.
//   6. כל השאר - גנרי.

var MESSAGE_TIMEOUT = "השרת לא הגיב בזמן. נסי שוב.";

var MESSAGE_NETWORK =
  "לא ניתן להתחבר לשרת. בדקי את החיבור לאינטרנט ונסי שוב.";

var MESSAGE_INVALID_CREDENTIALS = "שם המשתמש או הסיסמה שגויים.";

// שתי ההודעות הבאות קיימות כבר היום ב-loginAndInitialize ונשמרות מילה במילה.
var MESSAGE_PENDING_APPROVAL = "חשבונך ממתין לאישור מנהל המערכת";

var MESSAGE_SESSION_EXPIRED = "ההתחברות פגה, יש להתחבר מחדש";

var MESSAGE_GENERIC = "שגיאה בהתחברות";

// הזנב המדויק של נקודת הקצה. הבדיקה מעוגנת לסוף הנתיב ולגבול המקטע (הלוכסן
// המוביל), ולכן "/api/SuperUsers/login" או "/api/SystemUsers/login-history"
// לא נחשבים התחברות. אין כאן /api קשיח כדי שהחלפת כתובת הבסיס לשרת מקומי
// לא תשבור את הזיהוי.
var LOGIN_ENDPOINT_PATH_SUFFIX = "/systemusers/login";

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function stripQueryAndHash(value) {
  return String(value).split("#")[0].split("?")[0];
}

function stripTrailingSlashes(value) {
  return String(value).replace(/\/+$/, "");
}

// האם הבקשה שנכשלה היא בקשת ההתחברות עצמה.
//
// כשאין URL מוחזר false בכוונה: בלי זיהוי ודאי עדיף ליפול לטיפול ה-401
// הרגיל ולא לפתוח פטור רחב מדי.
//
// ההשוואה חסרת רגישות לאותיות גדולות/קטנות משום שניתוב ASP.NET כך מתנהג,
// ולכן גם "/SystemUsers/login" וגם "/systemusers/login" הם אותה נקודת קצה.
function isLoginRequestUrl(url, baseUrl) {
  if (typeof url !== "string" || url.length === 0) {
    return false;
  }

  var resolved;

  if (isAbsoluteUrl(url)) {
    resolved = url;
  } else {
    var base = stripTrailingSlashes(baseUrl || "");
    resolved = base + (url.charAt(0) === "/" ? url : "/" + url);
  }

  var path = stripTrailingSlashes(stripQueryAndHash(resolved)).toLowerCase();

  return path.endsWith(LOGIN_ENDPOINT_PATH_SUFFIX);
}

// axios מסמן פסק זמן בקוד ולא בהודעה. נבדקים הקודים בלבד, כי התאמה על טקסט
// ההודעה שבירה ועלולה להיתפס על טקסט שמקורו בשרת.
function isTimeoutError(error) {
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return true;
  }

  return error.name === "TimeoutError";
}

var NETWORK_ERROR_CODES = [
  "ERR_NETWORK",
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "EHOSTUNREACH",
  "EAI_AGAIN",
];

function isNetworkError(error) {
  if (NETWORK_ERROR_CODES.indexOf(error.code) !== -1) {
    return true;
  }

  // אדפטר ה-XHR של React Native מדווח על נפילת רשת בלי code.
  return error.message === "Network Error";
}

function getLoginErrorMessage(error) {
  if (!error || typeof error !== "object") {
    return MESSAGE_GENERIC;
  }

  if (error.isAuthError === true) {
    return MESSAGE_SESSION_EXPIRED;
  }

  var response = error.response;

  if (response && response.data === "PENDING_APPROVAL") {
    return MESSAGE_PENDING_APPROVAL;
  }

  if (isTimeoutError(error)) {
    return MESSAGE_TIMEOUT;
  }

  if (response) {
    if (response.status === 401) {
      return MESSAGE_INVALID_CREDENTIALS;
    }

    return MESSAGE_GENERIC;
  }

  // "הבקשה יצאה ולא חזרה תשובה" — ההגדרה של axios לכשל רשת.
  if (isNetworkError(error) || error.request) {
    return MESSAGE_NETWORK;
  }

  return MESSAGE_GENERIC;
}

export {
  MESSAGE_TIMEOUT,
  MESSAGE_NETWORK,
  MESSAGE_INVALID_CREDENTIALS,
  MESSAGE_PENDING_APPROVAL,
  MESSAGE_SESSION_EXPIRED,
  MESSAGE_GENERIC,
  LOGIN_ENDPOINT_PATH_SUFFIX,
  isLoginRequestUrl,
  getLoginErrorMessage,
};
