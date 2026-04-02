import {
  isRoleSupportedOnWeb,
  isRoleSupportedOnMobile,
  getMobileHomeScreenName,
} from "./platformRoles";

function buildActiveRolePayload(roleOption) {
  return {
    ranchId: roleOption.ranchId,
    ranchName: roleOption.ranchName,
    roleId: roleOption.roleId,
    roleName: roleOption.roleName,
  };
}

function resolveWebRoleSelection(roleOption) {
  if (!roleOption) {
    return {
      ok: false,
      message: "לא נבחר תפקיד",
      activeRole: null,
      destination: "",
    };
  }

  if (!isRoleSupportedOnWeb(roleOption.roleName)) {
    return {
      ok: false,
      message: "התפקיד שנבחר זמין רק במובייל",
      activeRole: null,
      destination: "",
    };
  }

  return {
    ok: true,
    message: "",
    activeRole: buildActiveRolePayload(roleOption),
    destination: "/competitions",
  };
}

function resolveMobileRoleSelection(roleOption) {
  if (!roleOption) {
    return {
      ok: false,
      message: "לא נבחר תפקיד",
      activeRole: null,
      destination: "",
    };
  }

  if (!isRoleSupportedOnMobile(roleOption.roleName)) {
    return {
      ok: false,
      message: "התפקיד שנבחר זמין רק בווב",
      activeRole: null,
      destination: "",
    };
  }

  var screenName = getMobileHomeScreenName(roleOption.roleName);

  if (!screenName) {
    return {
      ok: false,
      message: "לא נמצא מסך מתאים לתפקיד זה",
      activeRole: null,
      destination: "",
    };
  }

  return {
    ok: true,
    message: "",
    activeRole: buildActiveRolePayload(roleOption),
    destination: screenName,
  };
}

export {
  buildActiveRolePayload,
  resolveWebRoleSelection,
  resolveMobileRoleSelection,
};