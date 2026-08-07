import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for standalone shavings cancellation
// (HostSecretary-direct, proc 242). This repo has no DOM test environment
// and no React Testing Library (see CompetitionsTable.contract.test.js),
// so wiring is verified via source text, not rendering.

function readNear(relativePath) {
  var url = new URL(relativePath, import.meta.url);
  return readFileSync(url, "utf8").replace(/\r\n/g, "\n");
}

const tableSource = readNear("./ShavingsOrdersTable.jsx");
const badgeSource = readNear("./ShavingsCancellationBadge.jsx");
const groupSource = readNear("./ShavingsGroup.jsx");
const needsAttentionSource = readNear("./ShavingsNeedsAttentionSection.jsx");
const hookSource = readNear(
  "../../../hooks/secretary/useCompetitionShavingsPage.js",
);
const serviceSource = readNear("../../../services/shavingsOrderService.js");
const pageSource = readNear("../../../pages/secretary/CompetitionShavingsPage.jsx");

describe("shavingsOrderService — secretaryCancelShavingsOrder contract", () => {
  it("DELETEs /ShavingsOrders/secretary/{shavingsOrderId} with ranchId as the only query param", () => {
    expect(serviceSource).toContain(
      "function secretaryCancelShavingsOrder(shavingsOrderId, ranchId) {",
    );
    expect(serviceSource).toContain(
      "`${API}/ShavingsOrders/secretary/${shavingsOrderId}`",
    );
    expect(serviceSource).toContain("params: { ranchId: ranchId }");
  });

  it("is exported", () => {
    expect(serviceSource).toContain("secretaryCancelShavingsOrder,");
  });
});

describe("useCompetitionShavingsPage — handleCancelOrder contract", () => {
  // Confirmation moved from a native window.confirm inside the hook to the
  // page's ConfirmDialog (RideOn notification audit, 2026-08-07, Slice 3) —
  // the approved copy now lives in CompetitionShavingsPage.jsx, and the hook
  // itself no longer confirms at all (it's the unconditional action).
  it("confirms via ConfirmDialog before cancelling, using the approved confirm copy", () => {
    expect(hookSource).not.toContain("window.confirm");
    expect(pageSource).toContain(
      "האם לבטל את הזמנת הנסורת? פעולה זו תעדכן גם את החיובים.",
    );
    expect(pageSource).toContain("ConfirmDialog");
  });

  it("cancels against the order's own participating ranch, not the page's ranchId", () => {
    expect(hookSource).toContain(
      '"participatingRanchId",\n        "ParticipatingRanchId",\n        ranchId,',
    );
  });

  it("reloads the list after a successful cancel and returns a tri-state result (true/false/null)", () => {
    expect(hookSource).toContain("await secretaryCancelShavingsOrder(shavingsOrderId, orderRanchId);");
    expect(hookSource).toContain("await reload();");
    expect(hookSource).toContain("return true;");
    expect(hookSource).toContain("return false;");
  });
});

describe("CompetitionShavingsPage — cancel wiring and toast copy", () => {
  it("shows the approved success/error toast copy", () => {
    expect(pageSource).toContain('showToast("success", "הזמנת הנסורת בוטלה");');
    expect(pageSource).toContain('showToast("error", shavings.cancelErrorMessage);');
  });

  it("wires onCancelOrder/cancellingId into both the needs-attention section and every group", () => {
    expect(pageSource).toContain("onCancelOrder={handleCancelOrder}");
    expect(pageSource).toContain("cancellingId={shavings.cancellingId}");
  });
});

describe("ShavingsCancellationBadge — approved lifecycle labels", () => {
  it("renders the approved cancelled/pending labels, nothing for a normal order", () => {
    expect(badgeSource).toContain("בוטל");
    expect(badgeSource).toContain("ממתין לביטול");
    expect(badgeSource).toContain("return null;");
  });
});

describe("ShavingsOrdersTable — cancel action column", () => {
  it("has a ביטול header and a busy label of מבטל...", () => {
    expect(tableSource).toContain('"ביטול",');
    expect(tableSource).toContain('"מבטל..."');
  });

  it("locks the action for a cancelled or pending-cancellation row instead of offering the button", () => {
    expect(tableSource).toContain(
      "getIsCancelled(order) || getHasPendingCancellation(order)",
    );
  });

  it("renders the cancellation badge alongside the delivery-status chip, not instead of it", () => {
    expect(tableSource).toContain("<ShavingsStatusChip order={order} />");
    expect(tableSource).toContain("<ShavingsCancellationBadge order={order} />");
  });
});

describe("ShavingsGroup / ShavingsNeedsAttentionSection — forward the cancel props", () => {
  it("both forward onCancelOrder/cancellingId to ShavingsOrdersTable", () => {
    [groupSource, needsAttentionSource].forEach(function (source) {
      expect(source).toContain("onCancelOrder={props.onCancelOrder}");
      expect(source).toContain("cancellingId={props.cancellingId}");
    });
  });
});
