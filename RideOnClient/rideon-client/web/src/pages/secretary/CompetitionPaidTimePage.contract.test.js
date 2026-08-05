import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-1 and CAP-5 on the paid-time page. This
// repo has no DOM test environment and no React Testing Library (see
// PaidTimeSlotInCompetitionModal.contract.test.js, which this mirrors), so
// status/button wiring is proven against the source rather than a render.

const PAGE_PATH = new URL("./CompetitionPaidTimePage.jsx", import.meta.url);
const pageSource = readFileSync(PAGE_PATH, "utf8").replace(/\r\n/g, "\n");

describe("CAP-5 — status label derives from isPublished", () => {
  it("getStatusLabel returns the two approved status strings, keyed off getIsPublished", () => {
    expect(pageSource).toContain(
      'function getStatusLabel(slot) {\n  return getIsPublished(slot) ? "מפורסם" : "לא פורסם";\n}',
    );
  });

  it("getIsPublished reads isPublished/IsPublished, not the removed slotStatus field", () => {
    const fnAt = pageSource.indexOf("function getIsPublished(slot) {");
    const fnEndAt = pageSource.indexOf("\n}", fnAt);
    const body = pageSource.slice(fnAt, fnEndAt);

    expect(body).toContain("slot.isPublished ?? slot.IsPublished");
    expect(body).not.toContain("slotStatus");
  });

  it("the status column renders getStatusLabel(slot), not the removed getSlotStatus", () => {
    expect(pageSource).toContain("{getStatusLabel(slot)}");
    expect(pageSource).not.toContain("getSlotStatus");
  });
});

describe("CAP-5 — publish/unpublish action button", () => {
  it("labels the button בטל פרסום when published, פרסם when unpublished", () => {
    expect(pageSource).toContain(
      'label={getIsPublished(slot) ? "בטל פרסום" : "פרסם"}',
    );
  });

  it("clicking calls handleSetPublishState with the toggled (opposite) boolean", () => {
    expect(pageSource).toContain(
      "page.handleSetPublishState(slot, !getIsPublished(slot));",
    );
  });

  it("the Edit action is rendered in the same unconditional (non-publish-gated) block as the publish button, so it stays available regardless of publish state", () => {
    // Anchor AFTER the publish button's own closing tag, so its own
    // getIsPublished(slot) ternaries (label/icon) aren't picked up as a "gate"
    // sitting between it and the Edit button.
    const publishOnClickAt = pageSource.indexOf(
      "page.handleSetPublishState(slot, !getIsPublished(slot));",
    );
    const afterPublishButtonAt =
      pageSource.indexOf("/>", publishOnClickAt) + 2;
    const editAt = pageSource.indexOf(
      'title="עריכת סלוט"',
      afterPublishButtonAt,
    );

    expect(publishOnClickAt).toBeGreaterThan(-1);
    expect(editAt).toBeGreaterThan(afterPublishButtonAt);

    const between = pageSource.slice(afterPublishButtonAt, editAt);

    // No additional isPublished-based conditional sits between the publish
    // button and the Edit button - both live under the same
    // `{!page.assignmentMode ? (<>...` fragment with no extra gate.
    expect(between).not.toContain("getIsPublished(slot)");
  });
});

describe("CAP-5 — refresh path", () => {
  it("does not trigger a full-page reload anywhere on this page", () => {
    expect(pageSource).not.toContain("location.reload");
    expect(pageSource).not.toContain("window.location.href");
  });
});

describe("CAP-1 — auto-schedule preview trigger fully removed", () => {
  it("no reference to the removed hook, modal, or trigger label remains", () => {
    expect(pageSource).not.toContain("useAutoSchedulePreview");
    expect(pageSource).not.toContain("AutoSchedulePreviewModal");
    expect(pageSource).not.toContain("autoSchedulePreview");
    expect(pageSource).not.toContain("תצוגה מקדימה לשיבוץ אוטומטי");
    expect(pageSource).not.toContain("CalendarClock");
  });
});
