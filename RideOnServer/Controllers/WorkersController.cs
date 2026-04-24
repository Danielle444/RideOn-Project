using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Workers;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class WorkersController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetWorkers(
            [FromQuery] int ranchId,
            [FromQuery] string? search,
            [FromQuery] string? approvalStatus)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                var filters = new GetWorkersFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = search,
                    RoleStatus = approvalStatus
                };

                List<WorkerListItem> workers = Worker.GetWorkersByRanch(filters);
                return Ok(workers);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetWorkers: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת עובדים");
            }
        }

        [HttpGet("{personId}")]
        public IActionResult GetWorkerById(int personId, [FromQuery] int ranchId)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                WorkerDetails worker = Worker.GetWorkerById(personId, ranchId);
                return Ok(worker);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetWorkerById: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פרטי עובד");
            }
        }

        [HttpPut("{personId}")]
        public IActionResult UpdateWorker(int personId, [FromBody] UpdateWorkerRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (personId != request.PersonId)
                {
                    return BadRequest("PersonId in URL does not match body");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Worker.UpdateWorker(request);
                return Ok("Worker updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateWorker: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון עובד");
            }
        }

        [HttpPut("role-status")]
        public IActionResult UpdateWorkerRoleStatus([FromBody] UpdateWorkerRoleStatusRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Worker.UpdateWorkerRoleStatus(request);
                return Ok("Worker role status updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateWorkerRoleStatus: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון סטטוס עובד");
            }
        }

        [HttpDelete("assignment")]
        public IActionResult RemoveWorkerFromRanch([FromBody] RemoveWorkerFromRanchRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Worker.RemoveWorkerFromRanch(request);
                return Ok("Worker removed from ranch successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in RemoveWorkerFromRanch: {ex.Message}");
                return BadRequest("אירעה שגיאה בהסרת עובד מהחווה");
            }
        }
    }
}