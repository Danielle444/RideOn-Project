using RideOnServer.BL.DTOs;

namespace RideOnServer.BL
{
    public static class UserAccessValidator
    {
        public static bool HasUserRoleInRanch(int personId, int ranchId, string requiredRoleName)
        {
            if (personId <= 0 || ranchId <= 0 || string.IsNullOrWhiteSpace(requiredRoleName))
            {
                return false;
            }

            List<ApprovedRoleRanch> approvedRolesAndRanches =
                SystemUser.GetApprovedPersonRanchesAndRoles(personId);

            return approvedRolesAndRanches.Any(item =>
                item.RanchId == ranchId &&
                !string.IsNullOrWhiteSpace(item.RoleName) &&
                item.RoleName.Trim().Equals(requiredRoleName.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        public static void EnsureUserHasRoleInRanch(int personId, int ranchId, string requiredRoleName)
        {
            if (!HasUserRoleInRanch(personId, ranchId, requiredRoleName))
            {
                throw new UnauthorizedAccessException("אין לך הרשאה לבצע פעולה זו עבור החווה שנבחרה");
            }
        }
    }
}