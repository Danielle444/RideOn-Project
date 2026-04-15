function getMobileSupportedRoleType(roleName) {
  if (roleName === "אדמין חווה") {
    return "mobile";
  }

  if (roleName === "משלם") {
    return "mobile";
  }

  if (roleName === "עובד חווה") {
    return "mobile";
  }

  return "unsupported";
}

function getProfileUiConfig(roleName) {
  var isPayer = roleName === "משלם";
  var isAdmin = roleName === "אדמין חווה";

  return {
    showRanchInHeader: !isPayer,
    showRanchSection: !isPayer,
    allowEditRanch: isAdmin,
    showManagersSection: isPayer,
  };
}

function buildMobileProfileRows(data) {
  var approvedLookup = new Map();

  (data?.approvedProfiles || []).forEach(function (item) {
    approvedLookup.set(item.ranchId + "-" + item.roleId, item);
  });

  return (data?.allProfiles || []).map(function (item) {
    var key = item.ranchId + "-" + item.roleId;
    var approvedItem = approvedLookup.get(key);

    if (!approvedItem) {
      return {
        ranchId: item.ranchId,
        ranchName: item.ranchName,
        roleId: item.roleId,
        roleName: item.roleName,
        roleStatus: item.roleStatus,
        platformType: "pending",
      };
    }

    return {
      ranchId: item.ranchId,
      ranchName: item.ranchName,
      roleId: item.roleId,
      roleName: item.roleName,
      roleStatus: item.roleStatus,
      platformType: getMobileSupportedRoleType(approvedItem.roleName),
    };
  });
}

function createUserForm(profileSettingsResponse) {
  return {
    personId: profileSettingsResponse?.userProfile?.personId || 0,
    firstName: profileSettingsResponse?.userProfile?.firstName || "",
    lastName: profileSettingsResponse?.userProfile?.lastName || "",
    gender: profileSettingsResponse?.userProfile?.gender || "",
    cellPhone: profileSettingsResponse?.userProfile?.cellPhone || "",
    email: profileSettingsResponse?.userProfile?.email || "",
    username: profileSettingsResponse?.userProfile?.username || "",
    nationalId: profileSettingsResponse?.userProfile?.nationalId || "",
  };
}

function createRanchForm(profileSettingsResponse) {
  return {
    ranchId: profileSettingsResponse?.activeRanch?.ranchId || 0,
    ranchName: profileSettingsResponse?.activeRanch?.ranchName || "",
    contactEmail: profileSettingsResponse?.activeRanch?.contactEmail || "",
    contactPhone: profileSettingsResponse?.activeRanch?.contactPhone || "",
    websiteUrl: profileSettingsResponse?.activeRanch?.websiteUrl || "",
    latitude:
      profileSettingsResponse?.activeRanch?.latitude === null ||
      profileSettingsResponse?.activeRanch?.latitude === undefined
        ? ""
        : String(profileSettingsResponse.activeRanch.latitude),
    longitude:
      profileSettingsResponse?.activeRanch?.longitude === null ||
      profileSettingsResponse?.activeRanch?.longitude === undefined
        ? ""
        : String(profileSettingsResponse.activeRanch.longitude),
  };
}

function createAddProfileForm(personId) {
  return {
    personId: personId || 0,
    ranchId: "",
    roleId: "",
  };
}

function normalizeManagersForDisplay(items) {
  var map = new Map();

  (items || []).forEach(function (item) {
    var key = item.adminPersonId;

    if (!map.has(key)) {
      map.set(key, {
        adminPersonId: item.adminPersonId,
        firstName: item.firstName || "",
        lastName: item.lastName || "",
        cellPhone: item.cellPhone || "",
        email: item.email || "",
        ranchName: item.ranchName ? [item.ranchName] : [],
        roleId: item.roleId || 0,
        roleName: item.roleName || "",
        approvalStatus: item.approvalStatus || "",
        requestDate: item.requestDate || null,
        updateDate: item.updateDate || null,
      });

      return;
    }

    var current = map.get(key);

    if (
      item.ranchName &&
      current.ranchName.indexOf(item.ranchName) === -1
    ) {
      current.ranchName.push(item.ranchName);
    }
  });

  return Array.from(map.values()).map(function (item) {
    return {
      adminPersonId: item.adminPersonId,
      firstName: item.firstName,
      lastName: item.lastName,
      cellPhone: item.cellPhone,
      email: item.email,
      ranchName: item.ranchName.join(", "),
      roleId: item.roleId,
      roleName: item.roleName,
      approvalStatus: item.approvalStatus,
      requestDate: item.requestDate,
      updateDate: item.updateDate,
    };
  });
}

export {
  getProfileUiConfig,
  buildMobileProfileRows,
  createUserForm,
  createRanchForm,
  createAddProfileForm,
  normalizeManagersForDisplay,
};