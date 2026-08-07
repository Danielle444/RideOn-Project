import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// בדיקות חוזה על קוד המקור.
//
// הזרימה המרוכזת נשענת על react-native ועל axios, ולכן אי אפשר לייבא אותה
// לסביבת בדיקות של Node בלי להוסיף תלויות. במקום זה נועלים כאן את מה שאסור
// שישתנה בשלב B2: ה-payload, קריאת הבאלק, מכונת המצבים - וההיעדר המוחלט של
// Alert מערכתי בזרימה.

var SRC = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(SRC, relativePath), "utf8");
}

function listChatbotComponents() {
  var dir = path.join(SRC, "components/competitions/paidTimeChatbot");

  return fs.readdirSync(dir).filter(function (name) {
    return name.endsWith(".jsx") || name.endsWith(".js");
  });
}

var HOOK = "hooks/usePaidTimeChatbot.js";

describe("no native Alert anywhere in the smart-booking flow", () => {
  it("the entry component does not use Alert", () => {
    var source = read("components/competitions/paidTimeChatbot/SmartBookingFab.jsx");

    expect(source).not.toContain("Alert.alert");
    expect(source).not.toMatch(/\bAlert\b[^a-zA-Z]/);
  });

  it("no chatbot component imports or calls Alert", () => {
    var offenders = [];

    listChatbotComponents().forEach(function (name) {
      var source = read("components/competitions/paidTimeChatbot/" + name);

      if (source.includes("Alert.alert")) {
        offenders.push(name);
      }
    });

    expect(offenders).toEqual([]);
  });

  it("the hook and the context service do not use Alert", () => {
    expect(read(HOOK)).not.toContain("Alert.alert");
    expect(read("services/paidTimeChatbotService.js")).not.toContain("Alert.alert");
  });
});

describe("bulk payload is unchanged", () => {
  var hook = read(HOOK);

  it("still builds every item field, and only those fields", () => {
    [
      "horseId:",
      "riderFederationMemberId:",
      "coachFederationMemberId:",
      "paidByPersonId:",
      "priceCatalogId:",
      "requestedCompSlotId:",
      "notes:",
    ].forEach(function (field) {
      expect(hook).toContain(field);
    });
  });

  it("still sends the same top-level payload keys", () => {
    ["ranchId:", "competitionId:", "items:", "metadata:", "confirmedOverflow:"].forEach(
      function (key) {
        expect(hook).toContain(key);
      },
    );
  });

  it("still calls the existing bulk create service", () => {
    expect(hook).toContain("bulkCreatePaidTimeRequests");
    expect(hook).toContain(
      'import { bulkCreatePaidTimeRequests } from "../services/paidTimeRequestsService"',
    );
    expect(hook).toContain("await bulkCreatePaidTimeRequests(payload)");
  });

  it("still keeps the eligibility guards that skip an item", () => {
    // אלה התנאים שגורמים לסוס נבחר לא להיכנס ל-batch. אסור שייעלמו.
    expect(hook).toContain("if (!priceCatalog) continue;");
    expect(hook).toContain("if (!slot) continue;");
    expect(hook).toContain("if (!riderId || !payerId) continue;");
  });

  it("still inherits rider and payer from the entry lookup", () => {
    expect(hook).toContain("entry ? entry.riderFederationMemberId : null");
    expect(hook).toContain("entry ? entry.paidByPersonId : null");
  });

  it("still builds metadata with the same schema version", () => {
    expect(hook).toContain("schemaVersion: 1");
  });
});

