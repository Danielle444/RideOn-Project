using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RegistrationController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public RegistrationController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        // בדיקת תקינות טוקן הרשמה — פעולה פתוחה בכוונה כי המשתמש עדיין לא מחובר
        [HttpGet("validate")]
        public IActionResult ValidateToken([FromQuery] string token)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(token))
                {
                    return BadRequest("Token is required");
                }

                string tokenHash = PasswordHelper.HashPassword(token, "registration-salt");

                RegistrationDAL dal = new RegistrationDAL();
                var record = dal.GetValidRegistrationToken(tokenHash);

                if (record == null)
                {
                    return BadRequest("קישור לא תקין או שפג תוקפו");
                }

                // לא מחזירים PersonId כדי לא לחשוף מזהים פנימיים ללקוח
                return Ok(new { valid = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ValidateToken: {ex.Message}");
                return BadRequest("אירעה שגיאה בבדיקת קישור ההרשמה");
            }
        }

        // השלמת הרשמה — פעולה פתוחה בכוונה כי המשתמש עדיין לא מחובר
        [HttpPost("complete")]
        public IActionResult CompleteRegistration([FromBody] CompleteRegistrationRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (string.IsNullOrWhiteSpace(request.Token))
                {
                    return BadRequest("Token is required");
                }

                if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
                {
                    return BadRequest("הסיסמה חייבת להכיל לפחות 6 תווים");
                }

                string? firstName = NormalizeOptionalText(request.FirstName, 50);
                string? lastName = NormalizeOptionalText(request.LastName, 50);
                string? cellPhone = NormalizeOptionalText(request.CellPhone, 20);

                string tokenHash = PasswordHelper.HashPassword(request.Token, "registration-salt");

                RegistrationDAL dal = new RegistrationDAL();
                var record = dal.GetValidRegistrationToken(tokenHash);

                if (record == null)
                {
                    return BadRequest("קישור לא תקין או שפג תוקפו");
                }

                string salt = PasswordHelper.GenerateSalt();
                string passwordHash = PasswordHelper.HashPassword(request.Password, salt);

                dal.CompletePayerRegistration(
                    record.Value.TokenId,
                    record.Value.PersonId,
                    passwordHash,
                    salt,
                    firstName,
                    lastName,
                    cellPhone
                );

                return Ok(new
                {
                    message = "ההרשמה הושלמה בהצלחה. חשבונך ממתין לאישור מנהל המערכת."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CompleteRegistration: {ex.Message}");
                return BadRequest("אירעה שגיאה בהשלמת ההרשמה");
            }
        }

        private static string? NormalizeOptionalText(string? value, int maxLength)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            string trimmed = value.Trim();

            if (trimmed.Length > maxLength)
            {
                throw new ArgumentException("אחד השדות ארוך מדי");
            }

            return trimmed;
        }
    }

    public class CompleteRegistrationRequest
    {
        public string Token { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? CellPhone { get; set; }
    }
}