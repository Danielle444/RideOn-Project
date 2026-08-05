import { describe, it, expect } from "vitest";
import { GENDER_OPTIONS, genderLabel, normalizeGenderValue } from "./gender.utils.js";

describe("GENDER_OPTIONS", () => {
  it("exposes exactly the three canonical options in order", () => {
    expect(GENDER_OPTIONS).toEqual([
      { value: "m", label: "זכר" },
      { value: "f", label: "נקבה" },
      { value: "o", label: "אחר" },
    ]);
  });
});

describe("genderLabel", () => {
  it("labels canonical lowercase codes", () => {
    expect(genderLabel("m")).toBe("זכר");
    expect(genderLabel("f")).toBe("נקבה");
    expect(genderLabel("o")).toBe("אחר");
  });

  it("labels legacy uppercase codes", () => {
    expect(genderLabel("M")).toBe("זכר");
    expect(genderLabel("F")).toBe("נקבה");
  });

  it("labels legacy Hebrew word values", () => {
    expect(genderLabel("גבר")).toBe("זכר");
    expect(genderLabel("אישה")).toBe("נקבה");
  });

  it("returns an empty string for null, undefined and empty string", () => {
    expect(genderLabel(null)).toBe("");
    expect(genderLabel(undefined)).toBe("");
    expect(genderLabel("")).toBe("");
  });

  it("passes through an unexpected non-empty value rather than crashing", () => {
    expect(genderLabel("unexpected")).toBe("unexpected");
  });
});

describe("normalizeGenderValue", () => {
  it("leaves canonical m/f/o unchanged", () => {
    expect(normalizeGenderValue("m")).toBe("m");
    expect(normalizeGenderValue("f")).toBe("f");
    expect(normalizeGenderValue("o")).toBe("o");
  });

  it("converts legacy uppercase codes to canonical", () => {
    expect(normalizeGenderValue("M")).toBe("m");
    expect(normalizeGenderValue("F")).toBe("f");
  });

  it("converts legacy Hebrew word values to canonical", () => {
    expect(normalizeGenderValue("גבר")).toBe("m");
    expect(normalizeGenderValue("אישה")).toBe("f");
  });

  it("never converts null/undefined/empty to a canonical value", () => {
    expect(normalizeGenderValue(null)).toBe(null);
    expect(normalizeGenderValue(undefined)).toBe(undefined);
    expect(normalizeGenderValue("")).toBe("");
  });

  it("passes through an unexpected non-empty value unchanged", () => {
    expect(normalizeGenderValue("unexpected")).toBe("unexpected");
  });
});
