import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The screen imports react-native/context modules not safe to import under
// plain vitest, so this reads source text - same approach as
// AdminCompetitionPayerAccountScreen.contract.test.js and every other
// *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "PayerCompetitionAccountScreen.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("PayerCompetitionAccountScreen - CAP-4 shavings tab", () => {
  it("exposes a נסורת tab button alongside the existing four", () => {
    var source = readSource();

    expect(source).toContain('{renderTabButton("shavings", "נסורת")}');
  });

  it("dispatches activeTab === \"shavings\" to renderShavingsTab", () => {
    var source = readSource();

    expect(source).toContain(
      'if (activeTab === "shavings") return renderShavingsTab();',
    );
  });

  it("bands account.shavings via the shared groupAndBandShavingsByStall utility, keyed off account.shavings and account.stalls", () => {
    var source = readSource();

    expect(source).toContain(
      'import { groupAndBandShavingsByStall } from "../../../../utils/payerAccountShavingsGrouping";',
    );
    expect(source).toContain(
      "return groupAndBandShavingsByStall(account.shavings, account.stalls);",
    );
    expect(source).toContain("[account.shavings, account.stalls]");
  });

  it("renders all four bands - active/pending/cancelled via getLifecycleBandHeader, needsReview via SHAVINGS_NEEDS_REVIEW_COPY.bandHeader - never a fifth guessed band", () => {
    var source = readSource();

    expect(source).toContain(
      'import {\n  getLifecycleBandHeader,\n  SHAVINGS_NEEDS_REVIEW_COPY,\n} from "../../../../utils/payerAccountCopy";',
    );
    expect(source).toContain("header: getLifecycleBandHeader(LIFECYCLE_STATE.ACTIVE),");
    expect(source).toContain("header: getLifecycleBandHeader(LIFECYCLE_STATE.PENDING_CHANGE),");
    expect(source).toContain("header: getLifecycleBandHeader(LIFECYCLE_STATE.CANCELLED),");
    expect(source).toContain("header: SHAVINGS_NEEDS_REVIEW_COPY.bandHeader,");
  });

  it("renders each band's groups through the shared ShavingsGroupCard component, keyed by group.key", () => {
    var source = readSource();

    expect(source).toContain(
      'import ShavingsGroupCard from "../../../../components/payerAccount/ShavingsGroupCard";',
    );
    expect(source).toContain(
      "<ShavingsGroupCard key={group.key} group={group} />",
    );
  });

  it("shows a dedicated empty state when account.shavings is empty, distinct from the stalls-tab empty state", () => {
    var source = readSource();

    expect(source).toContain(
      'return renderEmpty("אין לך הזמנות נסורת בתחרות זו");',
    );
  });

  it("the nested per-stall shavings lines inside the stalls tab are untouched by this slice", () => {
    var source = readSource();

    expect(source).toContain("var shavingsOrders = sortShavingsOrders(item.shavingsOrders);");
    expect(source).toContain("נסורת לתא זה:");
  });
});
