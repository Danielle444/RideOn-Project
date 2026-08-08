import { describe, it, expect } from "vitest";
import { buildMobileProfileRows } from "./profileUiUtils.js";

// Regression coverage for the Profile screen bug: a Rejected role request
// was falling into the same "!approvedItem" branch as a genuinely Pending
// one, so buildMobileProfileRows returned platformType: "pending" for both
// - which the UI then rendered as "ממתין לאישור" even for a rejected role.

function buildData(roleStatus) {
  return {
    approvedProfiles: [
      {
        ranchId: 11,
        ranchName: "דאבל קיי",
        roleId: 4,
        roleName: "עובד חווה",
      },
    ],
    allProfiles: [
      {
        ranchId: 11,
        ranchName: "דאבל קיי",
        roleId: 4,
        roleName: "עובד חווה",
        roleStatus: "Approved",
      },
      {
        ranchId: 3,
        ranchName: "GI",
        roleId: 2,
        roleName: "אדמין חווה",
        roleStatus: roleStatus,
      },
    ],
  };
}

describe("buildMobileProfileRows - Pending vs Rejected platformType", () => {
  it("Pending: not in approvedProfiles yields platformType 'pending'", () => {
    var rows = buildMobileProfileRows(buildData("Pending"));
    var row = rows.find(function (r) {
      return r.ranchId === 3 && r.roleId === 2;
    });

    expect(row.roleStatus).toBe("Pending");
    expect(row.platformType).toBe("pending");
  });

  it("Rejected: not in approvedProfiles must NOT yield platformType 'pending'", () => {
    var rows = buildMobileProfileRows(buildData("Rejected"));
    var row = rows.find(function (r) {
      return r.ranchId === 3 && r.roleId === 2;
    });

    expect(row.roleStatus).toBe("Rejected");
    expect(row.platformType).not.toBe("pending");
    expect(row.platformType).toBe("unsupported");
  });

  it("Rejected status is matched case-insensitively, same convention as the rest of the file", () => {
    var rows = buildMobileProfileRows(buildData("rejected"));
    var row = rows.find(function (r) {
      return r.ranchId === 3 && r.roleId === 2;
    });

    expect(row.platformType).toBe("unsupported");
  });

  it("Approved row (found in approvedProfiles) is unaffected - still derives platformType from getMobileSupportedRoleType", () => {
    var rows = buildMobileProfileRows(buildData("Pending"));
    var approvedRow = rows.find(function (r) {
      return r.ranchId === 11 && r.roleId === 4;
    });

    expect(approvedRow.roleStatus).toBe("Approved");
    expect(approvedRow.platformType).toBe("mobile");
  });

  it("a rejected row is kept in the returned list, not hidden", () => {
    var rows = buildMobileProfileRows(buildData("Rejected"));
    expect(rows.length).toBe(2);
  });
});
