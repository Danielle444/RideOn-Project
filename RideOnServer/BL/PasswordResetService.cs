using RideOnServer.DAL;
using System.Security.Cryptography;

namespace RideOnServer.BL
{
    public class PasswordResetService
    {
        private readonly EmailService _emailService;
        private readonly IConfiguration _configuration;

        public PasswordResetService(IConfiguration configuration)
        {
            _configuration = configuration;
            _emailService = new EmailService(configuration);
        }

        public void RequestReset(string email)
        {
            PasswordResetDAL dal = new PasswordResetDAL();
            var user = dal.GetSystemUserByEmail(email);

            // תמיד מחזיר תגובה זהה — לא מגלים אם המייל קיים
            if (user == null || !user.Value.IsActive)
                return;

            string rawToken = GenerateToken();
            string tokenHash = PasswordHelper.HashPassword(rawToken, "reset-salt");
            DateTime expiresAt = DateTime.UtcNow.AddMinutes(30);

            dal.SaveResetToken(user.Value.SystemUserId, tokenHash, expiresAt);

            string clientBaseUrl = _configuration["ClientBaseUrl"] ?? "http://localhost:5173";
            string resetLink = $"{clientBaseUrl}/reset-password?token={rawToken}";

            _emailService.SendPasswordResetEmail(email, resetLink);
        }

        public void ResetPassword(string rawToken, string newPassword)
        {
            string tokenHash = PasswordHelper.HashPassword(rawToken, "reset-salt");

            PasswordResetDAL dal = new PasswordResetDAL();
            var record = dal.GetValidToken(tokenHash);

            if (record == null)
                throw new Exception("הקישור אינו תקף או פג תוקפו");

            PasswordPolicyValidator.ValidateOrThrow(newPassword);

            string newSalt = PasswordHelper.GenerateSalt();
            string newHash = PasswordHelper.HashPassword(newPassword, newSalt);

            SystemUserDAL userDal = new SystemUserDAL();
            userDal.UpdateSystemUserPassword(record.Value.SystemUserId, newHash, newSalt);

            dal.MarkTokenAsUsed(record.Value.TokenId);
        }

        private static string GenerateToken()
        {
            byte[] bytes = new byte[64];
            using RandomNumberGenerator rng = RandomNumberGenerator.Create();
            rng.GetBytes(bytes);
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");
        }
    }
}
