import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  MESSAGE_TIMEOUT,
  MESSAGE_NETWORK,
  MESSAGE_INVALID_CREDENTIALS,
  MESSAGE_PENDING_APPROVAL,
  MESSAGE_SESSION_EXPIRED,
  MESSAGE_GENERIC,
  isLoginRequestUrl,
  getLoginErrorMessage,
} from "./loginErrors.js";

var API_BASE_URL = "https://rideon-project-ad4g.onrender.com/api";
var LOGIN_URL = API_BASE_URL + "/SystemUsers/login";

// צורת השגיאות כאן אינה מומצאת: היא נלקחה מ-axios 1.15.2 שמותקן בפרויקט.
// פסק זמן מחזיר code=ECONNABORTED בלי response, וזו בדיוק הצורה שנבדקה.
function timeoutError(ms) {
  return {
    code: "ECONNABORTED",
    message: "timeout of " + ms + "ms exceeded",
    name: "AxiosError",
    config: { url: LOGIN_URL, baseURL: API_BASE_URL },
    request: {},
  };
}

function responseError(status, data) {
  return {
    code: "ERR_BAD_REQUEST",
    message: "Request failed with status code " + status,
    name: "AxiosError",
    config: { url: LOGIN_URL, baseURL: API_BASE_URL },
    request: {},
    response: { status: status, data: data },
  };
}

