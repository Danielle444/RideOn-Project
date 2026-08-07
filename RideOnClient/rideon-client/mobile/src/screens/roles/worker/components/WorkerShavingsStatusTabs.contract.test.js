import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// WorkerShavingsStatusTabs imports react-native, not safe to import under plain vitest -
// same reason as every other *.contract.test.js file in this codebase.

var SOURCE_PATH = path.resolve(__dirname, "WorkerShavingsStatusTabs.jsx");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8").replace(/\r\n/g, "\n");
}

describe("WorkerShavingsStatusTabs", () => {
  it("renders a Pressable per tab, keyed by tab.key, calling onChange with that key", () => {
    var source = readSource();

    expect(source).toContain("key={tab.key}");
    expect(source).toContain("props.onChange(tab.key);");
  });

  it("renders each tab's label and a count badge showing tab.count", () => {
    var source = readSource();

    expect(source).toContain("{tab.label}");
    expect(source).toContain("{tab.count}");
  });

  it("styles the active tab distinctly from inactive tabs, for both the pill and the count badge", () => {
    var source = readSource();

    expect(source).toContain("workerShavingsStatusTabsStyles.tabActive");
    expect(source).toContain("workerShavingsStatusTabsStyles.tabActiveText");
    expect(source).toContain("workerShavingsStatusTabsStyles.countBadgeActive");
    expect(source).toContain("workerShavingsStatusTabsStyles.countBadgeTextActive");
  });
});
