import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for tracker #61 (Competition Summary views) and its follow-up
// review. This repo has no DOM test environment and no React Testing Library (see the web
// package.json devDependencies) -- the same situation as
// CompetitionPaymentsPage.payerView.contract.test.js, which this mirrors. The genuinely
// behavioral piece (which view resolves when, and whether a manual choice survives a
// re-resolution) is pulled out into financialSummaryView.utils.js and covered by
// financialSummaryView.utils.test.js with real function calls; what is asserted here is the
// contract the page must not silently break: the resolver is actually wired up, the tab strip
// and the page body are driven by the same value, each view owns the right content, and the
// four modals stay mounted outside the view switch.

const PAGE_PATH = new URL("./CompetitionSummaryPage.jsx", import.meta.url);
const COPY_PATH = new URL(
  "../../components/secretary/competition-summary/financialProjectionCopy.js",
  import.meta.url,
);

function readNormalized(path) {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const pageSource = readNormalized(PAGE_PATH);
const copySource = readNormalized(COPY_PATH);

describe("async default-view resolution", () => {
  it("no longer derives the initial activeView from a useState initializer function", () => {
    // The bug this replaced: page.financialRegistrationClosed is always false on the very first
    // render (it derives from a competition record fetched asynchronously and starting null), so
    // a `useState(() => page.financialRegistrationClosed ? ... )` initializer could never resolve
    // to Actual for a closed competition -- it only ever saw "open".
    expect(pageSource).toContain(
      "var [activeView, setActiveView] = useState(TAB_PROJECTION);",
    );
    expect(pageSource).not.toMatch(
      /useState\(\s*function\s*\(\s*\)\s*\{\s*return page\.financialRegistrationClosed/,
    );
  });

  it("re-resolves the active view through the shared resolver, not an inline ternary", () => {
    expect(pageSource).toContain(
      'import {\n  resolveFinancialActiveView,\n  resolveEffectiveFinancialView,\n} from "../../utils/financialSummaryView.utils";',
    );
    expect(pageSource).toContain("resolveFinancialActiveView({");
    expect(pageSource).toContain("previousCompetitionId: lastCompetitionIdRef.current,");
    expect(pageSource).toContain("competitionId: layout.competitionId,");
    expect(pageSource).toContain("hasChosenView: hasChosenView,");
    expect(pageSource).toContain("currentActiveView: activeView,");
    expect(pageSource).toContain("registrationClosed: page.financialRegistrationClosed,");
  });

  it("re-runs the resolver whenever the competition, registration status, choice flag, or view changes", () => {
    expect(pageSource).toContain(
      "[\n      layout.competitionId,\n      page.financialRegistrationClosed,\n      hasChosenView,\n      activeView,\n    ]",
    );
  });

  it("marks a manual tab click as chosen before changing the view", () => {
    expect(pageSource).toContain("function changeActiveView(nextView) {");
    expect(pageSource).toContain("setHasChosenView(true);");
    expect(pageSource).toContain("setActiveView(nextView);");
  });
});

describe("activeView / effectiveView consistency", () => {
  it("computes effectiveView through the shared resolver, not a duplicated inline guard", () => {
    expect(pageSource).toContain(
      "var effectiveView = resolveEffectiveFinancialView(\n    activeView,\n    financialViewAvailability,\n  );",
    );
  });

  it("passes effectiveView (not the raw activeView) to the tab strip", () => {
    expect(pageSource).toContain("activeView={effectiveView}");
    expect(pageSource).not.toContain("activeView={activeView}");
  });

  it("gates every view branch on effectiveView, so the strip and the body always agree", () => {
    expect(pageSource).toContain("effectiveView === TAB_PROJECTION");
    expect(pageSource).toContain("effectiveView === TAB_ACTUAL");
    expect(pageSource).toContain("effectiveView === TAB_COMPARISON");
    expect(pageSource).not.toMatch(/activeView === TAB_(PROJECTION|ACTUAL|COMPARISON)/);
  });

  it("still routes manual tab clicks through the normal controlled setter, not effectiveView", () => {
    expect(pageSource).toContain("onChangeView={changeActiveView}");
  });
});

describe("D2 pointer copy", () => {
  it("is approved -- no PENDING marker remains next to projectionActualsPointer", () => {
    var pointerIndex = copySource.indexOf("projectionActualsPointer");
    var precedingComment = copySource.slice(
      Math.max(0, pointerIndex - 300),
      pointerIndex,
    );

    expect(precedingComment).not.toContain("PENDING");
  });

  it("matches the owner-approved text exactly, defined once in the copy module", () => {
    expect(copySource).toContain(
      'projectionActualsPointer:\n    \'נסגרה ההרשמה — נתוני אמת זמינים בלשונית "בפועל".\',',
    );
  });

  it("is referenced from the page, not duplicated as an inline literal", () => {
    expect(pageSource).toContain(
      "FINANCIAL_PROJECTION_COPY.projectionActualsPointer",
    );
    expect(pageSource).not.toContain("נסגרה ההרשמה");
  });

  it("renders only inside the Prediction branch, gated on hasActualData", () => {
    var projectionBranch = pageSource.slice(
      pageSource.indexOf("effectiveView === TAB_PROJECTION"),
      pageSource.indexOf("effectiveView === TAB_ACTUAL"),
    );

    expect(projectionBranch).toContain("hasActualData ? (");
    expect(projectionBranch).toContain(
      "FINANCIAL_PROJECTION_COPY.projectionActualsPointer",
    );

    // Exactly one reference in the whole page -- it must not also show up in the Actual or
    // Comparison branches.
    var occurrences = (
      pageSource.match(/FINANCIAL_PROJECTION_COPY\.projectionActualsPointer/g) || []
    ).length;

    expect(occurrences).toBe(1);
  });
});

describe("Actual view content", () => {
  it("still owns both the organizer and federation CompetitionSummarySection blocks", () => {
    var actualBranch = pageSource.slice(
      pageSource.indexOf("effectiveView === TAB_ACTUAL"),
      pageSource.indexOf("effectiveView === TAB_COMPARISON"),
    );

    expect(actualBranch).toContain('title="מארגן"');
    expect(actualBranch).toContain('title="התאחדות"');
    expect(actualBranch).toContain("onActionClick={page.openCashDetails}");
    expect(actualBranch).toContain(
      "onSecondaryActionClick={page.openFederationMatchingModal}",
    );
  });

  it("gates only the Actual view on page.loading", () => {
    var occurrences = (pageSource.match(/page\.loading/g) || []).length;
    expect(occurrences).toBe(1);

    var actualBranch = pageSource.slice(
      pageSource.indexOf("effectiveView === TAB_ACTUAL"),
      pageSource.indexOf("effectiveView === TAB_COMPARISON"),
    );

    expect(actualBranch).toContain("page.loading");
  });
});

describe("Actual view availability (drastic -> small -> final banners)", () => {
  it("is always available -- no longer keyed off registrationClosed", () => {
    expect(pageSource).toContain(
      "var financialViewAvailability = {\n    projection: true,\n    actual: true,\n    comparison: !!page.financialRegistrationClosed && !!hasActualData,\n  };",
    );
  });

  it("leaves comparison gating unchanged (still registrationClosed AND hasActualData)", () => {
    expect(pageSource).toContain(
      "comparison: !!page.financialRegistrationClosed && !!hasActualData,",
    );
  });

  it("resolves the banner text through a small local resolver, in the approved order", () => {
    expect(pageSource).toContain(
      "function resolveActualBannerText(registrationClosed, competitionEnded) {\n  if (!registrationClosed) {\n    return FINANCIAL_PROJECTION_COPY.actualBands.registrationOpen;\n  }\n\n  if (!competitionEnded) {\n    return FINANCIAL_PROJECTION_COPY.actualBands.live;\n  }\n\n  return null;\n}",
    );
  });

  it("calls the resolver with financialRegistrationClosed and financialCompetitionEnded", () => {
    expect(pageSource).toContain(
      "var actualBannerText = resolveActualBannerText(\n    page.financialRegistrationClosed,\n    page.financialCompetitionEnded,\n  );",
    );
  });

  it("renders the banner in the approved projection-caption-matching style, above the sections, only when non-null", () => {
    var actualBranch = pageSource.slice(
      pageSource.indexOf("effectiveView === TAB_ACTUAL"),
      pageSource.indexOf("effectiveView === TAB_COMPARISON"),
    );

    expect(actualBranch).toContain("{actualBannerText ? (");
    expect(actualBranch).toContain(
      '<div className="rounded-2xl border border-[#E6DCD5] bg-[#FCFAF8] px-5 py-3 text-right">',
    );
    expect(actualBranch).toContain(
      '<p className="text-sm font-bold text-[#7B5A4D]">{actualBannerText}</p>',
    );

    // The banner markup must precede the organizer section, not follow it.
    expect(actualBranch.indexOf("{actualBannerText ? (")).toBeLessThan(
      actualBranch.indexOf('title="מארגן"'),
    );
  });
});

describe("Actual lifecycle banner strings", () => {
  it("defines both approved strings under actualBands, distinct from the tab hint copy", () => {
    expect(copySource).toContain(
      'actualBands: {\n    registrationOpen: "נתוני אמת — צפויים לשינויים רבים עד תום ההרשמה",\n    live: "נתוני אמת — עדיין עשויים להשתנות מעט עד תום התחרות",\n  },',
    );
  });

  it("leaves the existing projection caption untouched", () => {
    expect(copySource).toContain(
      'projectionCaptionPrimary:\n    "המספרים המוצגים מהווים תחזית משוערת בלבד, אין להתייחס אליהם כהכנסות בפועל.",',
    );
  });
});

describe("Comparison view independence", () => {
  it("does not reference page.loading anywhere in its branch", () => {
    var comparisonBranch = pageSource.slice(
      pageSource.indexOf("effectiveView === TAB_COMPARISON"),
      pageSource.indexOf("<SummaryDetailsModal"),
    );

    expect(comparisonBranch).not.toContain("page.loading");
    expect(comparisonBranch).toContain("<FinancialComparisonPanel actual={page.financialActual} />");
  });
});

describe("modals stay outside the view switch", () => {
  it("mounts all four modals after the last view branch, not nested inside effectiveView checks", () => {
    var lastViewBranchIndex = pageSource.lastIndexOf(
      "effectiveView === TAB_COMPARISON",
    );

    ["<SummaryDetailsModal", "<SummaryPaymentsBreakdownModal", "<CashDeskModal", "<FederationMatchingSuggestionsModal"].forEach(
      function (modalTag) {
        var modalIndex = pageSource.indexOf(modalTag);

        expect(modalIndex).toBeGreaterThan(lastViewBranchIndex);
      },
    );

    // Exactly three view-branch checks total (Prediction / Actual / Comparison) -- the modals
    // section introduces no further one, i.e. is not itself wrapped in another effectiveView check.
    var branchCheckCount = (
      pageSource.match(/effectiveView === TAB_(PROJECTION|ACTUAL|COMPARISON)/g) || []
    ).length;

    expect(branchCheckCount).toBe(3);
  });
});
