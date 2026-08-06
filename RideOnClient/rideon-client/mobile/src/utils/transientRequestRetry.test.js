import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  withTransientRetry,
  isTransientNetworkError,
  DEFAULT_RETRY_DELAY_MS,
} from "./transientRequestRetry";

var SOURCE_PATH = path.resolve(__dirname, "transientRequestRetry.js");

function timeoutError() {
  var error = new Error("timeout of 8000ms exceeded");
  error.code = "ECONNABORTED";
  error.request = {};
  return error;
}

function networkError() {
  // Axios shape for a dispatched request that never got a response (offline,
  // connection reset, DNS failure) - no `code: "ECONNABORTED"`, but `request`
  // is present and `response` is not.
  var error = new Error("Network Error");
  error.request = {};
  return error;
}

function responseError(status) {
  var error = new Error("Request failed with status code " + status);
  error.request = {};
  error.response = { status: status, data: {} };
  return error;
}

function swappedUnauthorizedError() {
  // axiosInstance.js replaces a 401 (non-login) response with this exact
  // shape before it ever reaches a screen's catch block.
  return { isAuthError: true };
}

describe("isTransientNetworkError", () => {
  it("is true for an ECONNABORTED timeout", () => {
    expect(isTransientNetworkError(timeoutError())).toBe(true);
  });

  it("is true for a dispatched request that got no response at all", () => {
    expect(isTransientNetworkError(networkError())).toBe(true);
  });

  it("is false for a 401 real response", () => {
    expect(isTransientNetworkError(responseError(401))).toBe(false);
  });

  it("is false for a 403 real response", () => {
    expect(isTransientNetworkError(responseError(403))).toBe(false);
  });

  it("is false for a 404 real response", () => {
    expect(isTransientNetworkError(responseError(404))).toBe(false);
  });

  it("is false for a normal 500 response", () => {
    expect(isTransientNetworkError(responseError(500))).toBe(false);
  });

  it("is false for the axiosInstance-swapped isAuthError object (no response, no request)", () => {
    expect(isTransientNetworkError(swappedUnauthorizedError())).toBe(false);
  });

  it("is false for a non-network error (no request, no response - e.g. a bug in the caller)", () => {
    expect(isTransientNetworkError(new Error("boom"))).toBe(false);
  });

  it("is false for a nullish error", () => {
    expect(isTransientNetworkError(null)).toBe(false);
    expect(isTransientNetworkError(undefined)).toBe(false);
  });
});

