using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs;

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

        [HttpPost]
        public IActionResult CreateSuperUser([FromBody] CreateSuperUserRequest request)
        {
            try
            {
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

        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangeSuperUserPasswordRequest request)
        {
            try
            {
                SuperUser.ChangePassword(request.SuperUserId, request.CurrentPassword, request.NewPassword);
                return Ok("Password changed successfully");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}