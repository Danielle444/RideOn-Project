import {
  getWebSupportedRoleOptions,
  getMobileSupportedRoleOptions,
} from "./platformRoles";
import {
  resolveWebRoleSelection,
  resolveMobileRoleSelection,
} from "./activeRoleSelection";

function resolveSingleWebRoleSelection(approvedRolesAndRanches) {
  if (!Array.isArray(approvedRolesAndRanches)) {
    return {
      shouldAutoSelect: false,
      result: null,
    };
  }

  const supportedRoles = getWebSupportedRoleOptions(approvedRolesAndRanches);

  if (
    approvedRolesAndRanches.length === 1 &&
    supportedRoles.length === 1
  ) {
    return {
      shouldAutoSelect: true,
      result: resolveWebRoleSelection(supportedRoles[0]),
    };
  }

  return {
    shouldAutoSelect: false,
    result: null,
  };
}

function resolveSingleMobileRoleSelection(approvedRolesAndRanches) {
  if (!Array.isArray(approvedRolesAndRanches)) {
    return {
      shouldAutoSelect: false,
      result: null,
    };
  }

  const supportedRoles = getMobileSupportedRoleOptions(approvedRolesAndRanches);

  if (
    approvedRolesAndRanches.length === 1 &&
    supportedRoles.length === 1
  ) {
    return {
      shouldAutoSelect: true,
      result: resolveMobileRoleSelection(supportedRoles[0]),
    };
  }

  return {
    shouldAutoSelect: false,
    result: null,
  };
}

export {
  resolveSingleWebRoleSelection,
  resolveSingleMobileRoleSelection,
};