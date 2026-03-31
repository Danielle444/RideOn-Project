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
    return "/competitions";
  }

  if (approvedRolesAndRanches.length === 0) {
    return "/login";
  }

  if (approvedRolesAndRanches.length === 1) {
    return "/competitions";
  }

  return "/select-ranch";
}

export { getPostLoginRoute };