describe("reducer and state machine are unchanged", () => {
  var hook = read(HOOK);

  it("keeps the exact step order", () => {
    var match = hook.match(/const STEPS = \[([\s\S]*?)\]/);
    expect(match).toBeTruthy();

    var steps = match[1]
      .split(",")
      .map(function (part) {
        return part.trim().replace(/["']/g, "");
      })
      .filter(Boolean);

    expect(steps).toEqual([
      "intro",
      "coaches",
      "dayArena",
      "horses",
      "timePrefs",
      "timeConstraints",
      "shortLong",
      "order",
      "spacing",
      "summary",
    ]);
  });

  it("keeps every reducer action used by the flow", () => {
    [
      "INIT_CONTEXT",
      "NEXT",
      "PREV",
      "GO_TO_STEP",
      "SET_ANSWER",
      "PATCH_ANSWERS",
      "SET_CONFIRMED_OVERFLOW",
      "SUBMIT_START",
      "SUBMIT_WARNINGS",
      "SUBMIT_SUCCESS",
      "SUBMIT_ERROR",
      "RESET",
      "RESTART",
    ].forEach(function (action) {
      expect(hook).toContain('case "' + action + '"');
    });
  });

  it("keeps back navigation non-destructive - PREV only moves the index", () => {
    var prevCase = hook.match(/case "PREV": \{([\s\S]*?)\}/)[1];

    expect(prevCase).toContain("currentStepIndex");
    // אסור ש-PREV יגע ב-answers, אחרת חזרה אחורה תמחק בחירות.
    expect(prevCase).not.toContain("answers");
    expect(prevCase).not.toContain("initialAnswers");
  });

  it("keeps RESTART as the reset used for another bulk booking", () => {
    var restartCase = hook.match(/case "RESTART":([\s\S]*?)default:/);
    expect(restartCase).toBeTruthy();
    expect(restartCase[1]).toContain("initialState");
    expect(restartCase[1]).toContain("context: state.context");
  });

  it("still surfaces server warnings instead of swallowing them", () => {
    expect(hook).toContain('dispatch({ type: "SUBMIT_WARNINGS", payload: data.warnings })');
    expect(hook).toContain("data.warnings.length > 0");
  });
});

describe("duplicate submit protection", () => {
  it("the summary step disables submit while submitting", () => {
    var summary = read("components/competitions/paidTimeChatbot/Step10_Summary.jsx");

    expect(summary).toContain("isSubmitting");
    expect(summary).toMatch(/disabled=\{[^}]*isSubmitting/);
  });

  it("the reducer flags submission before the request goes out", () => {
    var hook = read(HOOK);
    var submitStartIndex = hook.indexOf('dispatch({ type: "SUBMIT_START" })');
    var callIndex = hook.indexOf("await bulkCreatePaidTimeRequests(payload)");

    expect(submitStartIndex).toBeGreaterThan(-1);
    expect(callIndex).toBeGreaterThan(submitStartIndex);
  });
});

describe("the smart entry still opens the existing bulk flow", () => {
  it("the registrations screen renders the unchanged chatbot modal", () => {
    var screen = read("screens/roles/admin/screens/AdminCompetitionRegistrationsScreen.jsx");

    expect(screen).toContain("PaidTimeChatbotModal");
    expect(screen).toContain("SmartBookingFab");
    expect(screen).toContain("setIsChatbotOpen(true)");
  });

  // CAP-4 (Admin Paid-Time Unify, 2026-08-07): AddPaidTimeButton no longer
  // navigates away or offers a single/bulk chooser - it mounts
  // PaidTimeCreateModal in place with a wider (payerSource="managed") payer
  // selector. This is a deliberate contract change to THIS button only; the
  // bulk/chatbot flow itself is untouched and still reachable from the
  // AdminCompetitionRegistrations screen's own SmartBookingFab, asserted
  // above and in the modal check below.
  it("the single-request entry mounts the in-place form, not the old navigate-away flow", () => {
    var button = read("components/competitions/adminPaidTimes/AddPaidTimeButton.jsx");

    expect(button).toContain("PaidTimeCreateModal");
    expect(button).toContain('payerSource="managed"');
    expect(button).not.toContain("openSmartBooking");
    expect(button).not.toContain("AdminCompetitionRegistrations");
  });

  it("the modal still drives the flow through usePaidTimeChatbot", () => {
    var modal = read("components/competitions/paidTimeChatbot/PaidTimeChatbotModal.jsx");

    expect(modal).toContain("usePaidTimeChatbot");
    expect(modal).toContain("loadPaidTimeChatbotContext");
  });
});
