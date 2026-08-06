import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withTransientRetry } from "../../../../utils/transientRequestRetry";
import { createStartupAlertGuard } from "../../../../utils/startupAlertGuard";

// WorkerHomeScreen.jsx pulls in react-native/AsyncStorage through its
// context imports, so it cannot be rendered or imported directly here (same
// constraint as every other *.contract.test.js screen test in this
// codebase). This harness re-implements its loadWorkerHome /
// loadHomeCompetitions / loadShavingsFeed composition exactly, using the
// same two real helpers the screen imports, so the dedup behavior is proven
// by actually running it rather than asserting on source text. The
// companion WorkerHomeScreen.contract.test.js confirms the real screen file
// matches this same shape (guard reset before+after the paired cycle, each
// loader's catch calling guard.shouldAlert() before alerting).

function timeoutError() {
  var error = new Error("timeout of 8000ms exceeded");
  error.code = "ECONNABORTED";
  error.request = {};
  return error;
}

function makeWorkerHomeHarness() {
  var guard = createStartupAlertGuard();
  var alertFn = vi.fn();
  var competitions = { value: undefined };
  var shavingsFeed = { value: undefined };

  function loadHomeCompetitions(requestFn) {
    return withTransientRetry(requestFn, { delayMs: 1000 })
      .then(function (response) {
        competitions.value = response.data;
      })
      .catch(function () {
        competitions.value = [];
        if (guard.shouldAlert()) {
          alertFn("שגיאה", "אירעה שגיאה בטעינת דף הבית");
        }
      });
  }

  function loadShavingsFeed(requestFn) {
    return withTransientRetry(requestFn, { delayMs: 1000 })
      .then(function (response) {
        shavingsFeed.value = response.data;
      })
      .catch(function () {
        shavingsFeed.value = [];
        if (guard.shouldAlert()) {
          alertFn("שגיאה", "אירעה שגיאה בטעינת הזמנות הנסורת להיום");
        }
      });
  }

  function loadWorkerHome(competitionsRequestFn, shavingsRequestFn) {
    guard.reset();

    return Promise.all([
      loadHomeCompetitions(competitionsRequestFn),
      loadShavingsFeed(shavingsRequestFn),
    ]).finally(function () {
      guard.reset();
    });
  }

  return {
    alertFn: alertFn,
    competitions: competitions,
    shavingsFeed: shavingsFeed,
    loadWorkerHome: loadWorkerHome,
    loadShavingsFeed: loadShavingsFeed,
  };
}

function alwaysFails() {
  return vi.fn().mockRejectedValue(timeoutError());
}

function timesOutOnceThenFails() {
  // Both attempts (first try + the one retry) fail, so the loader's catch
  // block still runs after withTransientRetry gives up.
  return vi
    .fn()
    .mockRejectedValueOnce(timeoutError())
    .mockRejectedValueOnce(timeoutError());
}

function succeedsWith(data) {
  return vi.fn().mockResolvedValue({ data: data });
}

