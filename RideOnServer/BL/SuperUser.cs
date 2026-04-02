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

            return dal.InsertSuperUser(email, passwordHash, passwordSalt);
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
    }
}