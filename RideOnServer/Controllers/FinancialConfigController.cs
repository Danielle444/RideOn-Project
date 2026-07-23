using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FinancialConfigController : ControllerBase
    {
        // Competition-scoped, so authorization is per-ranch (EnsureUserHasRoleInRanch), matching
        // the paid-time and competition-summary secretary endpoints -- the schedule-config
        // endpoint's global secretary check does not apply here because it is field-scoped, not
        // competition-scoped. The ranchId query param is checked against the competition's real
        // host ranch to stop a valid-elsewhere secretary from reading another ranch's competition.
        [HttpGet("{competitionId}")]
        public IActionResult GetFinancialConfigForCompetition(int competitionId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בנתונים הכספיים של תחרות זו");
                }

                var config = FinancialConfigService.GetFinancialConfigForCompetition(competitionId);
                return Ok(config);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetFinancialConfigForCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת הנתונים הכספיים");
            }
        }
    }
}