describe("withTransientRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("first request succeeds - exactly one call, resolves with its value", async () => {
    var requestFn = vi.fn().mockResolvedValue({ data: "ok" });

    var result = await withTransientRetry(requestFn, { delayMs: 0 });

    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: "ok" });
  });

  it("first request times out, second succeeds - exactly two calls, resolves, no error", async () => {
    var requestFn = vi
      .fn()
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce({ data: "ok-after-retry" });

    var promise = withTransientRetry(requestFn, { delayMs: DEFAULT_RETRY_DELAY_MS });
    await vi.runAllTimersAsync();
    var result = await promise;

    expect(requestFn).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: "ok-after-retry" });
  });

  it("waits the configured delay before retrying, not immediately", async () => {
    var requestFn = vi
      .fn()
      .mockRejectedValueOnce(timeoutError())
      .mockResolvedValueOnce({ data: "ok" });

    var promise = withTransientRetry(requestFn, { delayMs: 1000 });

    // Right after the first rejection, still only one call.
    await Promise.resolve();
    await Promise.resolve();
    expect(requestFn).toHaveBeenCalledTimes(1);

    // Advancing short of the delay must not trigger the retry yet.
    await vi.advanceTimersByTimeAsync(999);
    expect(requestFn).toHaveBeenCalledTimes(1);

    // Crossing the delay triggers the retry.
    await vi.advanceTimersByTimeAsync(1);
    expect(requestFn).toHaveBeenCalledTimes(2);

    await promise;
  });

  it("both attempts time out - exactly two calls, rejects with the second (existing) error", async () => {
    var firstError = timeoutError();
    var secondError = timeoutError();
    var requestFn = vi
      .fn()
      .mockRejectedValueOnce(firstError)
      .mockRejectedValueOnce(secondError);

    var promise = withTransientRetry(requestFn, { delayMs: DEFAULT_RETRY_DELAY_MS });
    // Attach the rejection assertion before advancing timers, so the
    // rejection - which fires from inside runAllTimersAsync - is never
    // briefly unhandled.
    var assertion = expect(promise).rejects.toBe(secondError);
    await vi.runAllTimersAsync();
    await assertion;

    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it("401 - no retry, rejects immediately with the swapped isAuthError shape", async () => {
    var authError = swappedUnauthorizedError();
    var requestFn = vi.fn().mockRejectedValue(authError);

    await expect(
      withTransientRetry(requestFn, { delayMs: 0 }),
    ).rejects.toBe(authError);
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it("403 - no retry, rejects immediately", async () => {
    var forbidden = responseError(403);
    var requestFn = vi.fn().mockRejectedValue(forbidden);

    await expect(
      withTransientRetry(requestFn, { delayMs: 0 }),
    ).rejects.toBe(forbidden);
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it("404 - no retry, rejects immediately", async () => {
    var notFound = responseError(404);
    var requestFn = vi.fn().mockRejectedValue(notFound);

    await expect(
      withTransientRetry(requestFn, { delayMs: 0 }),
    ).rejects.toBe(notFound);
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it("a normal 500 response - no retry unless explicitly justified (not justified here), rejects immediately", async () => {
    var serverError = responseError(500);
    var requestFn = vi.fn().mockRejectedValue(serverError);

    await expect(
      withTransientRetry(requestFn, { delayMs: 0 }),
    ).rejects.toBe(serverError);
    expect(requestFn).toHaveBeenCalledTimes(1);
  });

  it("never resolves the wrapped call into anything but the same requestFn - no side channel to storage exists to call", async () => {
    // Behavioral guard alongside the static source check below: run a full
    // retry-then-fail cycle and confirm the only thing that happened is two
    // calls to requestFn - nothing else was invoked as a side effect.
    var requestFn = vi
      .fn()
      .mockRejectedValueOnce(timeoutError())
      .mockRejectedValueOnce(timeoutError());

    var promise = withTransientRetry(requestFn, { delayMs: 0 });
    var assertion = expect(promise).rejects.toBeTruthy();
    await vi.runAllTimersAsync();
    await assertion;

    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it("worst-case window is additive (first timeout + delay + second timeout), not just the delay alone", () => {
    // With axiosInstance's real 8000ms global default (read from its source
    // text - see freshLoginUnaffected.contract.test.js for why this can't be
    // imported directly) and the 1000ms retry delay, the ceiling before the
    // screen's existing error alert can appear is 8000 + 1000 + 8000 =
    // 17000ms, not ~9000ms - the second attempt gets its own full timeout
    // budget, it does not inherit whatever time the first attempt used.
    var axiosSource = fs.readFileSync(
      path.resolve(__dirname, "../services/axiosInstance.js"),
      "utf8",
    );
    var timeoutMatch = axiosSource.match(/timeout:\s*(\d+)/);
    expect(timeoutMatch).not.toBeNull();

    var globalTimeoutMs = Number(timeoutMatch[1]);
    expect(globalTimeoutMs).toBe(8000);
    expect(DEFAULT_RETRY_DELAY_MS).toBe(1000);

    var worstCaseMs = globalTimeoutMs + DEFAULT_RETRY_DELAY_MS + globalTimeoutMs;
    expect(worstCaseMs).toBe(17000);
  });
});

describe("transientRequestRetry.js source - never touches auth/session storage", () => {
  // storageService.js imports @react-native-async-storage/async-storage,
  // which is not safe to import under plain vitest (same constraint as every
  // *.contract.test.js screen test in this codebase) - so this is verified
  // by reading the source text rather than importing the module.
  it("has no import of storageService, AsyncStorage, or clearAuthStorage", () => {
    var source = fs.readFileSync(SOURCE_PATH, "utf8");

    expect(source).not.toContain("storageService");
    expect(source).not.toContain("AsyncStorage");
    expect(source).not.toContain("clearAuthStorage");
  });
});
