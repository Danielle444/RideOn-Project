using RideOnServer.DAL;
using RideOnServer.BL.DTOs.Auth;
using RideOnServer.BL.DTOs.Profile;

namespace RideOnServer.BL
{
    public class SystemUser : Person
    {
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string PasswordSalt { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool MustChangePassword { get; set; }
        public DateTime CreatedDate { get; set; }

        internal static SystemUser? GetSystemUserForLogin(string username)
        {
            SystemUserDAL dal = new SystemUserDAL();
            return dal.GetSystemUserForLogin(username);
        }


        internal static SystemUser? Login(string username, string password)
        {
            SystemUser? systemUser = GetSystemUserForLogin(username);

            if (systemUser == null)
                return null;

            if (!systemUser.IsActive)
                return null;

            if (!PasswordHelper.VerifyPassword(password, systemUser.PasswordSalt, systemUser.PasswordHash))
                return null;

            List<ApprovedRoleRanch> approvedRolesAndRanches = GetApprovedPersonRanchesAndRoles(systemUser.PersonId);

            if (approvedRolesAndRanches.Count == 0)
                return null;

            return systemUser;
        }

        internal static List<ApprovedRoleRanch> GetApprovedPersonRanchesAndRoles(int personId)
        {
            SystemUserDAL dal = new SystemUserDAL();
            return dal.GetApprovedPersonRanchesAndRoles(personId);
        }

        internal static List<UserProfileRole> GetPersonRanchesAndRoles(int personId)
        {
            SystemUserDAL dal = new SystemUserDAL();
            return dal.GetPersonRanchesAndRoles(personId);
        }

        internal static SystemUserProfile GetSystemUserProfileById(int systemUserId)
        {
            SystemUserDAL dal = new SystemUserDAL();
            SystemUserProfile? profile = dal.GetSystemUserProfileById(systemUserId);

            if (profile == null)
            {
                throw new Exception("System user not found");
            }

            return profile;
        }

        internal static ProfileSettingsResponse GetProfileSettings(int personId, int ranchId, byte roleId)
        {
            SystemUserProfile userProfile = GetSystemUserProfileById(personId);
            RanchProfile activeRanch = Ranch.GetRanchById(ranchId);

            List<ApprovedRoleRanch> approvedProfiles = GetApprovedPersonRanchesAndRoles(personId);
            List<UserProfileRole> allProfiles = GetPersonRanchesAndRoles(personId);

            UserProfileRole? activeProfile = allProfiles.FirstOrDefault(functionProfile =>
                functionProfile.RanchId == ranchId && functionProfile.RoleId == roleId);

            if (activeProfile == null)
            {
                throw new Exception("Active profile not found for this user");
            }

            return new ProfileSettingsResponse
            {
                UserProfile = userProfile,
                ActiveRanch = activeRanch,
                ActiveProfile = activeProfile,
                ApprovedProfiles = approvedProfiles,
                AllProfiles = allProfiles
            };
        }

        internal static void UpdateUserProfile(UpdateUserProfileRequest request)
        {
            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                throw new Exception("FirstName is required");
            }

            if (string.IsNullOrWhiteSpace(request.LastName))
            {
                throw new Exception("LastName is required");
            }

            SystemUserDAL dal = new SystemUserDAL();
            dal.UpdateUserProfile(request);
        }

        internal static RegisterResponse Register(RegisterRequest request)
        {
            SystemUserDAL dal = new SystemUserDAL();

            if (string.IsNullOrWhiteSpace(request.Username))
            {
                throw new Exception("Username is required");
            }

            if (dal.CheckUsernameExists(request.Username))
            {
                throw new Exception("Username already exists");
            }

            if (request.RanchRoles == null || request.RanchRoles.Count == 0)
            {
                throw new Exception("At least one ranch and role pair is required");
            }

            foreach (RegisterRanchRoleRequest pair in request.RanchRoles)
            {
                if (pair.RanchId <= 0)
                {
                    throw new Exception("Invalid RanchId");
                }

                if (pair.RoleId <= 0)
                {
                    throw new Exception("Invalid RoleId");
                }
            }

            PasswordPolicyValidator.ValidateOrThrow(request.Password);

            string passwordSalt = PasswordHelper.GenerateSalt();
            string passwordHash = PasswordHelper.HashPassword(request.Password, passwordSalt);

            int newPersonId = dal.RegisterSystemUserWithRoles(request, passwordHash, passwordSalt);

            return new RegisterResponse
            {
                PersonId = newPersonId,
                Username = request.Username,
                Message = "User registered successfully"
            };
        }

        internal static void UpdatePersonRoleStatus(int personId, int ranchId, byte roleId, string roleStatus)
        {
            SystemUserDAL dal = new SystemUserDAL();
            dal.UpdatePersonRoleStatus(personId, ranchId, roleId, roleStatus);
        }

        internal static void ChangePassword(ChangePasswordRequest request)
        {
            SystemUserDAL dal = new SystemUserDAL();

            SystemUser? systemUser = dal.GetSystemUserByPersonId(request.PersonId);

            if (systemUser == null)
            {
                throw new Exception("User not found");
            }

            if (!systemUser.IsActive)
            {
                throw new Exception("User is inactive");
            }

            if (!PasswordHelper.VerifyPassword(
                request.CurrentPassword,
                systemUser.PasswordSalt,
                systemUser.PasswordHash))
            {
                throw new Exception("Current password is incorrect");
            }

            string newSalt = PasswordHelper.GenerateSalt();
            string newHash = PasswordHelper.HashPassword(request.NewPassword, newSalt);

            dal.UpdateSystemUserPassword(request.PersonId, newHash, newSalt);
        }

        internal static void SetMustChangePassword(int systemUserId, bool mustChangePassword)
        {
            SystemUserDAL dal = new SystemUserDAL();
            dal.SetMustChangePassword(systemUserId, mustChangePassword);
        }

        internal static void AssignRoleToExistingUser(int personId, int ranchId, byte roleId)
        {
            SystemUserDAL dal = new SystemUserDAL();
            dal.AssignRoleToExistingUser(personId, ranchId, roleId);
        }

        internal static bool CheckUsernameExists(string username)
        {
            SystemUserDAL dal = new SystemUserDAL();
            return dal.CheckUsernameExists(username);
        }

        internal static int CreatePendingRanchRequest(CreateRanchRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.RanchName))
                throw new Exception("Ranch name is required");

            SystemUserDAL dal = new SystemUserDAL();
            return dal.CreatePendingRanchRequest(request);
        }
    }
}