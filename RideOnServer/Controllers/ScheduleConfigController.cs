using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using System.Linq;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ScheduleConfigController : ControllerBase
    {
        [HttpGet("{fieldId}")]
        public IActionResult GetScheduleConfigByFieldId(short fieldId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                List<ApprovedRoleRanch> approvedRoles =
                    SystemUser.GetApprovedPersonRanchesAndRoles(personId);

                bool hasSecretaryRole = approvedRoles.Any(item =>
                    !string.IsNullOrWhiteSpace(item.RoleName) &&
                    item.RoleName.Trim().Equals(
                        RoleNames.HostSecretary,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

                if (!hasSecretaryRole)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בהגדרות לוח הזמנים");
                }

                var config = ScheduleConfigService.GetScheduleConfigByFieldId(fieldId);
                return Ok(config);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetScheduleConfigByFieldId: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת הגדרות לוח הזמנים");
            }
        }
    }
}
