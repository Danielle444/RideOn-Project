using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using RideOnServer.BL.DTOs.Auth.SuperUser;
using RideOnServer.BL.DTOs.Profile;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SystemUsersController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public SystemUsersController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest loginRequest)
        {
            try
            {
                SystemUser? systemUser = SystemUser.Login(loginRequest.Username, loginRequest.Password);

                if (systemUser == null)
                {
                    return Unauthorized("Invalid username, password, or no approved role");
                }

                List<ApprovedRoleRanch> approvedRolesAndRanches =
                    SystemUser.GetApprovedPersonRanchesAndRoles(systemUser.PersonId);

                string token = JwtHelper.GenerateToken(systemUser, approvedRolesAndRanches, _configuration);

                LoginResponse response = new LoginResponse
                {
                    PersonId = systemUser.PersonId,
                    Username = systemUser.Username,
                    FirstName = systemUser.FirstName,
                    LastName = systemUser.LastName,
                    IsActive = systemUser.IsActive,
                    MustChangePassword = systemUser.MustChangePassword,
                    Token = token,
                    ApprovedRolesAndRanches = approvedRolesAndRanches
                };

                return Ok(response);
            }
            catch (InvalidOperationException ex) when (ex.Message == "PENDING_APPROVAL")
            {
                return BadRequest("PENDING_APPROVAL");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SystemUser Login: {ex.Message}");
                return BadRequest("אירעה שגיאה בהתחברות");
            }
        }

        [Authorize]
        [HttpGet("profile-settings")]
        public IActionResult GetProfileSettings(
            [FromQuery] int personId,
            [FromQuery] int ranchId,
            [FromQuery] byte roleId)
        {
            try
            {
                UserAccessValidator.EnsureCurrentUserIsPerson(User, personId);

                ProfileSettingsResponse response =
                    SystemUser.GetProfileSettings(personId, ranchId, roleId);

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetProfileSettings: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת הגדרות פרופיל");
            }
        }

        [Authorize]
        [HttpPut("profile")]
        public IActionResult UpdateUserProfile([FromBody] UpdateUserProfileRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                UserAccessValidator.EnsureCurrentUserIsPerson(User, request.PersonId);

                SystemUser.UpdateUserProfile(request);
                return Ok("User profile updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateUserProfile: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון פרופיל");
            }
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest registerRequest)
        {
            try
            {
                if (registerRequest == null)
                {
                    return BadRequest("Invalid request");
                }

                OtpService otpService = new OtpService(_configuration);

                if (!otpService.VerifyOtp(registerRequest.Email, registerRequest.OtpCode))
                {
                    return BadRequest("קוד האימות אינו תקף או פג תוקפו");
                }

                RegisterResponse response = SystemUser.Register(registerRequest);
                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Register: {ex.Message}");
                return BadRequest("אירעה שגיאה בהרשמה");
            }
        }

        [Authorize]
        [HttpPost("{personId}/roles")]
        public IActionResult AssignRoleToPerson(int personId, [FromBody] AssignRoleRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (personId != request.PersonId)
                {
                    return BadRequest("PersonId in URL does not match body.");
                }

                UserAccessValidator.EnsureCurrentUserIsPerson(User, request.PersonId);

                SystemUser.AssignRoleToExistingUser(request.PersonId, request.RanchId, request.RoleId);
                return Ok("Role assigned successfully.");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AssignRoleToPerson: {ex.Message}");
                return BadRequest("אירעה שגיאה בשיוך תפקיד");
            }
        }

        [Authorize]
        [HttpPut("role-status")]
        public IActionResult UpdatePersonRoleStatus([FromBody] UpdatePersonRoleStatusRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                UserAccessValidator.EnsureSuperUser(User);

                SystemUser.UpdatePersonRoleStatus(
                    request.PersonId,
                    request.RanchId,
                    request.RoleId,
                    request.RoleStatus
                );

                return Ok("Role status updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdatePersonRoleStatus: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון סטטוס תפקיד");
            }
        }

        [Authorize]
        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                if (request.PersonId != currentPersonId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה לשנות סיסמה עבור משתמש אחר"
                    );
                }

                SystemUser.ChangePassword(request);
                return Ok("Password changed successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ChangePassword: {ex.Message}");
                return BadRequest("אירעה שגיאה בשינוי סיסמה");
            }
        }

        [Authorize]
        [HttpPut("must-change-password")]
        public IActionResult SetMustChangePassword([FromBody] SetMustChangePasswordRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                UserAccessValidator.EnsureSuperUser(User);

                SystemUser.SetMustChangePassword(request.SystemUserId, request.MustChangePassword);
                return Ok("MustChangePassword updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SetMustChangePassword: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון חובת שינוי סיסמה");
            }
        }

        [HttpGet("check-username")]
        public IActionResult CheckUsername([FromQuery] string username)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(username))
                {
                    return BadRequest("שם משתמש נדרש");
                }

                bool exists = SystemUser.CheckUsernameExists(username.Trim());
                return Ok(new { exists });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CheckUsername: {ex.Message}");
                return BadRequest("אירעה שגיאה בבדיקת שם משתמש");
            }
        }

        [HttpPost("ranch-request")]
        public IActionResult CreateRanchRequest([FromBody] CreateRanchRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int requestId = SystemUser.CreatePendingRanchRequest(request);

                return Ok(new
                {
                    RequestId = requestId,
                    Message = "Ranch request created successfully"
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateRanchRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת בקשת חווה");
            }
        }

        [HttpPost("send-otp")]
        public IActionResult SendOtp([FromBody] SendOtpRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Email))
                {
                    return BadRequest("כתובת מייל נדרשת");
                }

                string email = request.Email.Trim();

                if (!email.Contains("@") || !email.Contains("."))
                {
                    return BadRequest("כתובת מייל אינה תקינה");
                }

                OtpService otpService = new OtpService(_configuration);
                otpService.SendAndStoreOtp(email);

                return Ok(new { message = "קוד אימות נשלח למייל" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SendOtp: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליחת קוד אימות");
            }
        }

        [HttpPost("forgot-password")]
        public IActionResult ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Email))
                {
                    return BadRequest("כתובת מייל נדרשת");
                }

                PasswordResetService service = new PasswordResetService(_configuration);
                service.RequestReset(request.Email.Trim());

                return Ok(new { message = "אם המייל קיים במערכת, ישלח אליך קישור לאיפוס" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ForgotPassword: {ex.Message}");
                return BadRequest("אירעה שגיאה בבקשת איפוס סיסמה");
            }
        }

        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (
                    request == null ||
                    string.IsNullOrWhiteSpace(request.Token) ||
                    string.IsNullOrWhiteSpace(request.NewPassword)
                )
                {
                    return BadRequest("פרטים חסרים");
                }

                PasswordResetService service = new PasswordResetService(_configuration);
                service.ResetPassword(request.Token, request.NewPassword);

                return Ok(new { message = "הסיסמה אופסה בהצלחה" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ResetPassword: {ex.Message}");
                return BadRequest("אירעה שגיאה באיפוס סיסמה");
            }
        }
    }
}