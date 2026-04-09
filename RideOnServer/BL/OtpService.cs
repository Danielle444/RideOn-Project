using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class OtpService
    {
        private readonly EmailService _emailService;

        public OtpService(IConfiguration configuration)
        {
            _emailService = new EmailService(configuration);
        }

        public void SendAndStoreOtp(string email)
        {
            string otpCode = GenerateOtp();
            string otpHash = PasswordHelper.HashPassword(otpCode, "otp-salt");
            DateTime expiresAt = DateTime.UtcNow.AddMinutes(10);

            OtpDAL dal = new OtpDAL();
            dal.SaveOtp(email, otpHash, expiresAt);

            _emailService.SendOtpEmail(email, otpCode);
        }

        public bool VerifyOtp(string email, string code)
        {
            OtpDAL dal = new OtpDAL();
            var record = dal.GetValidOtp(email);

            if (record == null)
                return false;

            string inputHash = PasswordHelper.HashPassword(code, "otp-salt");

            if (inputHash != record.Value.OtpHash)
                return false;

            dal.MarkOtpAsUsed(record.Value.OtpId);
            return true;
        }

        private static string GenerateOtp()
        {
            Random rng = new Random();
            return rng.Next(100000, 999999).ToString();
        }
    }
}
