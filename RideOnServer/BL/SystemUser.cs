using RideOnServer.DAL;
using RideOnServer.BL.DTOs;

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

        internal static RegisterResponse Register(RegisterRequest request)
        {
            SystemUserDAL dal = new SystemUserDAL();

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

            SystemUser? systemUser = GetSystemUserForLogin(request.Username);

            if (systemUser == null)
            {
                throw new Exception("User not found");
            }

            if (!systemUser.IsActive)
            {
                throw new Exception("User is inactive");
            }

            if (!PasswordHelper.VerifyPassword(request.CurrentPassword, systemUser.PasswordSalt, systemUser.PasswordHash))
            {
                throw new Exception("Current password is incorrect");
            }

            string newSalt = PasswordHelper.GenerateSalt();
            string newHash = PasswordHelper.HashPassword(request.NewPassword, newSalt);

            dal.UpdateSystemUserPassword(systemUser.PersonId, newHash, newSalt);
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
    }
}