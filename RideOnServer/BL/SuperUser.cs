using RideOnServer.BL.DTOs.Auth;
using RideOnServer.BL.DTOs.Auth.SuperUser;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class SuperUser
    {
        public int SuperUserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string PasswordSalt { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool MustChangePassword { get; set; }

        internal static SuperUser? GetSuperUserForLogin(string email)
        {
            SuperUserDAL dal = new SuperUserDAL();
            return dal.GetSuperUserForLogin(email);
        }

        internal static SuperUser? GetSuperUserById(int superUserId)
        {
            SuperUserDAL dal = new SuperUserDAL();
            return dal.GetSuperUserById(superUserId);
        }

        internal static bool CheckSuperUserEmailExists(string email)
        {
            SuperUserDAL dal = new SuperUserDAL();
            return dal.CheckSuperUserEmailExists(email);
        }

        internal static SuperUser? Login(string email, string password)
        {
            SuperUser? superUser = GetSuperUserForLogin(email);

            if (superUser == null)
                return null;

            if (!superUser.IsActive)
                return null;

            if (!PasswordHelper.VerifyPassword(password, superUser.PasswordSalt, superUser.PasswordHash))
                return null;

            SuperUserDAL dal = new SuperUserDAL();
            dal.UpdateSuperUserLastLogin(superUser.SuperUserId);

            return superUser;
        }

        internal static int CreateSuperUser(string email, string password)
        {
            SuperUserDAL dal = new SuperUserDAL();

            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Email is required");

            if (!IsValidEmail(email))
                throw new Exception("Invalid email format");

            if (string.IsNullOrWhiteSpace(password))
                throw new Exception("Password is required");

            if (dal.CheckSuperUserEmailExists(email))
                throw new Exception("Email already exists");

            PasswordPolicyValidator.ValidateOrThrow(password);

            string passwordSalt = PasswordHelper.GenerateSalt();
            string passwordHash = PasswordHelper.HashPassword(password, passwordSalt);

            return dal.InsertSuperUser(email, passwordHash, passwordSalt, true);
        }

        internal static void ChangePassword(int superUserId, string currentPassword, string newPassword)
        {
            SuperUserDAL dal = new SuperUserDAL();
            SuperUser? superUser = dal.GetSuperUserById(superUserId);

            if (superUser == null)
                throw new Exception("Super user not found");

            if (!superUser.IsActive)
                throw new Exception("Super user is inactive");

            if (!PasswordHelper.VerifyPassword(currentPassword, superUser.PasswordSalt, superUser.PasswordHash))
                throw new Exception("Current password is incorrect");

            if (currentPassword == newPassword)
                throw new Exception("New password must be different from current password");

            PasswordPolicyValidator.ValidateOrThrow(newPassword);

            string newSalt = PasswordHelper.GenerateSalt();
            string newHash = PasswordHelper.HashPassword(newPassword, newSalt);

            dal.UpdateSuperUserPassword(superUserId, newHash, newSalt);
        }

        private static bool IsValidEmail(string email)
        {
            return !string.IsNullOrWhiteSpace(email)
                   && email.Contains("@")
                   && email.Contains(".");
        }

        internal static List<RoleRequest> GetRoleRequests(byte roleId, string? status, string? searchText)
        {
            SuperUserDAL dal = new SuperUserDAL();
            return dal.GetRoleRequests(roleId, status, searchText);
        }

        internal static List<NewRanchRequest> GetNewRanchRequests(string? status, string? searchText)
        {
            SuperUserDAL dal = new SuperUserDAL();
            return dal.GetNewRanchRequests(status, searchText);
        }

        internal static void UpdateRoleRequestStatus(int personId, int ranchId, byte roleId, string roleStatus)
        {
            if (roleStatus != "Approved" && roleStatus != "Rejected")
            {
                throw new Exception("Invalid role status. Only Approved or Rejected are allowed.");
            }

            if (roleStatus == "Approved")
            {
                SuperUserDAL dal = new SuperUserDAL();
                string ranchStatus = dal.GetRanchStatusById(ranchId);

                if (ranchStatus != "Approved")
                {
                    throw new Exception("Cannot approve role request before ranch is approved.");
                }
            }

            SuperUserDAL finalDal = new SuperUserDAL();
            finalDal.UpdateRoleRequestStatus(personId, ranchId, roleId, roleStatus);
        }

        internal static void UpdateNewRanchRequestStatus(int requestId, int resolvedBySuperUserId, string newStatus)
        {
            if (newStatus != "Approved" && newStatus != "Rejected")
            {
                throw new Exception("Invalid request status. Only Approved or Rejected are allowed.");
            }

            SuperUserDAL dal = new SuperUserDAL();
            dal.UpdateNewRanchRequestStatus(requestId, resolvedBySuperUserId, newStatus);
        }

        internal static List<SuperUserListItem> GetAllSuperUsers()
        {
            SuperUserDAL dal = new SuperUserDAL();
            return dal.GetAllSuperUsers();
        }


    }
}