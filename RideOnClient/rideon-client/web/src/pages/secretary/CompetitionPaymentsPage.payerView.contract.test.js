import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-8 / #85 (payer-view redesign).
//
// This repo has no DOM test environment and no React Testing Library (see the
// web package.json devDependencies), and this file deliberately does not add
// one - the same situation as CompetitionHealthCertificatesPage.contract.test.js,
// which this mirrors. A component that returns JSX cannot be rendered here, so
// what CAN be asserted without a renderer is the contract this visual re-skin
// must not break: every existing prop, handler, and modal stays wired exactly
// as before, while the new summary-style MoneyTile/section treatment is
// actually present in the source.

const PAGE_PATH = new URL("./CompetitionPaymentsPage.jsx", import.meta.url);
const ACCOUNT_CARDS_PATH = new URL(
  "../../components/secretary/competition-payments/PayerAccountCards.jsx",
  import.meta.url,
);
const CHARGES_TABLE_PATH = new URL(
  "../../components/secretary/competition-payments/PaymentChargesTable.jsx",
  import.meta.url,
);
const PAYERS_LIST_PATH = new URL(
  "../../components/secretary/competition-payments/PayersList.jsx",
  import.meta.url,
);

const pageSource = readFileSync(PAGE_PATH, "utf8");
const accountCardsSource = readFileSync(ACCOUNT_CARDS_PATH, "utf8");
const chargesTableSource = readFileSync(CHARGES_TABLE_PATH, "utf8");
const payersListSource = readFileSync(PAYERS_LIST_PATH, "utf8");

describe("MoneyTile contract", () => {
  it("defines a MoneyTile with the summary AmountCard treatment", () => {
    expect(accountCardsSource).toContain("function MoneyTile(props) {");
    expect(accountCardsSource).toContain(
      "min-w-0 rounded-2xl border border-[#E3D7D0] bg-white text-right shadow-sm ",
    );
  });

  it("renders the money value with tabular-nums at summary scale", () => {
    expect(accountCardsSource).toContain(
      "mt-3 break-words text-2xl font-black tabular-nums lg:text-3xl ",
    );
  });

  it("exports MoneyTile for reuse on the page header", () => {
    expect(accountCardsSource).toContain("export { MoneyTile };");
  });

  it("uses semantic colors: total, paid, unpaid", () => {
    expect(accountCardsSource).toContain('colorClass="text-[#7B5A4D]"');
    expect(accountCardsSource).toContain('colorClass="text-[#2E7D32]"');
    expect(accountCardsSource).toContain('colorClass="text-[#C62828]"');
  });

  it("reuses MoneyTile for the page header's selected-total tile", () => {
    expect(pageSource).toContain("import PayerAccountCards, {");
    expect(pageSource).toContain("  MoneyTile,");
    expect(pageSource).toContain(
      '} from "../../components/secretary/competition-payments/PayerAccountCards";',
    );
    expect(pageSource).toContain('label="נבחר לתשלום"');
    expect(pageSource).toContain("amount={page.selectedTotal}");
  });

  it("does not duplicate money formatting or selectedTotal calculation on the page", () => {
    // formatMoney used to live here for the one selected-total display; now that
    // MoneyTile owns formatting, the page must not keep a dead second copy.
    expect(pageSource).not.toContain("function formatMoney(value) {");
    // No local var/const/let re-derives selectedTotal; it stays the hook's value.
    expect(pageSource).not.toMatch(/\b(?:var|const|let)\s+selectedTotal\s*=/);
  });
});

describe("Accounts overview titled-section contract", () => {
  it("wraps the accounts in a titled rounded-[28px] section", () => {
    expect(accountCardsSource).toContain(
      '<section className="rounded-[28px] border border-[#E6DCD5] bg-white p-8 shadow-sm">',
    );
    expect(accountCardsSource).toContain(
      '<h2 className="text-3xl font-black text-[#3F312B]">חשבונות המשלם</h2>',
    );
  });

  it("stacks the three account MoneyTiles below sm to avoid an unreadable row", () => {
    expect(accountCardsSource).toContain(
      '<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">',
    );
  });

  it("keeps owner selection wired to the existing handler and active state", () => {
    expect(accountCardsSource).toContain("props.onSelectOwner(owner);");
    expect(accountCardsSource).toContain("onSelectOwner={props.onSelectOwner}");
    expect(accountCardsSource).toContain(
      "var isActive = props.activeOwner === owner;",
    );
  });

  it("keeps the payment status badge and federation coverage status", () => {
    expect(accountCardsSource).toContain("<PaymentStatusBadge");
    expect(accountCardsSource).toContain("<FederationCoverageMiniStatus");
    expect(accountCardsSource).toContain(
      "federationCoverageStatus={props.federationCoverageStatus}",
    );
  });
});

