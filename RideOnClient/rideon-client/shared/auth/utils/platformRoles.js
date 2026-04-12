const WEB_SUPPORTED_ROLE_NAMES = ["מזכירת חווה מארחת"];
const MOBILE_SUPPORTED_ROLE_NAMES = ["משלם", "אדמין חווה", "עובד חווה"];

function normalizeRoleName(roleName) {
  return String(roleName || "").trim();
}

function isRoleSupportedOnWeb(roleName) {
  return WEB_SUPPORTED_ROLE_NAMES.includes(normalizeRoleName(roleName));
}

function isRoleSupportedOnMobile(roleName) {
  return MOBILE_SUPPORTED_ROLE_NAMES.includes(normalizeRoleName(roleName));
}

function mapRoleOptionForWeb(roleOption) {
  var roleName = normalizeRoleName(roleOption?.roleName);
  var ranchName = String(roleOption?.ranchName || "").trim();
  var supportedOnWeb = isRoleSupportedOnWeb(roleName);

  return {
    ...roleOption,
    displayTitle: ranchName,
    displaySubtitle: roleName,
    isSupportedOnWeb: supportedOnWeb,
    platformMessage: supportedOnWeb ? "" : "זמין רק במובייל",
  };
}

function mapRoleOptionForMobile(roleOption) {
  var roleName = normalizeRoleName(roleOption?.roleName);
  var ranchName = String(roleOption?.ranchName || "").trim();
  var supportedOnMobile = isRoleSupportedOnMobile(roleName);

  return {
    ...roleOption,
    displayTitle: ranchName,
    displaySubtitle: roleName,
    isSupportedOnMobile: supportedOnMobile,
    platformMessage: supportedOnMobile ? "" : "זמין רק בווב",
  };
}

function getWebSupportedRoleOptions(approvedRolesAndRanches) {
  if (!Array.isArray(approvedRolesAndRanches)) {
    return [];
  }

  return approvedRolesAndRanches.filter(function (item) {
    return isRoleSupportedOnWeb(item.roleName);
  });
}

function getMobileSupportedRoleOptions(approvedRolesAndRanches) {
  if (!Array.isArray(approvedRolesAndRanches)) {
    return [];
  }

  return approvedRolesAndRanches.filter(function (item) {
    return isRoleSupportedOnMobile(item.roleName);
  });
}

function getMobileHomeScreenName(roleName) {
  var normalizedRoleName = normalizeRoleName(roleName);

  if (normalizedRoleName === "אדמין חווה") {
    return "AdminHome";
  }

  if (normalizedRoleName === "משלם") {
    return "PayerHome";
  }

  if (normalizedRoleName === "עובד חווה") {
    return "WorkerHome";
  }

  return "";
}

export {
  WEB_SUPPORTED_ROLE_NAMES,
  MOBILE_SUPPORTED_ROLE_NAMES,
  isRoleSupportedOnWeb,
  isRoleSupportedOnMobile,
  mapRoleOptionForWeb,
  mapRoleOptionForMobile,
  getWebSupportedRoleOptions,
  getMobileSupportedRoleOptions,
  getMobileHomeScreenName,
};