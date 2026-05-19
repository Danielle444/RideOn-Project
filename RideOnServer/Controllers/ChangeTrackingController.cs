using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ChangeTracking;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChangeTrackingController : ControllerBase
    {
        [HttpGet("competition")]
        public IActionResult GetSecretaryCompetitionChangeRequests(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] string? status = "Pending")
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
                        "אין לך הרשאה לצפות בבקשות שינוי של תחרות זו"
                    );
                }

                List<SecretaryChangeRequestItem> items =
                    ChangeTracking.GetSecretaryCompetitionChangeRequests(
                        competitionId,
                        ranchId,
                        status
                    );

                return Ok(items);
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
                    $"Error in GetSecretaryCompetitionChangeRequests: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת בקשות שינוי"
                );
            }
        }

        [HttpGet("pending-count")]
        public IActionResult GetHostSecretaryPendingChangeRequestsCount(
            [FromQuery] int ranchId)
        {
            try
            {
                if (ranchId <= 0)
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

                int pendingCount =
                    ChangeTracking.GetHostSecretaryPendingChangeRequestsCount(
                        ranchId
                    );

                return Ok(new
                {
                    PendingCount = pendingCount
                });
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
                    $"Error in GetHostSecretaryPendingChangeRequestsCount: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת כמות בקשות שינוי"
                );
            }
        }

        [HttpGet("pending-by-competition")]
        public IActionResult GetHostSecretaryPendingChangeRequestsByCompetition(
            [FromQuery] int ranchId)
        {
            try
            {
                if (ranchId <= 0)
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

                List<PendingChangeRequestsByCompetitionItem> items =
                    ChangeTracking.GetHostSecretaryPendingChangeRequestsByCompetition(
                        ranchId
                    );

                return Ok(items);
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
                    $"Error in GetHostSecretaryPendingChangeRequestsByCompetition: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת בקשות שינוי לפי תחרות"
                );
            }
        }


    }
}