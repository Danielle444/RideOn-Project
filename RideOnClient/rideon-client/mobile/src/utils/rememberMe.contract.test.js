import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";

// AsyncStorage הוא מודול נייטיבי ואי אפשר לטעון אותו ב-Node, ולכן הוא מוחלף
// כאן במימוש זיכרון שמתעד את הקריאות. כך storageService.js עצמו נטען ונבדק
// באמת, ולא רק כטקסט.
var mockAsyncStorage = vi.hoisted(function () {
  var store = new Map();
  var calls = { setItem: [], multiRemove: [], removeItem: [] };
  var failNextGet = { value: false };

  return {
    store: store,
    calls: calls,
    failNextGet: failNextGet,
    reset: function () {
      store.clear();
      calls.setItem = [];
      calls.multiRemove = [];
      calls.removeItem = [];
      failNextGet.value = false;
    },
    api: {
      setItem: async function (key, value) {
        calls.setItem.push([key, value]);
        store.set(key, value);
      },
      getItem: async function (key) {
        if (failNextGet.value) {
          throw new Error("AsyncStorage unavailable");
        }

        return store.has(key) ? store.get(key) : null;
      },
      removeItem: async function (key) {
        calls.removeItem.push(key);
        store.delete(key);
      },
      multiRemove: async function (keys) {
        calls.multiRemove.push(keys.slice());
        keys.forEach(function (key) {
          store.delete(key);
        });
      },
    },
  };
});

vi.mock("@react-native-async-storage/async-storage", function () {
  return { default: mockAsyncStorage.api };
});

import {
  saveRememberMe,
  getRememberMe,
  removeRememberMe,
  saveToken,
  saveUser,
  saveActiveRole,
  saveActiveCompetition,
  clearAuthStorage,
} from "../services/storageService.js";

var TOKEN_KEY = "rideon_token";
var USER_KEY = "rideon_user";
var ACTIVE_ROLE_KEY = "rideon_active_role";
var ACTIVE_COMPETITION_KEY = "rideon_active_competition";
var REMEMBER_ME_KEY = "rideon_remember_me";

beforeEach(function () {
  mockAsyncStorage.reset();
});

describe("clearAuthStorage מנקה סשן בלבד", () => {
  it("1. מסיר טוקן, משתמש, תפקיד פעיל ותחרות פעילה", async () => {
    await saveToken("header.payload.signature");
    await saveUser({ personId: 7 });
    await saveActiveRole({ roleName: "משלם", ranchId: 1 });
    await saveActiveCompetition({ competitionId: 3 });

    await clearAuthStorage();

    expect(mockAsyncStorage.store.has(TOKEN_KEY)).toBe(false);
    expect(mockAsyncStorage.store.has(USER_KEY)).toBe(false);
    expect(mockAsyncStorage.store.has(ACTIVE_ROLE_KEY)).toBe(false);
    expect(mockAsyncStorage.store.has(ACTIVE_COMPETITION_KEY)).toBe(false);

    // עדיין קריאה אטומית אחת, בדיוק כפי שהיה.
    expect(mockAsyncStorage.calls.multiRemove.length).toBe(1);

    var removed = mockAsyncStorage.calls.multiRemove[0];
    expect(removed).toEqual([
      TOKEN_KEY,
      USER_KEY,
      ACTIVE_ROLE_KEY,
      ACTIVE_COMPETITION_KEY,
    ]);
  });

  it("2. אינו מסיר את העדפת זכור אותי", async () => {
    await saveRememberMe(true);
    await saveToken("header.payload.signature");

    await clearAuthStorage();

    // זו הנקודה שבה התיקון נשבר בקלות: אם המפתח יחזור למערך, ההעדפה תימחק
    // בכל התנתקות, בכל 401 ובכל טוקן שפג.
    expect(mockAsyncStorage.calls.multiRemove[0]).not.toContain(
      REMEMBER_ME_KEY,
    );
    expect(mockAsyncStorage.store.get(REMEMBER_ME_KEY)).toBe("true");
    expect(await getRememberMe()).toBe(true);
  });

  it("removeRememberMe עדיין מוחק במפורש כשקוראים לו", async () => {
    await saveRememberMe(true);
    await removeRememberMe();

    expect(mockAsyncStorage.store.has(REMEMBER_ME_KEY)).toBe(false);
    expect(await getRememberMe()).toBe(false);
  });
});

describe("קריאת ההעדפה מהאחסון", () => {
  it("7. ערך שמור true מוחזר כ-true", async () => {
    await saveRememberMe(true);

    expect(mockAsyncStorage.store.get(REMEMBER_ME_KEY)).toBe("true");
    expect(await getRememberMe()).toBe(true);
  });

  it("8. ערך שמור false מוחזר כ-false", async () => {
    await saveRememberMe(false);

    expect(mockAsyncStorage.store.get(REMEMBER_ME_KEY)).toBe("false");
    expect(await getRememberMe()).toBe(false);
  });

  it("8ב. היעדר מפתח לגמרי מוחזר כ-false", async () => {
    expect(await getRememberMe()).toBe(false);
  });

  it("9. כשל בקריאת האחסון נזרק, והמסך חייב ליפול חזרה ל-false", async () => {
    mockAsyncStorage.failNextGet.value = true;

    // getRememberMe עצמו אינו בולע כשל של AsyncStorage — הנפילה הסגורה
    // נמצאת ב-LoginScreen, וזה בדיוק מה שהחוזה למטה נועל.
    await expect(getRememberMe()).rejects.toThrow();
  });
});

