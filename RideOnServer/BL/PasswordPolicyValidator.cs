using System.Text.RegularExpressions;

namespace RideOnServer.BL
{
    public static class PasswordPolicyValidator
    {
        public static void ValidateOrThrow(string? password)
        {
            string validationMessage = GetValidationMessage(password);

            if (!string.IsNullOrEmpty(validationMessage))
            {
                throw new Exception(validationMessage);
            }
        }

        public static string GetValidationMessage(string? password)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                return "Password is required";
            }

            if (password.Length < 8)
            {
                return "Password must contain at least 8 characters";
            }

            if (password.Any(char.IsWhiteSpace))
            {
                return "Password must not contain spaces";
            }

            if (!Regex.IsMatch(password, "[A-Z]"))
            {
                return "Password must contain at least one uppercase English letter";
            }

            if (!Regex.IsMatch(password, "[a-z]"))
            {
                return "Password must contain at least one lowercase English letter";
            }

            if (!Regex.IsMatch(password, "[0-9]"))
            {
                return "Password must contain at least one digit";
            }

            return string.Empty;
        }
    }
}