describe("WorkerHomeScreen startup - dual-failure alert dedup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("both requests fail after their independent retries - exactly one alert, both lists cleared", async () => {
    var harness = makeWorkerHomeHarness();
    var competitionsRequestFn = timesOutOnceThenFails();
    var shavingsRequestFn = timesOutOnceThenFails();

    var cycle = harness.loadWorkerHome(competitionsRequestFn, shavingsRequestFn);
    await vi.runAllTimersAsync();
    await cycle;

    // Each loader retried exactly once (2 calls: first try + retry).
    expect(competitionsRequestFn).toHaveBeenCalledTimes(2);
    expect(shavingsRequestFn).toHaveBeenCalledTimes(2);

    // Not two consecutive generic alerts - exactly one for the whole cycle.
    expect(harness.alertFn).toHaveBeenCalledTimes(1);

    // Both lists still end up cleared, independently of which one alerted.
    expect(harness.competitions.value).toEqual([]);
    expect(harness.shavingsFeed.value).toEqual([]);
  });

  it("one request fails after retry, the other succeeds - one alert, the successful data remains visible (not cleared)", async () => {
    var harness = makeWorkerHomeHarness();
    var competitionsRequestFn = timesOutOnceThenFails();
    var shavingsRequestFn = succeedsWith([{ shavingsOrderId: 1 }]);

    var cycle = harness.loadWorkerHome(competitionsRequestFn, shavingsRequestFn);
    await vi.runAllTimersAsync();
    await cycle;

    expect(harness.alertFn).toHaveBeenCalledTimes(1);
    expect(harness.alertFn).toHaveBeenCalledWith(
      "שגיאה",
      "אירעה שגיאה בטעינת דף הבית",
    );

    // The failed loader's list is cleared...
    expect(harness.competitions.value).toEqual([]);
    // ...but the succeeding loader's data is preserved, not wiped by the
    // other loader's failure.
    expect(harness.shavingsFeed.value).toEqual([{ shavingsOrderId: 1 }]);
  });

  it("the other ordering also produces exactly one alert - the shavings-specific message, competitions data preserved", async () => {
    var harness = makeWorkerHomeHarness();
    var competitionsRequestFn = succeedsWith([{ competitionId: 7 }]);
    var shavingsRequestFn = timesOutOnceThenFails();

    var cycle = harness.loadWorkerHome(competitionsRequestFn, shavingsRequestFn);
    await vi.runAllTimersAsync();
    await cycle;

    expect(harness.alertFn).toHaveBeenCalledTimes(1);
    expect(harness.alertFn).toHaveBeenCalledWith(
      "שגיאה",
      "אירעה שגיאה בטעינת הזמנות הנסורת להיום",
    );

    expect(harness.competitions.value).toEqual([{ competitionId: 7 }]);
    expect(harness.shavingsFeed.value).toEqual([]);
  });

  it("both requests succeed - zero alerts, both lists populated", async () => {
    var harness = makeWorkerHomeHarness();
    var competitionsRequestFn = succeedsWith([{ competitionId: 1 }]);
    var shavingsRequestFn = succeedsWith([{ shavingsOrderId: 2 }]);

    await harness.loadWorkerHome(competitionsRequestFn, shavingsRequestFn);

    expect(harness.alertFn).not.toHaveBeenCalled();
    expect(harness.competitions.value).toEqual([{ competitionId: 1 }]);
    expect(harness.shavingsFeed.value).toEqual([{ shavingsOrderId: 2 }]);
  });

  it("the guard does not leak past the cycle boundary - a later standalone loadShavingsFeed failure still alerts", async () => {
    // Models handleClaimShavingsOrder's own standalone call to
    // loadShavingsFeed, well after the startup cycle has already finished
    // and already shown its one alert.
    var harness = makeWorkerHomeHarness();
    var cycle = harness.loadWorkerHome(
      timesOutOnceThenFails(),
      timesOutOnceThenFails(),
    );
    await vi.runAllTimersAsync();
    await cycle;

    expect(harness.alertFn).toHaveBeenCalledTimes(1);

    var laterShavingsRequestFn = timesOutOnceThenFails();
    var laterCall = harness.loadShavingsFeed(laterShavingsRequestFn);
    await vi.runAllTimersAsync();
    await laterCall;

    // A second, independent alert - not suppressed by the earlier cycle.
    expect(harness.alertFn).toHaveBeenCalledTimes(2);
    expect(harness.alertFn).toHaveBeenLastCalledWith(
      "שגיאה",
      "אירעה שגיאה בטעינת הזמנות הנסורת להיום",
    );
  });

  it("both requests fail immediately (no retry, e.g. 401/403) - still exactly one alert, not two", async () => {
    var authError = { isAuthError: true };
    var competitionsRequestFn = vi.fn().mockRejectedValue(authError);
    var shavingsRequestFn = vi.fn().mockRejectedValue(authError);
    var harness = makeWorkerHomeHarness();

    await harness.loadWorkerHome(competitionsRequestFn, shavingsRequestFn);

    expect(competitionsRequestFn).toHaveBeenCalledTimes(1);
    expect(shavingsRequestFn).toHaveBeenCalledTimes(1);
    expect(harness.alertFn).toHaveBeenCalledTimes(1);
  });
});
