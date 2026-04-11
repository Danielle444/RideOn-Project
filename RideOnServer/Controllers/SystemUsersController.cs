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
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
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

                ProfileSettingsResponse response = SystemUser.GetProfileSettings(personId, ranchId, roleId);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("profile")]
        public IActionResult UpdateUserProfile([FromBody] UpdateUserProfileRequest request)
        {
            try
            {
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
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("register")]
        public IActionResult Register([FromBody] RegisterRequest registerRequest)
        {
            try
            {
                RegisterResponse response = SystemUser.Register(registerRequest);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost("{personId}/roles")]
        public IActionResult AssignRoleToPerson(int personId, [FromBody] AssignRoleRequest request)
        {
            if (personId != request.PersonId)
            {
                return BadRequest("PersonId in URL does not match body.");
            }

            try
            {
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
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("role-status")]
        public IActionResult UpdatePersonRoleStatus([FromBody] UpdatePersonRoleStatusRequest request)
        {
            try
            {
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
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                if (request.PersonId != currentPersonId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לשנות סיסמה עבור משתמש אחר");
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
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("must-change-password")]
        public IActionResult SetMustChangePassword([FromBody] SetMustChangePasswordRequest request)
        {
            try
            {
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
    }
}