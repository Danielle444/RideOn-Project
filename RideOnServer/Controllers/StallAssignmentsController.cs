using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.StallMap;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StallAssignmentsController : ControllerBase
    {
        [HttpGet("compounds")]
        public IActionResult GetCompounds([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                var dal = new StallAssignmentDAL();
                return Ok(dal.GetCompoundsWithLayout(ranchId));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompounds: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מתחמי התאים");
            }
        }

        [HttpGet("horses")]
        public IActionResult GetHorses(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                var dal = new StallAssignmentDAL();
                return Ok(dal.GetHorsesForCompetition(competitionId));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHorses: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת הסוסים לתחרות");
            }
        }

        [HttpGet]
        public IActionResult GetAssignments(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                var dal = new StallAssignmentDAL();
                return Ok(dal.GetAssignments(competitionId));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAssignments: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת שיבוצי התאים");
            }
        }

        [HttpPost]
        public IActionResult Assign([FromBody] StallAssignmentRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                var dal = new StallAssignmentDAL();

                dal.AssignHorse(
                    request.CompetitionId,
                    request.RanchId,
                    request.CompoundId,
                    request.StallId,
                    request.HorseId
                );

                return Ok("Assigned");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Assign: {ex.Message}");
                return BadRequest("אירעה שגיאה בשיבוץ הסוס לתא");
            }
        }

        [HttpDelete]
        public IActionResult Unassign([FromBody] UnassignStallRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                var dal = new StallAssignmentDAL();

                dal.UnassignHorse(
                    request.CompetitionId,
                    request.RanchId,
                    request.CompoundId,
                    request.StallId
                );

                return Ok("Unassigned");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Unassign: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול שיבוץ התא");
            }
        }
    }
}