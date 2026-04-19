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

        // בדיקת תקינות טוקן הרשמה — הפרונט קורא לזה כשהמשלם פותח את הקישור
        [HttpGet("validate")]
        public IActionResult ValidateToken([FromQuery] string token)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(token))
                    return BadRequest("Token is required");

                string tokenHash = PasswordHelper.HashPassword(token, "registration-salt");
                RegistrationDAL dal = new RegistrationDAL();
                var record = dal.GetValidRegistrationToken(tokenHash);

                if (record == null)
                    return BadRequest("קישור לא תקין או שפג תוקפו");

                return Ok(new { valid = true, personId = record.Value.PersonId });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // השלמת הרשמה — המשלם מגיש טופס עם סיסמה + פרטים
        [HttpPost("complete")]
        public IActionResult CompleteRegistration([FromBody] CompleteRegistrationRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Token))
                    return BadRequest("Token is required");

                if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 6)
                    return BadRequest("הסיסמה חייבת להכיל לפחות 6 תווים");

                string tokenHash = PasswordHelper.HashPassword(request.Token, "registration-salt");
                RegistrationDAL dal = new RegistrationDAL();
                var record = dal.GetValidRegistrationToken(tokenHash);

                if (record == null)
                    return BadRequest("קישור לא תקין או שפג תוקפו");

                string salt = PasswordHelper.GenerateSalt();
                string passwordHash = PasswordHelper.HashPassword(request.Password, salt);

                dal.CompletePayerRegistration(
                    record.Value.TokenId,
                    record.Value.PersonId,
                    passwordHash,
                    salt,
                    string.IsNullOrWhiteSpace(request.FirstName) ? null : request.FirstName.Trim(),
                    string.IsNullOrWhiteSpace(request.LastName)  ? null : request.LastName.Trim(),
                    string.IsNullOrWhiteSpace(request.CellPhone) ? null : request.CellPhone.Trim()
                );

                return Ok(new { message = "ההרשמה הושלמה בהצלחה. חשבונך ממתין לאישור מנהל המערכת." });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }

    public class CompleteRegistrationRequest
    {
        public string Token    { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string? FirstName { get; set; }
        public string? LastName  { get; set; }
        public string? CellPhone { get; set; }
    }
}
