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
        public IActionResult GetCompounds(
            [FromQuery] int ranchId,
            [FromQuery] int? competitionId = null)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin
                );

                // Ranch-model fix (Bug 2): stall compounds are physical venue data
                // that belongs to the competition's HOST ranch, not the caller's
                // own active ranch -- a non-host RanchAdmin's ranchId only proves
                // WHO is asking, never WHERE the physical stalls are. When
                // competitionId is supplied, resolve the venue ranch server-side
                // and query against it instead. Callers that omit competitionId
                // (older clients, ranch-level compound setup with no competition
                // in scope) keep the pre-fix ranch-scoped behavior unchanged.
                int venueRanchId = ranchId;

                if (competitionId.HasValue)
                {
                    Competition? competition = Competition.GetCompetitionById(competitionId.Value);

                    if (competition == null)
                    {
                        return NotFound("התחרות לא נמצאה");
                    }

                    venueRanchId = competition.HostRanchId;
                }

                var dal = new StallAssignmentDAL();
                return Ok(dal.GetCompoundsWithLayout(venueRanchId));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompounds: {ex.Message}");
                return BadRequest("����� ����� ������ ����� �����");
            }
        }

        [HttpGet("overview")]
        public IActionResult GetAssignmentOverview(
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
                return Ok(dal.GetAssignmentOverview(competitionId, ranchId));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAssignmentOverview: {ex.Message}");
                return BadRequest("����� ����� ������ ����� ������ �����");
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

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin
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
                return BadRequest("����� ����� ������ ������ �����");
            }
        }

        [HttpGet("assigned-prices")]
        public IActionResult GetAssignedStallPrices(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin
                );

                // Ranch-model fix (Bug 3): stallassignment.ranchid is the
                // PHYSICAL stall's ranch (= the competition's host ranch), not
                // the caller's own active ranch. Resolve the host ranch
                // server-side so a non-host RanchAdmin still receives the real
                // assigned price instead of a silent empty result that falls
                // back to the stale booking price.
                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                var dal = new StallAssignmentDAL();
                return Ok(dal.GetAssignedStallPrices(competitionId, competition.HostRanchId));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAssignedStallPrices: {ex.Message}");
                return BadRequest("שגיאה בשליפת מחירי תאים משובצים");
            }
        }

        [HttpPost("booking")]
        public IActionResult AssignStallBooking([FromBody] AssignStallBookingRequest request)
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

                dal.AssignStallBooking(
                    request.CompetitionId,
                    request.RanchId,
                    request.CompoundId,
                    request.StallId,
                    request.StallBookingId
                );

                return Ok("Assigned");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AssignStallBooking: {ex.Message}");
                return BadRequest("����� ����� ������ ����� ���");
            }
        }

        [HttpDelete("booking")]
        public IActionResult UnassignStallBooking([FromBody] UnassignStallBookingRequest request)
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

                dal.UnassignStallBooking(
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
                Console.WriteLine($"Error in UnassignStallBooking: {ex.Message}");
                return BadRequest("����� ����� ������ ����� ���");
            }
        }

        [HttpGet("publish-status")]
        public IActionResult GetPublishStatus(
    [FromQuery] int competitionId,
    [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin
                );

                // Ranch-model fix (Bug 4): usp_getstallmappublishstatus filters
                // on the competition's HOST ranch, not the caller's own active
                // ranch -- resolve it server-side so a non-host RanchAdmin gets
                // the real publish status instead of a ranch-mismatch NotFound.
                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                var dal = new StallAssignmentDAL();
                var status = dal.GetPublishStatus(competitionId, competition.HostRanchId);

                if (status == null)
                {
                    return NotFound("�� ���� ����� ����� ���� �����");
                }

                return Ok(status);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPublishStatus: {ex.Message}");
                return BadRequest("����� ����� ������ ����� ����� ��� �����");
            }
        }

        [HttpPost("publish")]
        public IActionResult PublishStallMap([FromBody] PublishStallMapRequest request)
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

                dal.PublishStallMap(
                    request.CompetitionId,
                    request.RanchId,
                    request.SystemUserId
                );

                return Ok("Published");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in PublishStallMap: {ex.Message}");
                return BadRequest("����� ����� ������ ��� �����");
            }
        }

        [HttpPost("unpublish")]
        public IActionResult UnpublishStallMap([FromBody] UnpublishStallMapRequest request)
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

                dal.UnpublishStallMap(
                    request.CompetitionId,
                    request.RanchId
                );

                return Ok("Unpublished");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UnpublishStallMap: {ex.Message}");
                return BadRequest("����� ����� ������ ����� ��� �����");
            }
        }


    }
}