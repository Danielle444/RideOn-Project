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
                int personId = GetPersonIdFromClaims();
                UserAccessValidator.EnsureUserHasRoleInRanch(personId, ranchId, RoleNames.HostSecretary);

                var dal = new StallAssignmentDAL();
                return Ok(dal.GetCompoundsWithLayout(ranchId));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("horses")]
        public IActionResult GetHorses([FromQuery] int competitionId)
        {
            try
            {
                var dal = new StallAssignmentDAL();
                return Ok(dal.GetHorsesForCompetition(competitionId));
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpGet]
        public IActionResult GetAssignments([FromQuery] int competitionId)
        {
            try
            {
                var dal = new StallAssignmentDAL();
                return Ok(dal.GetAssignments(competitionId));
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpPost]
        public IActionResult Assign([FromBody] StallAssignmentRequest request)
        {
            try
            {
                int personId = GetPersonIdFromClaims();
                UserAccessValidator.EnsureUserHasRoleInRanch(personId, request.RanchId, RoleNames.HostSecretary);

                var dal = new StallAssignmentDAL();
                dal.AssignHorse(request.CompetitionId, request.RanchId,
                                request.CompoundId, request.StallId, request.HorseId);
                return Ok("Assigned");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete]
        public IActionResult Unassign([FromBody] UnassignStallRequest request)
        {
            try
            {
                int personId = GetPersonIdFromClaims();
                UserAccessValidator.EnsureUserHasRoleInRanch(personId, request.RanchId, RoleNames.HostSecretary);

                var dal = new StallAssignmentDAL();
                dal.UnassignHorse(request.CompetitionId, request.RanchId,
                                  request.CompoundId, request.StallId);
                return Ok("Unassigned");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
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
