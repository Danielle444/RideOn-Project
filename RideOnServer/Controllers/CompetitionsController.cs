using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CompetitionsController : ControllerBase
    {
        [Authorize]
        [HttpGet("by-host-ranch")]
        public IActionResult GetCompetitionsByHostRanch(
            [FromQuery] int ranchId,
            [FromQuery] string? searchText,
            [FromQuery] string? status,
            [FromQuery] byte? fieldId,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                CompetitionFiltersRequest filters = new CompetitionFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = searchText,
                    Status = status,
                    FieldId = fieldId,
                    DateFrom = dateFrom,
                    DateTo = dateTo
                };

                List<Competition> list = Competition.GetCompetitionsByHostRanch(filters);
                return Ok(list);
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
        [HttpGet("{competitionId}")]
        public IActionResult GetCompetitionById(int competitionId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בתחרות זו");
                }

                return Ok(competition);
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
        [HttpPost]
        public IActionResult CreateCompetition([FromBody] CreateCompetitionRequest request)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                int newCompetitionId = Competition.CreateCompetition(request, personId);

                return Ok(new
                {
                    CompetitionId = newCompetitionId,
                    Message = "Competition created successfully"
                });
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
        [HttpPut("{competitionId}")]
        public IActionResult UpdateCompetition(int competitionId, [FromBody] UpdateCompetitionRequest request)
        {
            try
            {
                if (competitionId != request.CompetitionId)
                {
                    return BadRequest("CompetitionId in URL does not match body");
                }

                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition existingCompetition = Competition.GetCompetitionById(request.CompetitionId)
                    ?? throw new Exception("Competition not found");

                if (existingCompetition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לערוך תחרות זו");
                }

                Competition.UpdateCompetition(request);

                return Ok("Competition updated successfully");
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