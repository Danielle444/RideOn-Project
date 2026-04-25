using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using RideOnServer.BL.DTOs.Auth.SuperUser;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SuperUsersController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public SuperUsersController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] SuperUserLoginRequest loginRequest)
        {
            try
            {
                SuperUser? superUser = SuperUser.Login(loginRequest.Email, loginRequest.Password);

                if (superUser == null)
                {
                    return Unauthorized("Invalid email or password");
                }

                string token = JwtHelper.GenerateSuperUserToken(superUser, _configuration);

                SuperUserLoginResponse response = new SuperUserLoginResponse
                {
                    SuperUserId = superUser.SuperUserId,
                    Email = superUser.Email,
                    IsActive = superUser.IsActive,
                    MustChangePassword = superUser.MustChangePassword,
                    Token = token
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SuperUser Login: {ex.Message}");
                return BadRequest("אירעה שגיאה בהתחברות מנהל מערכת");
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult CreateSuperUser([FromBody] CreateSuperUserRequest request)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                int newSuperUserId = SuperUser.CreateSuperUser(request.Email, request.Password);

                return Ok(new
                {
                    SuperUserId = newSuperUserId,
                    Message = "Super user created successfully"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateSuperUser: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת מנהל מערכת");
            }
        }

        [Authorize]
        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangeSuperUserPasswordRequest request)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                int superUserId = UserAccessValidator.GetSuperUserIdFromClaims(User);

                SuperUser.ChangePassword(superUserId, request.CurrentPassword, request.NewPassword);

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
        [HttpGet("me")]
        public IActionResult GetMe()
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                int superUserId = UserAccessValidator.GetSuperUserIdFromClaims(User);

                SuperUser? superUser = SuperUser.GetSuperUserById(superUserId);

                if (superUser == null)
                {
                    return NotFound("Super user not found");
                }

                return Ok(new
                {
                    superUser.SuperUserId,
                    superUser.Email,
                    superUser.IsActive,
                    superUser.MustChangePassword
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMe: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פרטי מנהל מערכת");
            }
        }

        [Authorize]
        [HttpGet("role-requests")]
        public IActionResult GetRoleRequests(
            [FromQuery] byte roleId,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                var list = SuperUser.GetRoleRequests(roleId, status, search);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetRoleRequests: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת בקשות תפקיד");
            }
        }

        [Authorize]
        [HttpGet("ranch-requests")]
        public IActionResult GetNewRanchRequests(
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                var list = SuperUser.GetNewRanchRequests(status, search);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetNewRanchRequests: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת בקשות חווה");
            }
        }

        [Authorize]
        [HttpPut("role-requests/status")]
        public IActionResult UpdateRoleRequestStatus([FromBody] UpdateRoleRequestStatusRequest request)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                SuperUser.UpdateRoleRequestStatus(
                    request.PersonId,
                    request.RanchId,
                    request.RoleId,
                    request.RoleStatus
                );

                return Ok("Role request status updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateRoleRequestStatus: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון סטטוס בקשת תפקיד");
            }
        }

        [Authorize]
        [HttpPut("ranch-requests/status")]
        public IActionResult UpdateNewRanchRequestStatus([FromBody] UpdateNewRanchRequestStatusRequest request)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                int superUserId = UserAccessValidator.GetSuperUserIdFromClaims(User);

                if (request.ResolvedBySuperUserId != 0 && request.ResolvedBySuperUserId != superUserId)
                {
                    return BadRequest("ResolvedBySuperUserId does not match logged-in super user");
                }

                SuperUser.UpdateNewRanchRequestStatus(
                    request.RequestId,
                    superUserId,
                    request.NewStatus
                );

                return Ok("New ranch request status updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateNewRanchRequestStatus: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון סטטוס בקשת חווה");
            }
        }

        [HttpPost("forgot-password")]
        public IActionResult ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Email))
                    return BadRequest("כתובת מייל נדרשת");

                string email = request.Email.Trim();

                SuperUser? superUser = SuperUser.GetSuperUserForLogin(email);

                if (superUser != null && superUser.IsActive)
                {
                    OtpService otpService = new OtpService(_configuration);
                    otpService.SendAndStoreOtp(email);
                }

                return Ok(new { message = "אם המייל קיים במערכת, ישלח אליך קוד לאיפוס הסיסמה" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SuperUser ForgotPassword: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליחת קוד האיפוס");
            }
        }

        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] SuperUserResetPasswordRequest request)
        {
            try
            {
                if (request == null ||
                    string.IsNullOrWhiteSpace(request.Email) ||
                    string.IsNullOrWhiteSpace(request.OtpCode) ||
                    string.IsNullOrWhiteSpace(request.NewPassword))
                    return BadRequest("פרטים חסרים");

                SuperUser.ResetPasswordWithOtp(request.Email.Trim(), request.OtpCode.Trim(), request.NewPassword, _configuration);

                return Ok(new { message = "הסיסמה אופסה בהצלחה" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SuperUser ResetPassword: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet]
        public IActionResult GetAllSuperUsers()
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                List<SuperUserListItem> list = SuperUser.GetAllSuperUsers();
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllSuperUsers: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מנהלי מערכת");
            }
        }
    }
}