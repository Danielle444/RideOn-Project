import { describe, it, expect, vi, afterEach } from "vitest";
import { createOperationId, resolveOperationId } from "./operationId.utils.js";

describe("createOperationId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a UUID-formatted string from crypto.randomUUID", () => {
    var id = createOperationId();

    expect(typeof id).toBe("string");
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("throws loudly rather than falling back to a weaker generator when crypto.randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});

    expect(() => createOperationId()).toThrow(/crypto.randomUUID/);
  });
});

describe("resolveOperationId", () => {
  it("mints a fresh id when there is no pending operation", () => {
    var result = resolveOperationId(null, "sig-a");

    expect(result.operationId).toBeTruthy();
    expect(result.pending).toEqual({
      operationId: result.operationId,
      signature: "sig-a",
    });
  });

  it("reuses the pending id when the signature is unchanged (retry of the same payload)", () => {
    var first = resolveOperationId(null, "sig-a");
    var second = resolveOperationId(first.pending, "sig-a");

    expect(second.operationId).toBe(first.operationId);
    expect(second.pending).toBe(first.pending);
  });

  it("mints a fresh id when the signature changes (a different intentional submission)", () => {
    var first = resolveOperationId(null, "sig-a");
    var second = resolveOperationId(first.pending, "sig-b");

    expect(second.operationId).not.toBe(first.operationId);
    expect(second.pending.signature).toBe("sig-b");
  });

  it("mints a fresh id once the caller clears pending back to null (success/cancel)", () => {
    var first = resolveOperationId(null, "sig-a");
    var afterClear = resolveOperationId(null, "sig-a");

    expect(afterClear.operationId).not.toBe(first.operationId);
  });
});
