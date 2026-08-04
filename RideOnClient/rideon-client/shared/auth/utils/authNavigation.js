import { isRoleSupportedOnWeb, getWebSupportedRoleOptions } from "./platformRoles";

function getPostLoginRoute(user, activeRole) {
  if (!user) {
    return "/login";
  }

  if (user.mustChangePassword) {
    return "/change-password";
  }

  var approvedRolesAndRanches = Array.isArray(user.approvedRolesAndRanches)
    ? user.approvedRolesAndRanches
    : [];

  if (activeRole) {
    return isRoleSupportedOnWeb(activeRole.roleName)
      ? "/competitions"
      : "/select-ranch";
  }

  if (approvedRolesAndRanches.length === 0) {
    return "/login";
  }

  var webSupportedRoles = getWebSupportedRoleOptions(approvedRolesAndRanches);

  if (
    approvedRolesAndRanches.length === 1 &&
    webSupportedRoles.length === 1
  ) {
    return "/competitions";
  }

  return "/select-ranch";
}

export { getPostLoginRoute };