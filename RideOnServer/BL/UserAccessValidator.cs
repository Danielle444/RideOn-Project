using System.Security.Claims;
using RideOnServer.BL.DTOs.Auth;

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

        public static bool HasUserAnyRoleInRanch(int personId, int ranchId, params string[] requiredRoleNames)
        {
            if (personId <= 0 || ranchId <= 0 || requiredRoleNames == null || requiredRoleNames.Length == 0)
            {
                return false;
            }

            List<string> normalizedRequiredRoles = requiredRoleNames
                .Where(role => !string.IsNullOrWhiteSpace(role))
                .Select(role => role.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (normalizedRequiredRoles.Count == 0)
            {
                return false;
            }

            List<ApprovedRoleRanch> approvedRolesAndRanches =
                SystemUser.GetApprovedPersonRanchesAndRoles(personId);

            return approvedRolesAndRanches.Any(item =>
                item.RanchId == ranchId &&
                !string.IsNullOrWhiteSpace(item.RoleName) &&
                normalizedRequiredRoles.Contains(item.RoleName.Trim(), StringComparer.OrdinalIgnoreCase));
        }

        public static void EnsureUserHasRoleInRanch(int personId, int ranchId, string requiredRoleName)
        {
            if (!HasUserRoleInRanch(personId, ranchId, requiredRoleName))
            {
                throw new UnauthorizedAccessException("אין לך הרשאה לבצע פעולה זו עבור החווה שנבחרה");
            }
        }

        public static void EnsureUserHasAnyRoleInRanch(int personId, int ranchId, params string[] requiredRoleNames)
        {
            if (!HasUserAnyRoleInRanch(personId, ranchId, requiredRoleNames))
            {
                throw new UnauthorizedAccessException("אין לך הרשאה לבצע פעולה זו עבור החווה שנבחרה");
            }
        }

        public static bool IsSuperUser(ClaimsPrincipal user)
        {
            if (user == null)
            {
                return false;
            }

            string? userType = user.Claims.FirstOrDefault(c => c.Type == "UserType")?.Value;

            return !string.IsNullOrWhiteSpace(userType) &&
                   userType.Trim().Equals("SuperUser", StringComparison.OrdinalIgnoreCase);
        }

        public static void EnsureSuperUser(ClaimsPrincipal user)
        {
            if (!IsSuperUser(user))
            {
                throw new UnauthorizedAccessException("רק מנהל מערכת יכול לבצע פעולה זו");
            }
        }

        public static int GetPersonIdFromClaims(ClaimsPrincipal user)
        {
            if (user == null)
            {
                throw new UnauthorizedAccessException("משתמש לא מחובר");
            }

            string? personIdClaim = user.Claims.FirstOrDefault(c => c.Type == "PersonId")?.Value;

            if (string.IsNullOrWhiteSpace(personIdClaim))
            {
                throw new UnauthorizedAccessException("PersonId claim is missing");
            }

            if (!int.TryParse(personIdClaim, out int personId))
            {
                throw new UnauthorizedAccessException("PersonId claim is invalid");
            }

            return personId;
        }

        public static int GetSuperUserIdFromClaims(ClaimsPrincipal user)
        {
            if (user == null)
            {
                throw new UnauthorizedAccessException("משתמש לא מחובר");
            }

            string? superUserIdClaim = user.Claims.FirstOrDefault(c => c.Type == "SuperUserId")?.Value;

            if (string.IsNullOrWhiteSpace(superUserIdClaim))
            {
                throw new UnauthorizedAccessException("SuperUserId claim is missing");
            }

            if (!int.TryParse(superUserIdClaim, out int superUserId))
            {
                throw new UnauthorizedAccessException("SuperUserId claim is invalid");
            }

            return superUserId;
        }

        public static void EnsureCurrentUserIsPerson(ClaimsPrincipal user, int expectedPersonId)
        {
            int currentPersonId = GetPersonIdFromClaims(user);

            if (currentPersonId != expectedPersonId)
            {
                throw new UnauthorizedAccessException("אין לך הרשאה לבצע פעולה זו עבור משתמש אחר");
            }
        }
    }
}