using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PaidTimeRequestsController : ControllerBase
    {
        [HttpPost]
        public IActionResult CreatePaidTimeRequest([FromBody] CreatePaidTimeRequestRequest request)
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
                    RoleNames.RanchAdmin
                );

                request.OrderedBySystemUserId = personId;

                int newId = PaidTimeRequest.CreatePaidTimeRequest(request);

                return Ok(newId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreatePaidTimeRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת בקשת פייד־טיים");
            }
        }

        [HttpGet("assignment")]
        public IActionResult GetPaidTimeRequestsForAssignment(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] int[] selectedCompSlotIds,
            [FromQuery] bool includeAllPending = false)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                if (selectedCompSlotIds == null || selectedCompSlotIds.Length == 0)
                {
                    return BadRequest("At least one selected slot is required");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                List<PaidTimeAssignmentItemResponse> requests =
                    PaidTimeRequest.GetPaidTimeRequestsForAssignment(
                        competitionId,
                        selectedCompSlotIds,
                        includeAllPending
                    );

                return Ok(requests);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPaidTimeRequestsForAssignment: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת בקשות פייד־טיים לשיבוץ");
            }
        }

        [HttpPost("assign")]
        public IActionResult AssignPaidTimeRequest([FromBody] AssignPaidTimeRequestRequest request)
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

                PaidTimeRequest.AssignPaidTimeRequest(request);

                return Ok("Paid time request assigned successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AssignPaidTimeRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה בשיבוץ בקשת פייד־טיים");
            }
        }

        [HttpPost("unassign")]
        public IActionResult UnassignPaidTimeRequest([FromBody] UnassignPaidTimeRequestRequest request)
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

                PaidTimeRequest.UnassignPaidTimeRequest(request);

                return Ok("Paid time request unassigned successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UnassignPaidTimeRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים");
            }
        }
    }
}