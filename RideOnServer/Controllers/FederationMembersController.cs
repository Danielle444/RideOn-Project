using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.FederationMembers;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FederationMembersController : ControllerBase
    {
        [Authorize]
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

                GetCompetitionFederationMembersFiltersRequest filters =
                    new GetCompetitionFederationMembersFiltersRequest
                    {
                        CompetitionId = competitionId,
                        RanchId = ranchId,
                        SearchText = search
                    };

                List<CompetitionFederationMemberListItem> riders =
                    FederationMember.GetCompetitionRidersByRanch(filters);

                return Ok(riders);
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

        [Authorize]
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

                GetCompetitionFederationMembersFiltersRequest filters =
                    new GetCompetitionFederationMembersFiltersRequest
                    {
                        CompetitionId = competitionId,
                        RanchId = ranchId,
                        SearchText = search
                    };

                List<CompetitionFederationMemberListItem> trainers =
                    FederationMember.GetCompetitionTrainersByRanch(filters);

                return Ok(trainers);
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

        [Authorize]
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

                GetRanchFederationMembersFiltersRequest filters =
                    new GetRanchFederationMembersFiltersRequest
                    {
                        RanchId = ranchId,
                        SearchText = search
                    };

                List<CompetitionFederationMemberListItem> riders =
                    FederationMember.GetRidersByRanch(filters);

                return Ok(riders);
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

        [Authorize]
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

                GetRanchFederationMembersFiltersRequest filters =
                    new GetRanchFederationMembersFiltersRequest
                    {
                        RanchId = ranchId,
                        SearchText = search
                    };

                List<CompetitionFederationMemberListItem> trainers =
                    FederationMember.GetTrainersByRanch(filters);

                return Ok(trainers);
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
    }
}