const WEB_SUPPORTED_ROLE_NAMES = ["מזכירת חווה מארחת"];

function isRoleSupportedOnWeb(roleName) {
  return WEB_SUPPORTED_ROLE_NAMES.includes(String(roleName || "").trim());
}

function mapRoleOptionForWeb(roleOption) {
  var roleName = String(roleOption?.roleName || "").trim();
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

function getWebSupportedRoleOptions(approvedRolesAndRanches) {
  if (!Array.isArray(approvedRolesAndRanches)) {
    return [];
  }

  return approvedRolesAndRanches.filter(function (item) {
    return isRoleSupportedOnWeb(item.roleName);
  });
}

export {
  WEB_SUPPORTED_ROLE_NAMES,
  isRoleSupportedOnWeb,
  mapRoleOptionForWeb,
  getWebSupportedRoleOptions,
};