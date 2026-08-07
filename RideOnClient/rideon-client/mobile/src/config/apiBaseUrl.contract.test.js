import { describe, it, expect } from "vitest";
import { API_BASE_URL } from "./apiBaseUrl";

describe("apiBaseUrl", () => {
  it("points at the canonical production Render backend", () => {
    expect(API_BASE_URL).toBe("https://rideon-project.onrender.com/api");
  });

  it("no longer points at the retired ad4g Render backend", () => {
    expect(API_BASE_URL).not.toMatch(/ad4g/);
  });
});