describe("14. סיסמה לעולם אינה נכתבת לאחסון", () => {
  it("אף פונקציית שמירה אינה כותבת שדה סיסמה", async () => {
    await saveRememberMe(true);
    await saveToken("header.payload.signature");
    // אובייקט המשתמש האמיתי, על כל שדותיו — כולל mustChangePassword, שהוא
    // דגל בוליאני ולא סיסמה. גבול המילה הוא מה שמפריד ביניהם.
    await saveUser({
      personId: 7,
      username: "danielle",
      firstName: "ד",
      lastName: "ק",
      isActive: true,
      mustChangePassword: false,
      approvedRolesAndRanches: [{ roleName: "משלם", ranchId: 1 }],
    });
    await saveActiveRole({ roleName: "משלם", ranchId: 1 });
    await saveActiveCompetition({ competitionId: 3 });

    mockAsyncStorage.calls.setItem.forEach(function (entry) {
      expect(entry[0]).not.toMatch(/\bpassword\b|סיסמ/i);
      expect(String(entry[1])).not.toMatch(/\bpassword\b|סיסמ/i);
    });
  });
});

// ---------------------------------------------------------------------------
// חוזה על הקבצים עצמם. אין בפרויקט מרנדר לרכיבי React Native, ואי אפשר
// לטעון כאן את AuthContext.js, axiosInstance.js או LoginScreen.jsx — הם
// מושכים ניווט ורכיבים נייטיביים. לכן ההחלטות ננעלות בקוד, בדיוק כפי שכבר
// נעשה ב-loginErrors.test.js וב-paidTimeSafeArea.contract.test.js.
// ---------------------------------------------------------------------------
var SRC = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(SRC, relativePath), "utf8");
}

describe("חוזה: הסשן עדיין נסגר בכל מסלול", () => {
  it("3. התנתקות עדיין מנקה אחסון, תפקיד ומצב", () => {
    var context = read("context/AuthContext.js");
    var logout = context.slice(context.indexOf("async function logout()"));

    expect(logout).toContain("await clearAuthStorage();");
    expect(logout).toContain("await clearActiveRole();");
    expect(logout).toContain("await resetAuthState();");
  });

  it("4. 401 מנקודת קצה מאומתת עדיין מנקה אחסון", () => {
    var instance = read("services/axiosInstance.js");

    expect(instance).toContain("await clearAuthStorage();");
    expect(instance).toContain("await unauthorizedHandler();");
    expect(instance).toContain("Promise.reject({ isAuthError: true })");

    // הפטור להתחברות חייב להישאר לפני הניקוי.
    var exemption = instance.indexOf("isLoginRequestUrl(error.config");
    var clear = instance.indexOf("await clearAuthStorage()", exemption);
    expect(exemption).toBeGreaterThan(-1);
    expect(clear).toBeGreaterThan(exemption);
  });

  it("5. אתחול עם טוקן לא תקין עדיין מנקה את הסשן", () => {
    var context = read("context/AuthContext.js");
    var load = context.slice(
      context.indexOf("async function loadAuthState()"),
      context.indexOf("async function login("),
    );

    // בדיקת התוקף לא נחלשה.
    expect(load).toContain("const tokenIsValid = isTokenValid(token);");
    expect(load).toContain("if (!tokenIsValid || !storedUser) {");

    // ההעדפה עדיין נקראת ראשונה וחוסמת שחזור.
    expect(load).toContain("const rememberMe = await getRememberMe();");
    expect(load).toContain("if (!rememberMe) {");

    // שלושת מסלולי הכשל מנקים.
    var clears = load.match(/await clearAuthStorage\(\);/g) || [];
    expect(clears.length).toBe(3);
  });
});

