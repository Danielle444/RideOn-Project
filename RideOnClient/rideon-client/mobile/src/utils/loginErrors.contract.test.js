import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// חוזה על הקבצים עצמם. אי אפשר לטעון כאן את axiosInstance.js או את
// authService.js בסביבת Node — הם מושכים את AsyncStorage הנייטיבי — ולכן
// נועלים את ההחלטות בקוד כפי שנעשה כבר ב-paidTimeSafeArea.contract.test.js.
//
// המימוש הטהור של getLoginErrorMessage/isLoginRequestUrl עבר ל-
// shared/auth/utils/loginErrorMessages.js (ביקורת ההתראות של RideOn,
// 2026-08-07) כדי שגם הווב ישתמש בו למסך ההתחברות; הבדיקות הטהורות עליו
// עברו יחד איתו ל-shared/auth/utils/loginErrorMessages.test.js. הקובץ הזה
// נשאר במובייל כי הוא בודק את הקבצים המקומיים של המובייל בלבד.
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
    expect(instance).toContain(
      'from "../../../shared/auth/utils/loginErrorMessages"',
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
    expect(context).toContain(
      'from "../../../shared/auth/utils/loginErrorMessages"',
    );
  });
});
