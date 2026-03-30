function mapGenderToFormValue(genderValue) {
  if (!genderValue) {
    return "";
  }

  var normalized = String(genderValue).trim().toLowerCase();

  if (
    normalized === "m" ||
    normalized === "male" ||
    normalized === "זכר" ||
    normalized === "גבר"
  ) {
    return "M";
  }

  if (
    normalized === "f" ||
    normalized === "female" ||
    normalized === "נקבה" ||
    normalized === "אישה"
  ) {
    return "F";
  }

  return "";
}

function filterRegisterRoles(roles) {
  if (!Array.isArray(roles)) {
    return [];
  }

  return roles.filter(function (role) {
    return String(role.roleName).trim() !== "משלם";
  });
}

export { mapGenderToFormValue, filterRegisterRoles };