describe("חוזה: מסך ההתחברות מאתחל מההעדפה השמורה", () => {
  it("6. LoginScreen מייבא וקורא ל-getRememberMe באתחול", () => {
    var screen = read("screens/auth/LoginScreen.jsx");

    expect(screen).toContain(
      'import { getRememberMe } from "../../services/storageService";',
    );
    expect(screen).toContain("await getRememberMe()");
    expect(screen).toContain("useEffect(function () {");
    expect(screen).toContain("loadStoredRememberMe();");

    // אפקט חד-פעמי בלבד.
    expect(screen).toContain("}, []);");
  });

  it("9ב. כשל בקריאה מותיר את התיבה לא מסומנת", () => {
    var screen = read("screens/auth/LoginScreen.jsx");
    var effect = screen.slice(
      screen.indexOf("async function loadStoredRememberMe()"),
      screen.indexOf("async function handleLogin()"),
    );

    expect(effect).toContain("let storedRememberMe = false;");
    expect(effect).toContain("} catch (error) {");
    expect(effect).toContain("storedRememberMe = false;");
    // השוואה מפורשת: כל ערך שאינו true אמיתי מותיר את התיבה ריקה.
    expect(effect).toContain("setRememberMe(storedRememberMe === true);");
  });

  it("10. תוצאה מאוחרת מהאחסון אינה דורסת בחירה ידנית", () => {
    var screen = read("screens/auth/LoginScreen.jsx");

    // שומר הבחירה הידנית קיים, נדלק בלחיצה, ונבדק לפני העדכון.
    expect(screen).toContain(
      "const hasToggledRememberMeRef = useRef(false);",
    );
    expect(screen).toContain("hasToggledRememberMeRef.current = true;");
    expect(screen).toContain(
      "if (!isMounted || hasToggledRememberMeRef.current) {",
    );

    var guard = screen.indexOf("hasToggledRememberMeRef.current) {");
    var apply = screen.indexOf("setRememberMe(storedRememberMe === true);");

    // השומר חייב להקדים את העדכון, אחרת הוא חסר משמעות.
    expect(guard).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(guard);

    // ניקוי בעת פירוק המסך.
    expect(screen).toContain("isMounted = false;");
  });

  it("10ב. מודל השומר: בחירה ידנית גוברת על תוצאה שחוזרת אחריה", () => {
    // הרצה אמיתית של אותה זרימת החלטה, בלי מרנדר: קריאה איטית שמסתיימת
    // אחרי שהמשתמש כבר סימן.
    var rememberMe = false;
    var hasToggled = { current: false };
    var isMounted = true;

    function setRememberMe(next) {
      rememberMe = next;
    }

    var slowRead = new Promise(function (resolve) {
      setTimeout(function () {
        resolve(false);
      }, 0);
    });

    // המשתמש מסמן לפני שהקריאה חזרה.
    hasToggled.current = true;
    setRememberMe(true);

    return slowRead.then(function (storedRememberMe) {
      if (!isMounted || hasToggled.current) {
        return;
      }

      setRememberMe(storedRememberMe === true);
    }).then(function () {
      expect(rememberMe).toBe(true);
    });
  });
});

describe("חוזה: ההעדפה נשמרת רק בהתחברות מוצלחת", () => {
  it("11. saveRememberMe מופיע פעם אחת בלבד, במסלול ההצלחה", () => {
    var context = read("context/AuthContext.js");

    var occurrences = context.match(/await saveRememberMe\(/g) || [];
    expect(occurrences.length).toBe(1);

    var login = context.indexOf("async function loginAndInitialize(");
    var save = context.indexOf("await saveRememberMe(!!rememberMe);");
    var request = context.indexOf("await loginRequest(username.trim(), password)");
    var catchBlock = context.indexOf("} catch (err) {", login);

    // אחרי הבקשה, ולפני ה-catch — כלומר לא בכשל.
    expect(save).toBeGreaterThan(request);
    expect(save).toBeLessThan(catchBlock);
  });

  it("12+13. removeRememberMe אינו נקרא בהתנתקות, בכשל התחברות או ב-401", () => {
    var context = read("context/AuthContext.js");
    var instance = read("services/axiosInstance.js");
    var screen = read("screens/auth/LoginScreen.jsx");

    expect(context).not.toContain("removeRememberMe");
    expect(instance).not.toContain("removeRememberMe");
    expect(screen).not.toContain("removeRememberMe");
  });

  it("ההעדפה אינה נשמרת בלחיצה על התיבה", () => {
    var screen = read("screens/auth/LoginScreen.jsx");

    // המסך אינו מייבא כותב כלשהו — רק קורא.
    expect(screen).not.toContain("saveRememberMe");
  });

  it("14ב. הסיסמה אינה נשמרת ואינה נכנסת לאובייקט המשתמש", () => {
    var context = read("context/AuthContext.js");
    var storage = read("services/storageService.js");

    var userData = context.slice(
      context.indexOf("const userData = {"),
      context.indexOf("await saveRememberMe(!!rememberMe);"),
    );

    // גבול מילה: mustChangePassword הוא דגל מותר, שדה password אינו.
    expect(userData).not.toMatch(/\bpassword\b/i);
    expect(storage).not.toMatch(/\bpassword\b/i);
  });
});

describe("15. חוזה סדר ההתחברות המוצלחת לא השתנה", () => {
  it("הסדר הקיים נשמר מילה במילה", () => {
    var context = read("context/AuthContext.js");

    // זהה לחוזה שכבר קיים ב-loginErrors.test.js. הוא מועתק לכאן כדי
    // שהתיקון הזה ייכשל מיד אם הוא יזיז את הסדר.
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
  });
});
