using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.FederationMembers;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FederationMembersController : ControllerBase
    {
        [HttpGet("competition/riders")]
        public IActionResult GetCompetitionRiders(
            [FromQuery] int ranchId,
            [FromQuery] int competitionId,
            [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var filters = new GetCompetitionFederationMembersFiltersRequest
                {
                    CompetitionId = competitionId,
                    RanchId = ranchId,
                    SearchText = search
                };

                var riders = FederationMember.GetCompetitionRidersByRanch(filters);

                return Ok(riders);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionRiders: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת רוכבים");
            }
        }

        [HttpGet("competition/trainers")]
        public IActionResult GetCompetitionTrainers(
            [FromQuery] int ranchId,
            [FromQuery] int competitionId,
            [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var filters = new GetCompetitionFederationMembersFiltersRequest
                {
                    CompetitionId = competitionId,
                    RanchId = ranchId,
                    SearchText = search
                };

                var trainers = FederationMember.GetCompetitionTrainersByRanch(filters);

                return Ok(trainers);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionTrainers: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מאמנים");
            }
        }

        [HttpGet("ranch/riders")]
        public IActionResult GetRidersByRanch(
            [FromQuery] int ranchId,
            [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var filters = new GetRanchFederationMembersFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = search
                };

                var riders = FederationMember.GetRidersByRanch(filters);

                return Ok(riders);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetRidersByRanch: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת רוכבים");
            }
        }

        [HttpGet("ranch/trainers")]
        public IActionResult GetTrainersByRanch(
            [FromQuery] int ranchId,
            [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var filters = new GetRanchFederationMembersFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = search
                };

                var trainers = FederationMember.GetTrainersByRanch(filters);

                return Ok(trainers);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetTrainersByRanch: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מאמנים");
            }
        }
    }
}