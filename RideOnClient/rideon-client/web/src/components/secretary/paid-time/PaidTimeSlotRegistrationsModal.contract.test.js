import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the secretary's slot-registrations modal.
//
// This repo has no DOM test environment and no React Testing Library (see the web
// package.json devDependencies), and this file deliberately does not add one. A
// component that returns JSX cannot be rendered here, and unlike the sibling hook
// tests it cannot be reached by stubbing react either, because its transfer and
// unassign handlers are local closures rather than a hook's return value.
//
// What CAN be asserted without a renderer is the contract that the fix
// establishes, and these are exactly the properties that would silently regress:
//
//   1. no browser alert() survives anywhere in the modal;
//   2. failures go through the page's shared toast, with the approved Hebrew
//      fallbacks, resolved by the existing getErrorMessage helper;
//   3. the "שבץ כאן" action passes its target slot id directly to the transfer
//      handler instead of writing it to state and reading it back on a timer;
//   4. the parent actually supplies onShowToast.
//
// Behavioural coverage (a real failing request producing a real visible toast) is
// covered by the backend resolver tests plus the manual smoke checklist.

const MODAL_PATH = new URL(
  "./PaidTimeSlotRegistrationsModal.jsx",
  import.meta.url,
);

const PAGE_PATH = new URL(
  "../../../pages/secretary/CompetitionPaidTimePage.jsx",
  import.meta.url,
);

const modalSource = readFileSync(MODAL_PATH, "utf8");
const pageSource = readFileSync(PAGE_PATH, "utf8");

describe("PaidTimeSlotRegistrationsModal error surfacing contract", () => {
  it("contains no alert() call", () => {
    // Matches alert(...) and window.alert(...) as a call, but not the word
    // "alert" inside an identifier such as alertTitle or handleAlerts.
    const alertCall = /(?<![A-Za-z0-9_$.])(?:window\s*\.\s*)?alert\s*\(/;

    expect(modalSource).not.toMatch(alertCall);
  });

  it("uses no other blocking browser dialog", () => {
    expect(modalSource).not.toMatch(/(?<![A-Za-z0-9_$.])confirm\s*\(/);
    expect(modalSource).not.toMatch(/(?<![A-Za-z0-9_$.])prompt\s*\(/);
  });

  it("imports the shared getErrorMessage helper", () => {
    expect(modalSource).toContain(
      'import { getErrorMessage } from "../../../utils/competitionForm.utils";',
    );
  });

  it("reads onShowToast from props", () => {
    expect(modalSource).toContain("var onShowToast = props.onShowToast;");
  });

  it("routes every failure through onShowToast with the error type", () => {
    const toastCalls = modalSource.match(/onShowToast\?\.\(\s*"error"/g) || [];

    // transfer failure, modal-unassign failure, missing-target validation
    expect(toastCalls).toHaveLength(3);
  });

  it("uses the approved Hebrew fallbacks", () => {
    expect(modalSource).toContain("אירעה שגיאה בהעברת בקשת פייד־טיים");
    expect(modalSource).toContain("אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים");
    expect(modalSource).toContain("יש לבחור סלוט יעד");
    expect(modalSource).toContain("אירעה שגיאה בטעינת הרשמות הפייד־טיים");
  });

  it("no longer shows the pre-fix raw-error fallbacks", () => {
    expect(modalSource).not.toContain("שגיאה בביטול שיבוץ\"");
    expect(modalSource).not.toContain("שגיאה בהעברה");
    expect(modalSource).not.toContain("שגיאה בטעינה");
    expect(modalSource).not.toContain("בחר סלוט יעד\"");
  });

  it("never renders err.response.data directly", () => {
    // The load banner still exists, but its text now goes through
    // getErrorMessage rather than being spliced together from the raw body.
    expect(modalSource).not.toMatch(/err\?\.\.?response\?\.\.?data/);
    expect(modalSource).not.toContain("err?.response?.data");
  });

  it("keeps the load-error banner and sanitizes it", () => {
    expect(modalSource).toContain("setError(");
    expect(modalSource).toMatch(
      /setError\(\s*getErrorMessage\(\s*err,\s*"אירעה שגיאה בטעינת הרשמות הפייד־טיים"/,
    );
  });
});

describe("PaidTimeSlotRegistrationsModal transfer-target contract", () => {
  it("accepts an explicit target slot id as a handler argument", () => {
    expect(modalSource).toMatch(
      /async function handleTransfer\(item,\s*targetSlotId\)/,
    );
    expect(modalSource).toMatch(
      /var target = targetSlotId \|\| transferTargets\[item\.paidTimeRequestId\]/,
    );
  });

  it('passes the current slot id directly from "שבץ כאן"', () => {
    expect(modalSource).toMatch(/handleTransfer\(item,\s*slotInCompId\)/);
  });

  it("does not defer the transfer onto a timer", () => {
    // The pre-fix code called setTargetFor() then setTimeout(handleTransfer, 0),
    // which read the transferTargets captured before the state update and so
    // always fell into the missing-target branch on a row's first click.
    expect(modalSource).not.toContain("setTimeout");
  });

  it("still supports the dropdown transfer flow", () => {
    // setTargetFor remains, driven by the select's onChange.
    expect(modalSource).toContain("function setTargetFor(requestId, value)");
    expect(modalSource).toContain("setTargetFor(item.paidTimeRequestId, e.target.value)");
  });

  it("keeps the busy-row guard and the reload on success", () => {
    expect(modalSource).toContain("setActionBusyId(item.paidTimeRequestId);");
    expect(modalSource).toContain("setActionBusyId(null);");
    expect(modalSource).toContain("if (props.onChanged) props.onChanged();");
  });
});

// The <PaidTimeSlotRegistrationsModal .../> element as written in the page, so
// the assertions below cannot accidentally match a sibling modal's props.
function registrationsModalElement() {
  const from = pageSource.indexOf("<PaidTimeSlotRegistrationsModal");

  expect(from).toBeGreaterThan(-1);

  const rest = pageSource.slice(from);

  return rest.slice(0, rest.indexOf("/>"));
}

describe("CompetitionPaidTimePage wiring", () => {
  it("passes its shared toast to the registrations modal", () => {
    expect(registrationsModalElement()).toContain("onShowToast={showToast}");
  });

  it("refreshes both the requests and the slots grid on change", () => {
    // A modal transfer or unassign moves a request between slots, so the slots
    // table's assigned/available/pending counts go stale as well. Nothing
    // reloads them on the way out of assignment mode, so onChanged has to do
    // both - matching what the in-grid assign/unassign handlers already do.
    const modalElement = registrationsModalElement();

    expect(modalElement).toContain("page.loadRequests();");
    expect(modalElement).toContain("page.loadSlots();");

    // and in that order, so the sidebar repopulates before the grid figures
    expect(modalElement.indexOf("page.loadRequests();")).toBeLessThan(
      modalElement.indexOf("page.loadSlots();"),
    );
  });

  it("does not add a success toast for modal actions", () => {
    expect(registrationsModalElement()).not.toContain('showToast("success"');
  });
});