describe("getLoginErrorMessage", () => {
  it("1. ECONNABORTED מחזיר את הודעת פסק הזמן", () => {
    expect(getLoginErrorMessage(timeoutError(30000))).toBe(MESSAGE_TIMEOUT);
  });

  it("2. פסק זמן בלי response מחזיר פסק זמן ולא הודעת רשת", () => {
    var error = timeoutError(30000);

    expect(error.response).toBeUndefined();
    // זו הנקודה שבה סדר הבדיקות נשבר בקלות: לפסק זמן אין response, ולכן
    // בדיקת "אין תשובה" הייתה בולעת אותו אם הייתה רצה קודם.
    expect(getLoginErrorMessage(error)).toBe(MESSAGE_TIMEOUT);
    expect(getLoginErrorMessage(error)).not.toBe(MESSAGE_NETWORK);

    // גם ETIMEDOUT ו-TimeoutError נחשבים פסק זמן.
    expect(getLoginErrorMessage({ code: "ETIMEDOUT" })).toBe(MESSAGE_TIMEOUT);
    expect(getLoginErrorMessage({ name: "TimeoutError" })).toBe(
      MESSAGE_TIMEOUT,
    );
  });

  it("3. כשל רשת בלי response מחזיר את הודעת הרשת", () => {
    expect(
      getLoginErrorMessage({ code: "ERR_NETWORK", message: "Network Error" }),
    ).toBe(MESSAGE_NETWORK);

    // אדפטר ה-XHR של React Native לא תמיד מוסיף code.
    expect(getLoginErrorMessage({ message: "Network Error" })).toBe(
      MESSAGE_NETWORK,
    );

    // בקשה שיצאה ולא חזרה עליה תשובה.
    expect(getLoginErrorMessage({ request: {} })).toBe(MESSAGE_NETWORK);
  });

  it("4. HTTP 401 מחזיר פרטי התחברות שגויים", () => {
    expect(
      getLoginErrorMessage(
        responseError(401, "Invalid username, password, or no approved role"),
      ),
    ).toBe(MESSAGE_INVALID_CREDENTIALS);
  });

  it("5. PENDING_APPROVAL משמר את ההודעה הקיימת", () => {
    // השרת מחזיר את זה כ-400 עם הגוף המוכר, ולכן הוא חייב להיבדק לפני
    // הנפילה הגנרית של 400.
    expect(getLoginErrorMessage(responseError(400, "PENDING_APPROVAL"))).toBe(
      MESSAGE_PENDING_APPROVAL,
    );
    expect(MESSAGE_PENDING_APPROVAL).toBe("חשבונך ממתין לאישור מנהל המערכת");
  });

  it("6. 400/500 לא מוכר מחזיר את ההודעה הגנרית", () => {
    expect(getLoginErrorMessage(responseError(400, "אירעה שגיאה בהתחברות"))).toBe(
      MESSAGE_GENERIC,
    );
    expect(getLoginErrorMessage(responseError(500, "Internal Server Error"))).toBe(
      MESSAGE_GENERIC,
    );
    expect(getLoginErrorMessage(responseError(403, "Forbidden"))).toBe(
      MESSAGE_GENERIC,
    );
  });

  it("7. טקסט גולמי של שרת, DB או חיבור לעולם לא מוחזר", () => {
    var leaky = [
      responseError(
        500,
        'Npgsql.PostgresException: 42703: column "productid" does not exist',
      ),
      responseError(500, "Host=db.sxplumrexbolpwqacpiz.supabase.co;Port=5432"),
      responseError(400, { stack: "at SystemUsersController.Login(...)" }),
      {
        message:
          "connect ECONNREFUSED https://rideon-project-ad4g.onrender.com/api",
        code: "ECONNREFUSED",
      },
    ];

    var allowed = [
      MESSAGE_TIMEOUT,
      MESSAGE_NETWORK,
      MESSAGE_INVALID_CREDENTIALS,
      MESSAGE_PENDING_APPROVAL,
      MESSAGE_SESSION_EXPIRED,
      MESSAGE_GENERIC,
    ];

    leaky.forEach(function (error) {
      var message = getLoginErrorMessage(error);

      expect(allowed).toContain(message);
      expect(message).not.toMatch(/Npgsql|Postgres|column|Host=|Port=|at /);
      expect(message).not.toMatch(/https?:\/\//);
      expect(message).not.toMatch(/onrender|supabase/);
    });
  });

  it("8. null / undefined / שגיאה ריקה מחזירים את ההודעה הגנרית", () => {
    expect(getLoginErrorMessage(null)).toBe(MESSAGE_GENERIC);
    expect(getLoginErrorMessage(undefined)).toBe(MESSAGE_GENERIC);
    expect(getLoginErrorMessage({})).toBe(MESSAGE_GENERIC);
    expect(getLoginErrorMessage("boom")).toBe(MESSAGE_GENERIC);
    expect(getLoginErrorMessage(0)).toBe(MESSAGE_GENERIC);
  });

  it("סשן מאומת שפג משמר את ההודעה הקיימת", () => {
    // האובייקט הסינתטי שהאינטרספטור הגלובלי עדיין מייצר עבור נקודות קצה
    // מאומתות.
    expect(getLoginErrorMessage({ isAuthError: true })).toBe(
      MESSAGE_SESSION_EXPIRED,
    );
  });
});

describe("isLoginRequestUrl", () => {
  it("מזהה את כתובת ההתחברות בדיוק כפי ש-axios מוסר אותה", () => {
    // אומת מול axios 1.15.2: כשה-url מוחלט, config.url הוא הכתובת המלאה
    // ו-baseURL עדיין קיים בנפרד.
    expect(isLoginRequestUrl(LOGIN_URL, API_BASE_URL)).toBe(true);
  });

  it("מזהה גם url יחסי מול baseURL, ובכל אות", () => {
    expect(isLoginRequestUrl("/SystemUsers/login", API_BASE_URL)).toBe(true);
    expect(isLoginRequestUrl("SystemUsers/login", API_BASE_URL)).toBe(true);
    expect(isLoginRequestUrl(LOGIN_URL + "/", API_BASE_URL)).toBe(true);
    expect(isLoginRequestUrl(LOGIN_URL + "?x=1", API_BASE_URL)).toBe(true);
    expect(isLoginRequestUrl("/systemusers/login", API_BASE_URL)).toBe(true);
    // שרת מקומי — הפטור לא תלוי בשם המארח.
    expect(isLoginRequestUrl("http://192.168.1.20:5268/api/SystemUsers/login"))
      .toBe(true);
  });

  it("לא פותח פטור לנקודות קצה אחרות", () => {
    // זו הנקודה שבה בדיקת substring רופפת הייתה נכשלת.
    expect(isLoginRequestUrl(API_BASE_URL + "/SuperUsers/login")).toBe(false);
    expect(isLoginRequestUrl(API_BASE_URL + "/SystemUsers/login-history")).toBe(
      false,
    );
    expect(isLoginRequestUrl(API_BASE_URL + "/SystemUsers/logout")).toBe(false);
    expect(isLoginRequestUrl(API_BASE_URL + "/SystemUsers/profile-settings"))
      .toBe(false);
    expect(isLoginRequestUrl(API_BASE_URL + "/XSystemUsers/login")).toBe(false);
    expect(isLoginRequestUrl(API_BASE_URL + "/Competitions")).toBe(false);
  });

  it("בלי url נופלים לטיפול ה-401 הרגיל", () => {
    expect(isLoginRequestUrl(undefined, undefined)).toBe(false);
    expect(isLoginRequestUrl(null, API_BASE_URL)).toBe(false);
    expect(isLoginRequestUrl("", API_BASE_URL)).toBe(false);
  });
});

// חוזה על הקבצים עצמם. אי אפשר לטעון כאן את axiosInstance.js או את
// authService.js בסביבת Node — הם מושכים את AsyncStorage הנייטיבי — ולכן
// נועלים את ההחלטות בקוד כפי שנעשה כבר ב-paidTimeSafeArea.contract.test.js.
var SRC = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(SRC, relativePath), "utf8");
}

