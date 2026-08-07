import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for CAP-7: the fake "notify admins" action is
// removed completely (it sent nothing — RideOnServer/BL/Notification.cs has
// no DAL/BL/controller/transport at all — so the confirm-then-"sent" UI was
// pure theatre). This repo has no DOM test environment and no React Testing
// Library (see CompetitionHealthCertificatesPage.contract.test.js, which
// this mirrors), so the component cannot be rendered or interacted with.

const PANEL_PATH = new URL("./RegistrationWindowPanel.jsx", import.meta.url);
const panelSource = readFileSync(PANEL_PATH, "utf8");

const COPY_PATH = new URL("./classesViewCopy.js", import.meta.url);
const copySource = readFileSync(COPY_PATH, "utf8");

describe("RegistrationWindowPanel — notify action removed", () => {
  it("no notify-related identifier remains in the component", () => {
    for (const token of [
      "canNotify",
      "onNotify",
      "isConfirming",
      "wasSent",
      "notifyButton",
      "notifyConfirmTitle",
      "notifyConfirmBody",
      "notifyConfirm",
      "notifyCancel",
      "notifySent",
    ]) {
      expect(panelSource).not.toContain(token);
    }
  });

  it("no longer imports useState (it only backed the removed confirm/sent flags)", () => {
    expect(panelSource).not.toContain('import { useState } from "react"');
  });

  it("no longer imports WINDOW_STATUS_EARLY_SOFT (only used by the removed canNotify gate)", () => {
    expect(panelSource).not.toContain("WINDOW_STATUS_EARLY_SOFT");
  });

  it("still imports WINDOW_STATUS_ON_TRACK — genuinely used by getPanelStyle", () => {
    expect(panelSource).toContain("WINDOW_STATUS_ON_TRACK");
  });

  it("the rest of the panel (progress bars, status copy) is intact", () => {
    expect(panelSource).toContain("<ProgressBars");
    expect(panelSource).toContain("REGISTRATION_WINDOW_COPY.progressLine(analysis)");
    expect(panelSource).toContain("statusCopy.title");
    expect(panelSource).toContain("statusCopy.detail");
  });
});

describe("classesViewCopy — dead notify keys removed", () => {
  it("no notify* key remains in REGISTRATION_WINDOW_COPY", () => {
    for (const token of [
      "notifyButton:",
      "notifyConfirmTitle:",
      "notifyConfirmBody:",
      "notifyConfirm:",
      "notifyCancel:",
      "notifySent:",
    ]) {
      expect(copySource).not.toContain(token);
    }
  });

  it("the status copy (onTrack/earlySoft/behind/urgent) is untouched", () => {
    expect(copySource).toContain("statuses:");
    expect(copySource).toContain("urgent:");
    expect(copySource).toContain("behind:");
  });
});
