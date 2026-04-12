using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition.ClassInCompetition;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClassesInCompetitionController : ControllerBase
    {
        [Authorize]
        [HttpGet("{competitionId}")]
        public IActionResult GetClassesByCompetitionId(int competitionId, [FromQuery] int ranchId)
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות במקצים של תחרות זו");
                }

                List<ClassInCompetition> list = ClassInCompetition.GetClassesByCompetitionId(competitionId);
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
        [HttpPost]
        public IActionResult CreateClassInCompetition([FromBody] CreateClassInCompetitionRequest request)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה להוסיף מקצים לתחרות זו");
                }

                int newId = ClassInCompetition.CreateClassInCompetition(request);
                ClassInCompetition? newItem = ClassInCompetition.GetClassById(newId);

                if (newItem == null)
                {
                    return NotFound("Created class was not found");
                }

                return Ok(newItem);
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
        [HttpPut("{classInCompId}")]
        public IActionResult UpdateClassInCompetition(int classInCompId, [FromBody] UpdateClassInCompetitionRequest request)
        {
            try
            {
                if (classInCompId != request.ClassInCompId)
                {
                    return BadRequest("ClassInCompId in URL does not match body");
                }

                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לערוך מקצים בתחרות זו");
                }

                ClassInCompetition.UpdateClassInCompetition(request);
                ClassInCompetition? updatedItem = ClassInCompetition.GetClassById(classInCompId);

                if (updatedItem == null)
                {
                    return NotFound("Updated class was not found");
                }

                return Ok(updatedItem);
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
        [HttpDelete("{classInCompId}")]
        public IActionResult DeleteClassInCompetition(int classInCompId, [FromQuery] int competitionId, [FromQuery] int ranchId)
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה למחוק מקצים מתחרות זו");
                }

                ClassInCompetition.DeleteClassInCompetition(classInCompId);
                return Ok("Class deleted successfully");
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