function getPostLoginRoute(user, activeRole) {
  if (!user) {
    return "/login";
  }

  if (user.mustChangePassword) {
    return "/change-password";
  }

  if (
    !activeRole &&
    user.approvedRolesAndRanches &&
    user.approvedRolesAndRanches.length > 1
  ) {
    return "/select-ranch";
  }

  if (
    user.approvedRolesAndRanches &&
    user.approvedRolesAndRanches.length >= 1
  ) {
    return "/dashboard";
  }

  return "/login";
}

export { getPostLoginRoute };