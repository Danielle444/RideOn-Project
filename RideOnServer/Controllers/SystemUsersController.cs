using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using RideOnServer.BL.DTOs.Auth.SuperUser;
using RideOnServer.DAL;

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

                List<ApprovedRoleRanch> approvedRolesAndRanches = SystemUser.GetApprovedPersonRanchesAndRoles(systemUser.PersonId);

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
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest registerRequest)
        {
            try
            {
                OtpService otpService = new OtpService(_configuration);
                if (!otpService.VerifyOtp(registerRequest.Email, registerRequest.OtpCode))
                    return BadRequest("קוד האימות אינו תקף או פג תוקפו");

                RegisterResponse response = SystemUser.Register(registerRequest);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
        [HttpPost("{personId}/roles")]
        public IActionResult AssignRoleToPerson(int personId, [FromBody] AssignRoleRequest request)
        {
            if (personId != request.PersonId)
            {
                return BadRequest("PersonId in URL does not match body.");
            }

            try
            {
                SystemUser.AssignRoleToExistingUser(request.PersonId, request.RanchId, request.RoleId);
                return Ok("Role assigned successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("role-status")]
        public IActionResult UpdatePersonRoleStatus([FromBody] UpdatePersonRoleStatusRequest request)
        {
            try
            {
                SystemUser.UpdatePersonRoleStatus(
                    request.PersonId,
                    request.RanchId,
                    request.RoleId,
                    request.RoleStatus
                );

                return Ok("Role status updated successfully");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                SystemUser.ChangePassword(request);
                return Ok("Password changed successfully");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("must-change-password")]
        public IActionResult SetMustChangePassword([FromBody] SetMustChangePasswordRequest request)
        {
            try
            {
                SystemUser.SetMustChangePassword(request.SystemUserId, request.MustChangePassword);
                return Ok("MustChangePassword updated successfully");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("check-username")]
        public IActionResult CheckUsername([FromQuery] string username)
        {
            try
            {
                bool exists = SystemUser.CheckUsernameExists(username);
                return Ok(new { exists });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("ranch-request")]
        public IActionResult CreateRanchRequest([FromBody] CreateRanchRequest request)
        {
            try
            {
                int requestId = SystemUser.CreatePendingRanchRequest(request);

                return Ok(new
                {
                    RequestId = requestId,
                    Message = "Ranch request created successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("send-otp")]
        public IActionResult SendOtp([FromBody] SendOtpRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Email))
                    return BadRequest("כתובת מייל נדרשת");

                if (!request.Email.Contains("@") || !request.Email.Contains("."))
                    return BadRequest("כתובת מייל אינה תקינה");

                OtpService otpService = new OtpService(_configuration);
                otpService.SendAndStoreOtp(request.Email);
                return Ok(new { message = "קוד אימות נשלח למייל" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("forgot-password")]
        public IActionResult ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Email))
                    return BadRequest("כתובת מייל נדרשת");

                PasswordResetService service = new PasswordResetService(_configuration);
                service.RequestReset(request.Email);
                return Ok(new { message = "אם המייל קיים במערכת, ישלח אליך קישור לאיפוס" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("reset-password")]
        public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Token) || string.IsNullOrWhiteSpace(request.NewPassword))
                    return BadRequest("פרטים חסרים");

                PasswordResetService service = new PasswordResetService(_configuration);
                service.ResetPassword(request.Token, request.NewPassword);
                return Ok(new { message = "הסיסמה אופסה בהצלחה" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }


    }
}
