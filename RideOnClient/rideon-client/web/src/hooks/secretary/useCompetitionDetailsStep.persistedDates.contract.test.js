import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Review-gate fix #2: the reschedule preview must anchor on the persisted
// (server-confirmed) competition dates, never on detailsForm's own fields,
// which are form state even though they are now rendered read-only for an
// existing competition. Source-level contract test — see
// CompetitionHealthCertificatesPage.contract.test.js for why this repo uses
// this technique (no DOM test environment, no React Testing Library).

// Normalized to LF so multi-line toContain checks below are not sensitive to
// this checkout's CRLF line endings (confirmed present in both files).
const HOOK_PATH = new URL("./useCompetitionDetailsStep.js", import.meta.url);
const hookSource = readFileSync(HOOK_PATH, "utf8").replace(/\r\n/g, "\n");

const PAGE_PATH = new URL(
  "../../pages/secretary/CompetitionFormPage.jsx",
  import.meta.url,
);
const pageSource = readFileSync(PAGE_PATH, "utf8").replace(/\r\n/g, "\n");

function countOccurrences(haystack, needle) {
  let count = 0;
  let index = 0;

  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count++;
    index += needle.length;
  }

  return count;
}

describe("persisted competition dates — set only by loadExistingCompetition", () => {
  it("persistedCompetitionStartDate/EndDate are declared as their own state, separate from detailsForm", () => {
    expect(hookSource).toContain(
      "var [persistedCompetitionStartDate, setPersistedCompetitionStartDate] =\n    useState(\"\");",
    );
    expect(hookSource).toContain(
      "var [persistedCompetitionEndDate, setPersistedCompetitionEndDate] =\n    useState(\"\");",
    );
  });

  it("setPersistedCompetitionStartDate is called exactly once in the whole file, inside loadExistingCompetition", () => {
    const loadAt = hookSource.indexOf(
      "async function loadExistingCompetition(",
    );
    const loadEndAt = hookSource.indexOf(
      "\n  }",
      hookSource.indexOf("catch (error) {", loadAt),
    );

    expect(loadAt).toBeGreaterThan(-1);
    expect(loadEndAt).toBeGreaterThan(loadAt);

    const totalCalls = countOccurrences(
      hookSource,
      "setPersistedCompetitionStartDate(",
    );
    const callsInsideLoad = countOccurrences(
      hookSource.slice(loadAt, loadEndAt),
      "setPersistedCompetitionStartDate(",
    );

    expect(totalCalls).toBe(1);
    expect(callsInsideLoad).toBe(1);
  });

  it("setPersistedCompetitionEndDate is called exactly once in the whole file, inside loadExistingCompetition", () => {
    const loadAt = hookSource.indexOf(
      "async function loadExistingCompetition(",
    );
    const loadEndAt = hookSource.indexOf(
      "\n  }",
      hookSource.indexOf("catch (error) {", loadAt),
    );

    const totalCalls = countOccurrences(
      hookSource,
      "setPersistedCompetitionEndDate(",
    );
    const callsInsideLoad = countOccurrences(
      hookSource.slice(loadAt, loadEndAt),
      "setPersistedCompetitionEndDate(",
    );

    expect(totalCalls).toBe(1);
    expect(callsInsideLoad).toBe(1);
  });

  it("loadExistingCompetition sources both persisted dates from the server response via toInputDate, not from detailsForm", () => {
    expect(hookSource).toContain(
      "setPersistedCompetitionStartDate(\n        toInputDate(competition.competitionStartDate),\n      );",
    );
    expect(hookSource).toContain(
      "setPersistedCompetitionEndDate(\n        toInputDate(competition.competitionEndDate),\n      );",
    );
  });

  it("handleDetailsChange (the ordinary form-edit path) never touches the persisted date setters", () => {
    const handleDetailsChangeAt = hookSource.indexOf(
      "function handleDetailsChange(",
    );
    const nextFunctionAt = hookSource.indexOf(
      "\n  function toggleCompetitionJudge",
      handleDetailsChangeAt,
    );

    expect(handleDetailsChangeAt).toBeGreaterThan(-1);
    expect(nextFunctionAt).toBeGreaterThan(handleDetailsChangeAt);

    const body = hookSource.slice(handleDetailsChangeAt, nextFunctionAt);

    expect(body).not.toContain("setPersistedCompetitionStartDate");
    expect(body).not.toContain("setPersistedCompetitionEndDate");
  });

  it("handleReschedule never sets the persisted dates directly — it only triggers loadExistingCompetition, the single source of truth", () => {
    const rescheduleAt = hookSource.indexOf(
      "async function handleReschedule(",
    );
    const nextFunctionAt = hookSource.indexOf("\n  return {", rescheduleAt);

    expect(rescheduleAt).toBeGreaterThan(-1);
    expect(nextFunctionAt).toBeGreaterThan(rescheduleAt);

    const body = hookSource.slice(rescheduleAt, nextFunctionAt);

    expect(body).not.toContain("setPersistedCompetitionStartDate");
    expect(body).not.toContain("setPersistedCompetitionEndDate");
    expect(body).toContain(
      "await loadExistingCompetition(competitionId, currentRanchId);",
    );
  });

  it("both persisted-date fields are exposed from the hook's return", () => {
    const returnAt = hookSource.lastIndexOf("return {");
    const returnBlock = hookSource.slice(returnAt);

    expect(returnBlock).toContain("persistedCompetitionStartDate");
    expect(returnBlock).toContain("persistedCompetitionEndDate");
  });
});

describe("persisted competition dates — passed through to the page and the modal", () => {
  it("useCompetitionFormPage re-exports both persisted-date fields from the details step", () => {
    const formPageHookPath = new URL(
      "./useCompetitionFormPage.js",
      import.meta.url,
    );
    const formPageHookSource = readFileSync(formPageHookPath, "utf8");

    expect(formPageHookSource).toContain(
      "persistedCompetitionStartDate: details.persistedCompetitionStartDate,",
    );
    expect(formPageHookSource).toContain(
      "persistedCompetitionEndDate: details.persistedCompetitionEndDate,",
    );
  });

  it("RescheduleCompetitionModal is wired to the persisted dates, never to detailsForm's own fields", () => {
    // Other consumers on this page (ClassInCompetitionModal,
    // PaidTimeSlotInCompetitionModal) legitimately keep using
    // page.detailsForm.competitionStartDate/EndDate for their own bounds —
    // this test scopes strictly to the <RescheduleCompetitionModal ... />
    // block, not the whole file, so it cannot be satisfied by an unrelated
    // component's props.
    const modalTagAt = pageSource.indexOf("<RescheduleCompetitionModal");
    const modalTagEndAt = pageSource.indexOf("/>", modalTagAt);

    expect(modalTagAt).toBeGreaterThan(-1);
    expect(modalTagEndAt).toBeGreaterThan(modalTagAt);

    const modalBlock = pageSource.slice(modalTagAt, modalTagEndAt);

    expect(modalBlock).toContain(
      "competitionStartDate={page.persistedCompetitionStartDate}",
    );
    expect(modalBlock).toContain(
      "competitionEndDate={page.persistedCompetitionEndDate}",
    );

    expect(modalBlock).not.toContain("detailsForm");
  });
});
