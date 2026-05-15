using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.CompetitionSummary;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CompetitionSummaryController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetCompetitionSummary(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition =
                    Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה לצפות בסיכום תחרות זו"
                    );
                }

                CompetitionSummaryResponse response =
                    CompetitionSummary.GetCompetitionSummary(
                        competitionId,
                        ranchId
                    );

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    ex.Message
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCompetitionSummary: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת סיכום התחרות"
                );
            }
        }
    }
}