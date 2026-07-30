import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// חוזה על טיפול ה-safe area של מודל ההזמנה המרוכזת.
// אי אפשר לרנדר react-native בסביבת Node בלי תלויות חדשות, ולכן נועלים
// כאן את המנגנון עצמו: אותה ספרייה שכבר בשימוש באפליקציה, בלי ערכים
// קשיחים ספציפיים לאייפון.

var SRC = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(SRC, relativePath), "utf8");
}

var MODAL = "components/competitions/paidTimeChatbot/PaidTimeChatbotModal.jsx";
var NAV_BAR = "components/competitions/paidTimeChatbot/StepNavBar.jsx";

describe("the app-wide safe-area mechanism is reused, not reinvented", () => {
  it("the app root still provides SafeAreaProvider", () => {
    var app = fs.readFileSync(path.resolve(SRC, "..", "App.js"), "utf8");

    expect(app).toContain(
      'import { SafeAreaProvider } from "react-native-safe-area-context"',
    );
    expect(app).toContain("<SafeAreaProvider>");
  });

  it("the modal uses react-native-safe-area-context, not the react-native SafeAreaView", () => {
    var modal = read(MODAL);

    expect(modal).toContain(
      'import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context"',
    );
    // ה-SafeAreaView של react-native לא מטפל ב-insets באנדרואיד ואינו הדפוס
    // של הפרויקט עבור המסכים האלה.
    expect(modal).not.toMatch(/SafeAreaView[^\n]*from "react-native"/);
  });

  it("a fullScreen modal re-provides the safe area inside itself", () => {
    var modal = read(MODAL);

    expect(modal).toContain('presentationStyle="fullScreen"');
    // בלי Provider משלו ה-insets בתוך מודל fullScreen יוצאים 0.
    expect(modal).toContain("<SafeAreaProvider>");

    var providerIndex = modal.indexOf("<SafeAreaProvider>");
    var modalIndex = modal.indexOf("<Modal");
    expect(providerIndex).toBeGreaterThan(modalIndex);
  });
});

describe("top inset", () => {
  it("the modal root applies the top edge", () => {
    var modal = read(MODAL);
    var match = modal.match(/<SafeAreaView[\s\S]*?edges=\{\[([^\]]*)\]\}/);

    expect(match).toBeTruthy();
    expect(match[1]).toContain('"top"');
  });
});

describe("bottom inset", () => {
  it("the modal root does NOT claim the bottom edge - the footer owns it", () => {
    var modal = read(MODAL);
    var match = modal.match(/<SafeAreaView[\s\S]*?edges=\{\[([^\]]*)\]\}/);

    // אחרת היה נוצר ריפוד כפול מתחת לסרגל התחתון.
    expect(match[1]).not.toContain('"bottom"');
  });

  it("the footer derives its bottom padding from the device inset", () => {
    var navBar = read(NAV_BAR);

    expect(navBar).toContain(
      'import { useSafeAreaInsets } from "react-native-safe-area-context"',
    );
    expect(navBar).toContain("useSafeAreaInsets()");
    expect(navBar).toContain("Math.max(insets.bottom");
  });

  it("follows the same pattern as the existing bottom navigation", () => {
    var navBar = read(NAV_BAR);
    var existing = read("components/mobile-nav/MobileBottomNav.jsx");

    expect(existing).toContain("Math.max(insets.bottom");
    expect(navBar).toContain("paddingBottom: Math.max(insets.bottom");
  });
});

describe("no hard-coded device offsets", () => {
  it("neither file hard-codes iPhone notch or home-indicator pixel values", () => {
    [MODAL, NAV_BAR].forEach(function (file) {
      var source = read(file);

      // 44 / 47 / 34 / 20 הם הערכים הקשיחים הנפוצים של notch ופס הבית.
      expect(source).not.toMatch(/padding(Top|Bottom):\s*(44|47|34|20)\b/);
      expect(source).not.toMatch(/(top|bottom):\s*(44|47|34)\b/);
      expect(source).not.toContain("StatusBar.currentHeight");
    });
  });

  it("does not branch layout on iOS-only device checks for the insets", () => {
    var navBar = read(NAV_BAR);

    expect(navBar).not.toContain("Platform.OS === \"ios\" ? 34");
    expect(navBar).not.toContain("isIphoneX");
  });
});

describe("footer never covers the scrolling content", () => {
  it("the footer is a flex sibling of the scroll view, not an absolute overlay", () => {
    var modal = read(MODAL);
    var styles = read("styles/paidTimeChatbotStyles.js");

    // אילו הסרגל היה position:absolute, התוכן היה נגלל מתחתיו.
    var bottomBarBlock = styles.match(/bottomBar:\s*\{([\s\S]*?)\n  \}/);
    expect(bottomBarBlock).toBeTruthy();
    expect(bottomBarBlock[1]).not.toContain("position");

    // ה-ScrollView תופס את השאר, ולכן הסרגל תמיד מתחתיו.
    expect(modal).toMatch(/<ScrollView[\s\S]*?style=\{\{ flex: 1 \}\}/);

    var scrollIndex = modal.indexOf("<ScrollView");
    var navIndex = modal.indexOf("<StepNavBar");
    expect(navIndex).toBeGreaterThan(scrollIndex);
  });

  it("the scroll content keeps padding at its end", () => {
    var styles = read("styles/paidTimeChatbotStyles.js");
    var block = styles.match(/scrollContent:\s*\{([\s\S]*?)\n  \}/);

    expect(block).toBeTruthy();
    expect(block[1]).toContain("paddingBottom");
  });
});

describe("keyboard handling", () => {
  it("the footer sits inside the keyboard-avoiding container", () => {
    var modal = read(MODAL);

    expect(modal).toContain("KeyboardAvoidingView");

    var kavIndex = modal.indexOf("<KeyboardAvoidingView");
    var kavCloseIndex = modal.indexOf("</KeyboardAvoidingView>");
    var navIndex = modal.indexOf("<StepNavBar");

    expect(navIndex).toBeGreaterThan(kavIndex);
    expect(navIndex).toBeLessThan(kavCloseIndex);
  });

  it("taps still register while the keyboard is open", () => {
    var modal = read(MODAL);
    expect(modal).toContain('keyboardShouldPersistTaps="handled"');
  });
});