describe("חוזה פסק הזמן והפטור מ-401", () => {
  it("פסק הזמן של ההתחברות הוא 30000", () => {
    var service = read("services/authService.js");

    expect(service).toContain("const LOGIN_TIMEOUT_MS = 30000;");
    expect(service).toMatch(/timeout: LOGIN_TIMEOUT_MS/);
  });

  it("פסק הזמן הגלובלי לא השתנה, ושאר הבקשות לא נגעו", () => {
    var instance = read("services/axiosInstance.js");
    var service = read("services/authService.js");

    expect(instance).toContain("timeout: 8000");

    // כל שאר הקריאות ב-authService נשארו על 8000: שבע קריאות, ורק
    // ההתחברות עברה לקבוע.
    var remaining = service.match(/timeout: 8000/g) || [];
    expect(remaining.length).toBe(7);
  });

  it("401 מההתחברות מוחזר כמו שהוא, לפני ניקוי מצב האימות", () => {
    var instance = read("services/axiosInstance.js");

    expect(instance).toContain(
      "isLoginRequestUrl(error.config?.url, error.config?.baseURL)",
    );

    var exemption = instance.indexOf("isLoginRequestUrl(error.config");
    var clear = instance.indexOf("await clearAuthStorage()", exemption);
    var handler = instance.indexOf("unauthorizedHandler()", exemption);

    expect(exemption).toBeGreaterThan(-1);
    // הפטור חייב להקדים את שניהם, אחרת הוא חסר משמעות.
    expect(clear).toBeGreaterThan(exemption);
    expect(handler).toBeGreaterThan(exemption);
  });

  it("401 מנקודת קצה מאומתת עדיין עובר את הזרימה הגלובלית", () => {
    var instance = read("services/axiosInstance.js");

    // הזרימה הקיימת נשמרה במלואה: ניקוי אחסון, קריאה למטפל, ודחייה עם
    // isAuthError.
    expect(instance).toContain("await clearAuthStorage();");
    expect(instance).toContain("await unauthorizedHandler();");
    expect(instance).toContain("Promise.reject({ isAuthError: true })");
    expect(instance).toContain('typeof unauthorizedHandler === "function"');
  });

  it("הצלחה, אחסון וסדר מצב האימות לא נגעו", () => {
    var context = read("context/AuthContext.js");

    // הסדר הזה הוא מה שמונע רינדור שבו יש טוקן ואין משתמש.
    var order = [
      "await clearAuthStorage();",
      "await loginRequest(username.trim(), password)",
      "await saveRememberMe(!!rememberMe);",
      "await saveToken(data.token);",
      "await saveUser(userData);",
      "setUser(userData);",
      "setActiveRole(null);",
      "setIsAuthenticated(true);",
      "setIsUserHydrated(true);",
    ];

    var cursor = -1;

    order.forEach(function (marker) {
      var found = context.indexOf(marker, cursor + 1);
      expect(found).toBeGreaterThan(cursor);
      cursor = found;
    });

    // סשן שפג עדיין מנתק.
    expect(context).toContain("if (err && err.isAuthError) {");
    expect(context).toContain("await logout();");
    expect(context).toContain("message: getLoginErrorMessage(err),");
  });
});
