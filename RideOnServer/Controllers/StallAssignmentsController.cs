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

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin
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

                var dal = new StallAssignmentDAL();
                return Ok(dal.GetAssignedStallPrices(competitionId, ranchId));
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

                var dal = new StallAssignmentDAL();
                var status = dal.GetPublishStatus(competitionId, ranchId);

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