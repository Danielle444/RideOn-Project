import { describe, it, expect } from "vitest";
import { getApiErrorMessage } from "./authApiErrors.js";

var GENERIC_FALLBACK = "אירעה שגיאה. נסו שוב.";

function responseError(status, data) {
  return {
    response: { status: status, data: data },
  };
}

describe("getApiErrorMessage", () => {
  it("returns a plain string response body", () => {
    expect(getApiErrorMessage(responseError(400, "לא ניתן לבצע פעולה זו"))).toBe(
      "לא ניתן לבצע פעולה זו",
    );
  });

  it("returns a { message } response body", () => {
    expect(
      getApiErrorMessage(responseError(400, { message: "קיים קונפליקט" })),
    ).toBe("קיים קונפליקט");
  });

  it("returns a { title } response body (ProblemDetails shape)", () => {
    expect(
      getApiErrorMessage(responseError(400, { title: "בקשה לא תקינה" })),
    ).toBe("בקשה לא תקינה");
  });

  it("joins ASP.NET model-validation { errors } into one message", () => {
    var error = responseError(400, {
      errors: {
        Field1: ["שדה חובה"],
        Field2: ["ערך לא תקין"],
      },
    });

    expect(getApiErrorMessage(error)).toBe("שדה חובה | ערך לא תקין");
  });

  it("falls back to error.message when the response body carries nothing usable", () => {
    var error = responseError(500, {});
    error.message = "Request failed with status code 500";

    expect(getApiErrorMessage(error, "נופל")).toBe(
      "Request failed with status code 500",
    );
  });

  // The core regression this audit exists to prevent: an object response
  // body with no recognized shape must never render as "[object Object]".
  it("never returns [object Object] for an unrecognized object body", () => {
    var error = responseError(409, { code: "SOME_CODE", detail: "x" });

    var result = getApiErrorMessage(error, "נפילה בטוחה");

    expect(result).not.toBe("[object Object]");
    expect(result).toBe("נפילה בטוחה");
  });

  it("never returns an empty string body", () => {
    expect(getApiErrorMessage(responseError(400, ""), "נפילה בטוחה")).toBe(
      "נפילה בטוחה",
    );
  });

  it("never returns a whitespace-only string body", () => {
    expect(getApiErrorMessage(responseError(400, "   "), "נפילה בטוחה")).toBe(
      "נפילה בטוחה",
    );
  });

  it("rejects a raw 'Database error:' prefixed body and uses the fallback", () => {
    var error = responseError(
      500,
      "Database error: 42P01: relation \"foo\" does not exist",
    );

    expect(getApiErrorMessage(error, "נפילה בטוחה")).toBe("נפילה בטוחה");
  });

  it("rejects a bare SQLSTATE-prefixed body and uses the fallback", () => {
    expect(
      getApiErrorMessage(responseError(400, "P0001: Cannot delete a paid entry"), "נפילה בטוחה"),
    ).toBe("נפילה בטוחה");
    expect(
      getApiErrorMessage(responseError(409, "RN001: guard failed"), "נפילה בטוחה"),
    ).toBe("נפילה בטוחה");
  });

  it("falls back to the built-in generic message when the caller passes no fallback", () => {
    var error = responseError(500, "Database error: boom");

    expect(getApiErrorMessage(error)).toBe(GENERIC_FALLBACK);
  });

  it("falls back to the built-in generic message when the caller's fallback is itself unusable", () => {
    expect(getApiErrorMessage(responseError(500, {}), "")).toBe(GENERIC_FALLBACK);
    expect(getApiErrorMessage(responseError(500, {}), null)).toBe(GENERIC_FALLBACK);
  });

  it("handles a raw string error argument", () => {
    expect(getApiErrorMessage("שגיאה ישירה")).toBe("שגיאה ישירה");
  });

  it("handles null/undefined error without throwing", () => {
    expect(getApiErrorMessage(null, "נפילה בטוחה")).toBe("נפילה בטוחה");
    expect(getApiErrorMessage(undefined, "נפילה בטוחה")).toBe("נפילה בטוחה");
    expect(getApiErrorMessage(null)).toBe(GENERIC_FALLBACK);
  });

  it("handles an error with neither response nor message", () => {
    expect(getApiErrorMessage({}, "נפילה בטוחה")).toBe("נפילה בטוחה");
    expect(getApiErrorMessage({})).toBe(GENERIC_FALLBACK);
  });
});
