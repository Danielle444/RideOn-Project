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
        public IActionResult GetWorkersByRanch(
            [FromQuery] int ranchId,
            [FromQuery] string? status,
            [FromQuery] string? search)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                GetWorkersFiltersRequest filters = new GetWorkersFiltersRequest
                {
                    RanchId = ranchId,
                    RoleStatus = status,
                    SearchText = search
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
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{personId}")]
        public IActionResult GetWorkerById(int personId, [FromQuery] int ranchId)
        {
            try
            {
                int currentPersonId = GetPersonIdFromClaims();

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
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{personId}")]
        public IActionResult UpdateWorker(int personId, [FromBody] UpdateWorkerRequest request)
        {
            try
            {
                if (personId != request.PersonId)
                {
                    return BadRequest("PersonId in URL does not match body");
                }

                int currentPersonId = GetPersonIdFromClaims();

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
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("role-status")]
        public IActionResult UpdateWorkerRoleStatus([FromBody] UpdateWorkerRoleStatusRequest request)
        {
            try
            {
                int currentPersonId = GetPersonIdFromClaims();

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
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("assignment")]
        public IActionResult RemoveWorkerFromRanch([FromBody] RemoveWorkerFromRanchRequest request)
        {
            try
            {
                int currentPersonId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Worker.RemoveWorkerFromRanch(request);
                return Ok("Worker assignment removed successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        private int GetPersonIdFromClaims()
        {
            string? personIdClaim = User.Claims.FirstOrDefault(c => c.Type == "PersonId")?.Value;

            if (string.IsNullOrWhiteSpace(personIdClaim))
            {
                throw new UnauthorizedAccessException("PersonId claim is missing");
            }

            return int.Parse(personIdClaim);
        }
    }
}