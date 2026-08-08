import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// CAP-3: contract test proving every new-entries-tab dropdown source
// (classes, payers, riders, trainers, horses) is fetched on the same
// activation path (this hook's useFocusEffect), instead of horses staying
// lazy-loaded only when the picker opens. The hook pulls in react-native
// service modules not safe to import under plain vitest, so this reads
// source text (same approach as the repo's other *.contract.test.js files).

var SOURCE_PATH = path.resolve(__dirname, "useAdminCompetitionRegistrations.js");

function readSource() {
  return fs.readFileSync(SOURCE_PATH, "utf8");
}

function getFocusEffectBlock(source) {
  var match = source.match(/useFocusEffect\(\s*useCallback\(\s*function \(\) \{/);
  expect(match).toBeTruthy();

  var start = match.index;
  var end = source.indexOf("async function loadScreenData()");
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
}

describe("useAdminCompetitionRegistrations dropdown-source inventory", () => {
  it("loadScreenData fetches classes (invitation details), payers, riders and trainers together", () => {
    var source = readSource();
    var loadScreenDataBlock = source
      .split("async function loadScreenData() {")[1]
      .split("// Fetches the bounded, real-horse-only list")[0];

    expect(loadScreenDataBlock).toContain("getCompetitionInvitationDetails(");
    expect(loadScreenDataBlock).toContain("getManagedPayers(");
    expect(loadScreenDataBlock).toContain("getRidersByRanch(");
    expect(loadScreenDataBlock).toContain("getTrainersByRanch(");
  });

  it("loadHorsesForPicker fetches the bounded real-horse list via getRealHorsesByRanch", () => {
    var source = readSource();
    var horsesLoaderBlock = source
      .split("var loadHorsesForPicker = useCallback(")[1]
      .split("function handleToggleLock(fieldKey)")[0];

    expect(horsesLoaderBlock).toContain("getRealHorsesByRanch(");
  });

  it("the tab-activation focus effect calls loadScreenData AND loadHorsesForPicker together, guarded by the same activeRole/competitionId check", () => {
    var focusEffectBlock = getFocusEffectBlock(readSource());

    expect(focusEffectBlock).toContain("loadScreenData();");
    expect(focusEffectBlock).toContain("loadHorsesForPicker();");

    // Both calls must be reachable only past the guard's early return, not
    // hoisted above it.
    var guardIndex = focusEffectBlock.indexOf("return;");
    expect(focusEffectBlock.indexOf("loadScreenData();")).toBeGreaterThan(
      guardIndex,
    );
    expect(focusEffectBlock.indexOf("loadHorsesForPicker();")).toBeGreaterThan(
      guardIndex,
    );
  });

  it("horses are no longer only fetched from an open/search handler - the picker's onSearch wiring is unchanged (still supports search-after-load)", () => {
    var source = readSource();

    // loadHorsesForPicker is still exposed as onSearchHorses for the picker's
    // own debounced search - CAP-3 only adds an eager call, it doesn't
    // remove the existing search path.
    expect(source).toContain("loadHorsesForPicker,");
  });

  it("does not introduce an unguarded effect that would refetch on every render", () => {
    var source = readSource();
    var focusEffectAndDeps = source.split("async function loadScreenData()")[0];

    expect(focusEffectAndDeps).toMatch(
      /\[activeRole, competitionId\],\s*\),\s*\);/,
    );
  });
});

describe("useAdminCompetitionRegistrations styled-alert migration", () => {
  it("no native Alert import or Alert.alert call remains", () => {
    var source = readSource();

    expect(source).not.toMatch(/\bAlert\.alert\b/);
    expect(source).not.toMatch(/from "react-native"[\s\S]{0,120}Alert/);
  });

  it("imports showToast for the generic-fetch, validation and create-failure notices", () => {
    expect(readSource()).toContain(
      'import { showToast } from "../services/toastService";',
    );
  });
});

// CAP-2 duplicate rider+horse confirm: this hook has two live consumers
// (CompetitionEntryCreateModal.jsx and AdminCompetitionRegistrationsScreen.jsx
// - proven live via real navigation.navigate("AdminCompetitionRegistrations")
// call sites in CompetitionInvitationScreen.jsx and
// AdminCompetitionStallsShavingsScreen.jsx). AppDialog is a plain controlled
// component, not a global host like the toast, so the SAME
// duplicateConfirmDialogProps contract must work identically from both -
// this is the single source of truth for the confirm/cancel decision.
describe("useAdminCompetitionRegistrations duplicate-confirm dialog contract", () => {
  function getFunctionBlock(source, signature, nextSignature) {
    var start = source.indexOf(signature);
    var end = source.indexOf(nextSignature, start);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);

    return source.slice(start, end);
  }

  it("checkForDuplicateAndConfirm opens the dialog (not a native Alert) and awaits its resolution before returning", () => {
    var block = getFunctionBlock(
      readSource(),
      "async function checkForDuplicateAndConfirm() {",
      "async function handleCreateEntry(options) {",
    );

    expect(block).toContain("return await new Promise(function (resolve) {");
    expect(block).toContain("duplicateConfirmResolveRef.current = resolve;");
    expect(block).toContain("setDuplicateConfirmVisible(true);");
  });

  it("a fetch/normalization failure shows a toast and resolves false WITHOUT ever opening the confirm dialog", () => {
    var block = getFunctionBlock(
      readSource(),
      "async function checkForDuplicateAndConfirm() {",
      "async function handleCreateEntry(options) {",
    );

    var catchStart = block.indexOf("} catch (error) {");
    var catchEnd = block.indexOf("if (!duplicate) {");
    var catchBlock = block.slice(catchStart, catchEnd);

    expect(catchBlock).toContain(
      'showToast(GENERIC_FETCH_ERROR_MESSAGE, "error");',
    );
    expect(catchBlock).toContain("return false;");
    expect(catchBlock).not.toContain("setDuplicateConfirmVisible");
  });

  it("no duplicate found resolves true immediately, without opening the dialog", () => {
    var block = getFunctionBlock(
      readSource(),
      "async function checkForDuplicateAndConfirm() {",
      "async function handleCreateEntry(options) {",
    );

    var noDuplicateIndex = block.indexOf("if (!duplicate) {");
    var promiseIndex = block.indexOf("return await new Promise(");

    expect(noDuplicateIndex).toBeGreaterThan(-1);
    expect(noDuplicateIndex).toBeLessThan(promiseIndex);
    expect(block.slice(noDuplicateIndex, promiseIndex)).toContain(
      "return true;",
    );
  });

  it("handleDuplicateConfirmChoice closes the dialog and resolves the pending promise with the caller's answer, then clears the ref", () => {
    var block = getFunctionBlock(
      readSource(),
      "function handleDuplicateConfirmChoice(confirmed) {",
      "function loadScreenData",
    );

    expect(block).toContain("setDuplicateConfirmVisible(false);");
    expect(block).toContain(
      "var resolve = duplicateConfirmResolveRef.current;",
    );
    expect(block).toContain("duplicateConfirmResolveRef.current = null;");
    expect(block).toContain("resolve(confirmed);");
  });

  it("handleCreateEntry awaits checkForDuplicateAndConfirm and returns null without creating an entry when it resolves false (Cancel)", () => {
    var block = getFunctionBlock(
      readSource(),
      "async function handleCreateEntry(options) {",
      "var canSubmit = useMemo(",
    );

    var awaitIndex = block.indexOf(
      "var shouldProceed = await checkForDuplicateAndConfirm();",
    );
    var guardIndex = block.indexOf("if (!shouldProceed) {", awaitIndex);
    var returnIndex = block.indexOf("return null;", guardIndex);
    var createEntryIndex = block.indexOf("await createEntry(payload);");

    expect(awaitIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(awaitIndex);
    expect(returnIndex).toBeGreaterThan(guardIndex);
    expect(returnIndex).toBeLessThan(createEntryIndex);
  });

  it("createEntry is called exactly once per handleCreateEntry invocation - Continue/Add anyway never double-fires it", () => {
    var block = getFunctionBlock(
      readSource(),
      "async function handleCreateEntry(options) {",
      "var canSubmit = useMemo(",
    );

    var occurrences = block.split("await createEntry(payload);").length - 1;
    expect(occurrences).toBe(1);
  });

  it("exposes duplicateConfirmDialogProps with the full AppDialog contract every consumer needs: visible, message, both labels, onConfirm and onCancel", () => {
    var source = readSource();
    var returnBlock = source.slice(source.lastIndexOf("return {"));

    var dialogPropsBlock = returnBlock.slice(
      returnBlock.indexOf("duplicateConfirmDialogProps: {"),
    );

    expect(dialogPropsBlock).toContain("visible: duplicateConfirmVisible,");
    expect(dialogPropsBlock).toContain(
      "message: DUPLICATE_ENTRY_CONFIRM_MESSAGE,",
    );
    expect(dialogPropsBlock).toContain(
      "confirmLabel: DUPLICATE_ENTRY_CONFIRM_LABEL,",
    );
    expect(dialogPropsBlock).toContain(
      "cancelLabel: DUPLICATE_ENTRY_CANCEL_LABEL,",
    );
    expect(dialogPropsBlock).toContain("onConfirm: function () {");
    expect(dialogPropsBlock).toContain("handleDuplicateConfirmChoice(true);");
    expect(dialogPropsBlock).toContain("onCancel: function () {");
    expect(dialogPropsBlock).toContain("handleDuplicateConfirmChoice(false);");
  });

  it("onConfirm and onCancel are the ONLY entry points that settle the promise - no other call site resolves duplicateConfirmResolveRef", () => {
    var source = readSource();

    var resolveCallCount =
      source.split("duplicateConfirmResolveRef.current").length - 1;

    // Set in checkForDuplicateAndConfirm (1), read+cleared in
    // handleDuplicateConfirmChoice (2 - read into `resolve`, then nulled).
    expect(resolveCallCount).toBe(3);
  });
});
