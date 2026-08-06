using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.RegistrationStepStatus;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RegistrationStepStatusController : ControllerBase
    {
        // Serves only the RanchAdmin mobile four-tab registration workflow -- HostSecretary has
        // no use for this personalized status, so unlike FinancialConfig (HostSecretary-gated)
        // this is RanchAdmin-only. The admin id is derived from claims (PersonId) and is never
        // accepted from the client, matching every write controller's OrderedBySystemUserId
        // overwrite pattern.
        //
        // The supplied ranchId does NOT need to equal competition.HostRanchId: a RanchAdmin
        // operates for the ranch represented by their activeRole.ranchId, and a ranch can have
        // real registration activity (entries, stall bookings, paid time) in a competition it
        // does not host. EnsureUserHasRoleInRanch below is the only ranch gate -- it proves the
        // caller holds RanchAdmin at the SUPPLIED ranchId, which is sufficient; requiring that
        // ranch to also be the host was a bug (RanchAdmins at non-host ranches got a 403 for a
        // competition their own ranch was legitimately participating in).
        [HttpGet("{competitionId}")]
        public IActionResult GetRegistrationStepStatus(int competitionId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                RegistrationStepStatus? status =
                    RegistrationStepStatusService.GetRegistrationStepStatus(competitionId, ranchId, personId);

                if (status == null)
                {
                    // Competition existence is already proven above via Competition.GetCompetitionById.
                    // A null result here means the SP's own independent re-check (the comp CTE)
                    // disagreed -- e.g. the competition was deleted between the two reads, or the
                    // SP contract broke. Never surface this as a misleading 200-with-nulls.
                    Console.WriteLine(
                        $"RegistrationStepStatus: SP returned no row for competitionId={competitionId}, " +
                        $"ranchId={ranchId} despite passing the prior existence/ownership checks");

                    return StatusCode(StatusCodes.Status500InternalServerError, "אירעה שגיאה בשליפת נתוני ההרשמה");
                }

                return Ok(status);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetRegistrationStepStatus: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת נתוני ההרשמה");
            }
        }
    }
}
