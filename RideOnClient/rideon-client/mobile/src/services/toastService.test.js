import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createToastQueue } from "./toastService";

// createToastQueue מבודד לחלוטין - כל בדיקה מקבלת תור משלה, בדיוק
// כמו createInFlightGuard.test.js. אין import של react/react-native כאן.

describe("createToastQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("showToast adds a toast and notifies subscribers", () => {
    var queue = createToastQueue();
    var listener = vi.fn();
    queue.subscribeToasts(listener);

    queue.showToast("נשמר בהצלחה", "success");

    var lastCallArgs = listener.mock.calls[listener.mock.calls.length - 1][0];
    expect(lastCallArgs).toHaveLength(1);
    expect(lastCallArgs[0].message).toBe("נשמר בהצלחה");
    expect(lastCallArgs[0].type).toBe("success");
  });

  it("defaults type to 'info' when omitted", () => {
    var queue = createToastQueue();
    queue.showToast("הודעה");

    expect(queue.getToasts()[0].type).toBe("info");
  });

  it("subscribeToasts immediately replays the current snapshot to a new listener", () => {
    var queue = createToastQueue();
    queue.showToast("קודם");

    var listener = vi.fn();
    queue.subscribeToasts(listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toHaveLength(1);
  });

  it("dismissToast removes exactly the matching toast and notifies", () => {
    var queue = createToastQueue();
    var idA = queue.showToast("A");
    var idB = queue.showToast("B");

    queue.dismissToast(idA);

    var remaining = queue.getToasts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(idB);
  });

  it("dismissing an id that is not present is a no-op (no crash, no extra notify)", () => {
    var queue = createToastQueue();
    var listener = vi.fn();
    queue.showToast("A");
    queue.subscribeToasts(listener);

    var callsBefore = listener.mock.calls.length;
    queue.dismissToast(999);

    expect(listener.mock.calls.length).toBe(callsBefore);
  });

  it("auto-dismisses after the given duration", () => {
    var queue = createToastQueue();
    queue.showToast("נעלם", "info", 1000);

    expect(queue.getToasts()).toHaveLength(1);

    vi.advanceTimersByTime(999);
    expect(queue.getToasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(queue.getToasts()).toHaveLength(0);
  });

  it("uses a default duration when none is provided", () => {
    var queue = createToastQueue();
    queue.showToast("ברירת מחדל");

    vi.advanceTimersByTime(2999);
    expect(queue.getToasts()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(queue.getToasts()).toHaveLength(0);
  });

  it("consecutive rapid calls stack independently and each auto-dismisses on its own schedule", () => {
    var queue = createToastQueue();
    queue.showToast("ראשון", "info", 1000);
    queue.showToast("שני", "info", 2000);
    queue.showToast("שלישי", "info", 3000);

    expect(queue.getToasts()).toHaveLength(3);

    vi.advanceTimersByTime(1000);
    expect(queue.getToasts().map((t) => t.message)).toEqual(["שני", "שלישי"]);

    vi.advanceTimersByTime(1000);
    expect(queue.getToasts().map((t) => t.message)).toEqual(["שלישי"]);

    vi.advanceTimersByTime(1000);
    expect(queue.getToasts()).toHaveLength(0);
  });

  it("each toast gets a unique id even when fired in the same tick", () => {
    var queue = createToastQueue();
    var idA = queue.showToast("A");
    var idB = queue.showToast("B");

    expect(idA).not.toBe(idB);
  });

  it("manually dismissing a toast clears its pending auto-dismiss timer (no double-fire, no crash)", () => {
    var queue = createToastQueue();
    var id = queue.showToast("A", "info", 1000);

    queue.dismissToast(id);
    expect(() => vi.advanceTimersByTime(5000)).not.toThrow();
    expect(queue.getToasts()).toHaveLength(0);
  });

  it("unsubscribe stops further notifications to that listener", () => {
    var queue = createToastQueue();
    var listener = vi.fn();
    var unsubscribe = queue.subscribeToasts(listener);
    var callsAfterSubscribe = listener.mock.calls.length;

    unsubscribe();
    queue.showToast("אחרי ביטול המנוי");

    expect(listener.mock.calls.length).toBe(callsAfterSubscribe);
  });

  it("independent queue instances do not share state", () => {
    var queueA = createToastQueue();
    var queueB = createToastQueue();

    queueA.showToast("רק ב-A");

    expect(queueA.getToasts()).toHaveLength(1);
    expect(queueB.getToasts()).toHaveLength(0);
  });
});
