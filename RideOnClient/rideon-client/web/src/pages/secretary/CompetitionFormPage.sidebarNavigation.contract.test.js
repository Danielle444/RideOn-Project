import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

// Source-level contract test for the sidebar-navigation bug found in the
// filming-readiness audit. This repo has no DOM test environment and no
// React Testing Library (see CompetitionPaidTimePage.contract.test.js,
// which this mirrors), so the wiring is proven by reading the source
// directly rather than a render + click.
//
// Bug: CompetitionFormPage used to pass SecretaryLayout a custom onNavigate
// that called page.handleSkipPaidTimeStep() for every sidebar item except
// "competitions-board". handleSkipPaidTimeStep only shows an info toast
// ("ניתן לחזור ולהגדיר פייד־טיים בהמשך") - it has no navigation or
// unsaved-state logic. Sidebar clicks on Service Prices, Arenas & Stalls,
// Workers Management and Profile/Settings silently showed that toast
// instead of navigating. Git history shows the custom onNavigate was
// originally a "coming soon" placeholder ("המסך יתחבר בהמשך") from before
// those pages existed, and got accidentally rewired onto
// handleSkipPaidTimeStep when the paid-time step was added later.
//
// Fix: drop the custom onNavigate entirely so AppLayout's default
// itemKey -> menuItem.path -> navigate() behavior (see AppLayout.jsx)
// handles every sidebar item, including competitions-board.

const PAGE_PATH = new URL("./CompetitionFormPage.jsx", import.meta.url);
const pageSource = readFileSync(PAGE_PATH, "utf8").replace(/\r\n/g, "\n");

const MENU_PATH = new URL(
  "../../components/secretary/secretaryGeneralMenu.js",
  import.meta.url,
);
const menuSource = readFileSync(MENU_PATH, "utf8").replace(/\r\n/g, "\n");

const APP_LAYOUT_PATH = new URL(
  "../../components/layout/AppLayout.jsx",
  import.meta.url,
);
const appLayoutSource = readFileSync(APP_LAYOUT_PATH, "utf8").replace(
  /\r\n/g,
  "\n",
);

function getSecretaryLayoutOpenTag(source) {
  const startAt = source.indexOf("<SecretaryLayout");
  const endAt = source.indexOf(">", startAt);

  expect(startAt).toBeGreaterThan(-1);
  expect(endAt).toBeGreaterThan(startAt);

  return source.slice(startAt, endAt + 1);
}

describe("sidebar navigation is no longer hijacked by the paid-time skip toast", () => {
  it("does not pass a custom onNavigate to SecretaryLayout, so AppLayout's default path-based navigation applies to every sidebar item", () => {
    const openTag = getSecretaryLayoutOpenTag(pageSource);

    expect(openTag).not.toContain("onNavigate");
  });

  it("never invokes handleSkipPaidTimeStep as a side effect of a callback (the old sidebar-hijack call shape)", () => {
    expect(pageSource).not.toContain("page.handleSkipPaidTimeStep();");
  });

  it("still passes the full secretary menu and marks the competitions board as the active item", () => {
    const openTag = getSecretaryLayoutOpenTag(pageSource);

    expect(openTag).toContain("menuItems={secretaryGeneralMenu}");
    expect(openTag).toContain('activeItemKey="competitions-board"');
  });
});

describe("legitimate paid-time skip behavior is preserved", () => {
  it("still wires the Paid-Time step's own Skip button to handleSkipPaidTimeStep", () => {
    expect(pageSource).toContain("onSkip={page.handleSkipPaidTimeStep}");
  });

  it("the Skip wiring lives inside the CompetitionPaidTimeStep element, not in a navigation callback", () => {
    const stepAt = pageSource.indexOf("<CompetitionPaidTimeStep");
    const skipAt = pageSource.indexOf(
      "onSkip={page.handleSkipPaidTimeStep}",
      stepAt,
    );
    const stepEndAt = pageSource.indexOf("/>", stepAt);

    expect(stepAt).toBeGreaterThan(-1);
    expect(skipAt).toBeGreaterThan(stepAt);
    expect(skipAt).toBeLessThan(stepEndAt);
  });

  it("handleSkipPaidTimeStep itself only shows an info toast (no navigation, no state guard) - confirming it was never meant to gate sidebar navigation", () => {
    const HOOK_PATH = new URL(
      "../../hooks/secretary/useCompetitionFormPage.js",
      import.meta.url,
    );
    const hookSource = readFileSync(HOOK_PATH, "utf8").replace(/\r\n/g, "\n");

    const fnAt = hookSource.indexOf("function handleSkipPaidTimeStep() {");
    const fnEndAt = hookSource.indexOf("\n  }", fnAt);

    expect(fnAt).toBeGreaterThan(-1);

    const body = hookSource.slice(fnAt, fnEndAt);

    expect(body).toContain(
      'showToast("info", "ניתן לחזור ולהגדיר פייד־טיים בהמשך");',
    );
    expect(body).not.toContain("navigate(");
  });
});

describe("every sidebar item resolves to a real, navigable path", () => {
  const expectedItems = [
    { key: "competitions-board", path: "/competitions" },
    { key: "service-prices", path: "/service-prices" },
    { key: "arenas-and-stalls", path: "/arenas-and-stalls" },
    { key: "workers-management", path: "/workers-management" },
    { key: "profile-settings", path: "/profile-settings" },
  ];

  it.each(expectedItems)(
    "secretaryGeneralMenu defines key=$key with path=$path",
    ({ key, path }) => {
      expect(menuSource).toContain(`key: "${key}"`);
      expect(menuSource).toContain(`path: "${path}"`);
    },
  );

  it("AppLayout's default sidebar handler looks up the clicked item by key and navigates to its path when no onNavigate override is supplied", () => {
    const fnAt = appLayoutSource.indexOf(
      "function handleSidebarNavigate(itemKey) {",
    );
    const fnEndAt = appLayoutSource.indexOf("\n  }", fnAt);

    expect(fnAt).toBeGreaterThan(-1);

    const body = appLayoutSource.slice(fnAt, fnEndAt);

    expect(body).toContain("if (props.onNavigate) {");
    expect(body).toContain(
      "menuItem.key === itemKey",
    );
    expect(body).toContain("navigate(matchedItem.path);");
  });
});