describe("Charge-detail titled-section contract", () => {
  it("wraps the categories sidebar and charges table in a titled section", () => {
    expect(pageSource).toContain("שורות חיוב לתשלום");

    const sectionCount = (
      pageSource.match(
        /rounded-\[28px\] border border-\[#E6DCD5\] bg-white p-8 shadow-sm/g,
      ) || []
    ).length;

    // One occurrence in this file (charge-detail); PayerAccountCards owns the
    // other (accounts overview) in its own file.
    expect(sectionCount).toBe(1);
  });

  it("keeps the two-column grid and both child components' props unchanged", () => {
    expect(pageSource).toContain("xl:grid-cols-[340px_minmax(0,1fr)]");
    expect(pageSource).toContain("activeCategoryKey={page.selectedCategoryKey}");
    expect(pageSource).toContain("onSelectCategory={page.selectCategory}");
    expect(pageSource).toContain("onToggleCharge={page.toggleCharge}");
    expect(pageSource).toContain("page.toggleSelectAllVisibleCharges");
    expect(pageSource).toContain("allVisibleChargesSelected={page.allVisibleChargesSelected}");
  });

  it("moves ניקוי בחירה and הוספת תשלום into the section header without changing their wiring", () => {
    expect(pageSource).toContain("onClick={page.clearSelectedCharges}");
    expect(pageSource).toContain(
      "disabled={page.selectedChargeIds.length === 0}",
    );
    expect(pageSource).toContain("ניקוי בחירה");
    expect(pageSource).toContain("onClick={page.openPaymentModal}");
    expect(pageSource).toContain("{paymentActionText}");
  });
});

describe("Preserved payment flows and modals", () => {
  it("keeps payer selection and the payers list wired", () => {
    expect(pageSource).toContain("onOpenPayer={page.openPayerAccount}");
    expect(pageSource).toContain("onClick={page.closePayerAccount}");
  });

  it("keeps both payment modals present with their existing props", () => {
    expect(pageSource).toContain("<CreatePaymentModal");
    expect(pageSource).toContain("open={page.paymentModalOpen}");
    expect(pageSource).toContain("<FederationCoverageApplyModal");
    expect(pageSource).toContain("open={page.federationApplyModalOpen}");
  });

  it("keeps the federation coverage action-text branch untouched", () => {
    expect(pageSource).toContain(
      'page.selectedOwner === "Federation" ? "שייך כיסוי התאחדות" : "הוספת תשלום";',
    );
  });

  it("touches no backend service contract", () => {
    // Only the pre-existing competition lookup service import; no new service
    // module was introduced or changed by this redesign.
    const serviceImports = pageSource.match(/from "\.\.\/\.\.\/services\/[^"]+"/g) || [];

    expect(serviceImports).toEqual(['from "../../services/competitionService"']);
  });
});

describe("Charges table summary treatment contract", () => {
  it("uses the summary table wrapper treatment", () => {
    expect(chargesTableSource).toContain(
      'className="max-w-full overflow-hidden rounded-2xl border border-[#E3D7D0] bg-white"',
    );
  });

  it("keeps the existing thead and row treatment", () => {
    expect(chargesTableSource).toContain(
      'className="bg-[#F3EEEA] text-sm font-bold text-[#5D4037]"',
    );
    expect(chargesTableSource).toContain("border-t border-[#EFE5DF]");
    expect(chargesTableSource).toContain("hover:bg-[#FCF8F5]");
  });

  it("gives the selectable amount column the semantic total color without breaking the disabled-row mute", () => {
    expect(chargesTableSource).toContain('"px-4 py-4 font-black tabular-nums " +');
    expect(chargesTableSource).toContain('(canSelect ? "text-[#7B5A4D]" : "")');
  });

  it("keeps the checkbox selection column wired", () => {
    expect(chargesTableSource).toContain('type="checkbox"');
    expect(chargesTableSource).toContain("checked={isSelected}");
    expect(chargesTableSource).toContain("disabled={!canSelect}");
    expect(chargesTableSource).toContain("props.onToggleCharge(charge);");
  });

  it("keeps the empty state and status/invoice rendering", () => {
    expect(chargesTableSource).toContain("אין שורות חיוב להצגה");
    expect(chargesTableSource).toContain("getStatusLabel(status)");
    expect(chargesTableSource).toContain("getStatusClass(status)");
    expect(chargesTableSource).toContain(
      'getValue(charge, "invoiceNumber", "InvoiceNumber", "-")',
    );
  });
});

describe("PayersList consistency contract", () => {
  it("adds tabular-nums to money columns without touching filter/sort/selection logic", () => {
    expect(payersListSource).toContain(
      'className="px-6 py-5 font-bold tabular-nums"',
    );
    expect(payersListSource).toContain(
      'className="px-6 py-5 font-bold tabular-nums text-[#2E7D32]"',
    );

    // Sorting, filtering, and row-open handler are untouched.
    expect(payersListSource).toContain("function handleSort(columnKey) {");
    expect(payersListSource).toContain("function clearFilters() {");
    expect(payersListSource).toContain("props.onOpenPayer(payer);");
  });
});
