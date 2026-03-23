using System.Security.Cryptography;
using System.Text;

namespace RideOnServer.BL
{
    public class PasswordHelper
    {
        public static string GenerateSalt()
        {
            byte[] saltBytes = new byte[16];

            using (RandomNumberGenerator rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(saltBytes);
            }

            return Convert.ToBase64String(saltBytes);
        }

        public static string HashPassword(string password, string salt)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                string saltedPassword = password + salt;
                byte[] bytes = Encoding.UTF8.GetBytes(saltedPassword);
                byte[] hashBytes = sha256.ComputeHash(bytes);

                StringBuilder builder = new StringBuilder();

                foreach (byte b in hashBytes)
                {
                    builder.Append(b.ToString("x2"));
                }

                return builder.ToString();
            }
        }

        public static bool VerifyPassword(string password, string storedSalt, string storedHash)
        {
            string hashedInputPassword = HashPassword(password, storedSalt);
            return hashedInputPassword == storedHash;
        }
    }
}