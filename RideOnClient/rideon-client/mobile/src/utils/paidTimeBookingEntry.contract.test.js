import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// חוזה על שתי נקודות הכניסה להזמנת פייד טיים: שתיהן חייבות לעבור דרך
// אותו שומר זמינות, ואף אחת מהן לא רשאית לפתוח זרימה שאין בה נתונים.

var SRC = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(SRC, relativePath), "utf8");
}

var SCREEN =
  "screens/roles/admin/screens/AdminCompetitionRegistrationsScreen.jsx";
var TAB = "components/competitions/CompetitionPaidTimeTab.jsx";
var MODAL = "components/competitions/paidTimeChatbot/PaidTimeChatbotModal.jsx";

describe("a single shared guard", () => {
  var screen = read(SCREEN);

  it("the screen evaluates availability from data it already loaded", () => {
    expect(screen).toContain("evaluatePaidTimeBookingAvailability");
    expect(screen).toContain("requestableSlots: paidTime.requestableSlots");
    expect(screen).toContain("priceCatalogItems: paidTime.priceCatalogItems");
  });

  it("does not fetch anything new just to decide", () => {
    // הנתונים כבר קיימים במסך דרך useAdminCompetitionPaidTimes.
    expect(screen).not.toContain("getPaidTimeCandidatesByRanch");
    expect(screen).not.toContain("loadPaidTimeChatbotContext");
  });

  it("the floating entry point is gated by the same guard", () => {
    expect(screen).toContain("paidTimeAvailability.canBookBulk ? (");
    expect(screen).toContain("<SmartBookingFab onConfirm={handleOpenSmartBooking} />");
  });

  it("the smart-open handler refuses to open when unavailable", () => {
    var handler = screen.match(
      /function handleOpenSmartBooking\(\) \{([\s\S]*?)\n  \}/,
    );

    expect(handler).toBeTruthy();
    expect(handler[1]).toContain("if (!paidTimeAvailability.canBookBulk)");
    expect(handler[1]).toContain("return;");
  });

  it("the navigation parameter no longer opens the flow before data is known", () => {
    // קודם: useState(shouldAutoOpenChatbot) - נפתח מיד, לפני כל בדיקה.
    expect(screen).not.toContain("useState(shouldAutoOpenChatbot)");
    expect(screen).toContain("var [isChatbotOpen, setIsChatbotOpen] = useState(false)");
    expect(screen).toContain("autoOpenHandledRef");
  });

  it("auto-open waits for loaded data and then checks the guard", () => {
    expect(screen).toContain("isPaidTimeDataReady");
    expect(screen).toContain("if (paidTimeAvailability.canBookBulk)");
  });
});

describe("the single-request form is guarded by the same prerequisites", () => {
  it("the screen passes availability into the paid-time tab", () => {
    expect(read(SCREEN)).toContain("availability={paidTimeAvailability}");
  });

  it("the tab shows the notice instead of a form that cannot succeed", () => {
    var tab = read(TAB);

    expect(tab).toContain("PaidTimeSetupNotice");
    expect(tab).toContain("!availability.canBookSingle");
  });

  it("does not silently fall back to anything else", () => {
    var tab = read(TAB);
    expect(tab).not.toContain("openSmartBooking");
  });
});

describe("the bulk modal guards the one prerequisite it alone can see", () => {
  var modal = read(MODAL);

  it("checks for coach/horse candidates once the context has loaded", () => {
    expect(modal).toContain("evaluateBulkCandidatesAvailability");
    expect(modal).toContain("blockedMessage");
  });

  it("shows a designed block instead of dropping into an unusable step", () => {
    expect(modal).toContain("אי אפשר להתחיל הזמנה מרוכזת");
    expect(modal).toContain("bottomBarSecondaryText");
  });
});

describe("no native Alert was introduced by the guards", () => {
  it("none of the touched entry files use Alert", () => {
    [
      SCREEN,
      TAB,
      MODAL,
      "components/competitions/PaidTimeSetupNotice.jsx",
      "components/competitions/adminPaidTimes/PaidTimeBookingModeModal.jsx",
      "components/competitions/adminPaidTimes/AddPaidTimeButton.jsx",
      "components/competitions/paidTimeChatbot/SmartBookingFab.jsx",
    ].forEach(function (file) {
      expect(read(file)).not.toContain("Alert.alert");
    });
  });
});

describe("no fake configuration is created to unblock the user", () => {
  it("the availability util has no default slot or product fallback", () => {
    var util = read("utils/paidTimeBookingAvailability.js");

    expect(util).not.toContain("paidTimeSlotInCompId:");
    expect(util).not.toContain("priceCatalogId:");
    expect(util).not.toContain("durationMinutes:");
  });
});
