using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Profile;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RanchesController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetAllRanchesNames()
        {
            try
            {
                List<Ranch> ranches = Ranch.GetAllRanchesNames();
                return Ok(ranches);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllRanchesNames: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת חוות");
            }
        }

        [HttpGet("for-registration")]
        public IActionResult GetRanchesForRegistration()
        {
            try
            {
                List<Ranch> ranches = Ranch.GetRanchesForRegistration();
                return Ok(ranches);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetRanchesForRegistration: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת חוות להרשמה");
            }
        }

        [Authorize]
        [HttpGet("{ranchId}")]
        public IActionResult GetRanchById(int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin,
                    RoleNames.RanchWorker
                );

                RanchProfile ranch = Ranch.GetRanchById(ranchId);
                return Ok(ranch);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetRanchById: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פרטי החווה");
            }
        }

        [Authorize]
        [HttpPut("{ranchId}")]
        public IActionResult UpdateRanchProfile(int ranchId, [FromBody] UpdateRanchProfileRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (ranchId != request.RanchId)
                {
                    return BadRequest("RanchId in URL does not match body.");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin
                );

                Ranch.UpdateRanchProfile(request);
                return Ok("Ranch profile updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateRanchProfile: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון פרטי החווה");
            }
        }
    }
}