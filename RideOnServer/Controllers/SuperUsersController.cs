using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs;
using System.Security.Claims;

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
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult CreateSuperUser([FromBody] CreateSuperUserRequest request)
        {
            try
            {
                string? userType = User.Claims.FirstOrDefault(c => c.Type == "UserType")?.Value;

                if (userType != "SuperUser")
                {
                    return Forbid("Only super users can create new super users");
                }

                int newSuperUserId = SuperUser.CreateSuperUser(request.Email, request.Password);

                return Ok(new
                {
                    SuperUserId = newSuperUserId,
                    Message = "Super user created successfully"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangeSuperUserPasswordRequest request)
        {
            try
            {
                string? userType = User.Claims.FirstOrDefault(c => c.Type == "UserType")?.Value;

                if (userType != "SuperUser")
                {
                    return Forbid("Only super users can change password here");
                }

                string? superUserIdClaim = User.Claims.FirstOrDefault(c => c.Type == "SuperUserId")?.Value;

                if (string.IsNullOrWhiteSpace(superUserIdClaim))
                {
                    return Unauthorized("SuperUserId claim is missing");
                }

                int superUserId = int.Parse(superUserIdClaim);

                SuperUser.ChangePassword(superUserId, request.CurrentPassword, request.NewPassword);

                return Ok("Password changed successfully");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult GetMe()
        {
            try
            {
                string? userType = User.Claims.FirstOrDefault(c => c.Type == "UserType")?.Value;

                if (userType != "SuperUser")
                {
                    return Forbid("Only super users can access this endpoint");
                }

                string? superUserIdClaim = User.Claims.FirstOrDefault(c => c.Type == "SuperUserId")?.Value;

                if (string.IsNullOrWhiteSpace(superUserIdClaim))
                {
                    return Unauthorized("SuperUserId claim is missing");
                }

                int superUserId = int.Parse(superUserIdClaim);

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
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}