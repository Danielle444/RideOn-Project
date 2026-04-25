using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition.ClassInCompetition;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ClassesInCompetitionController : ControllerBase
    {
        [HttpGet("{competitionId}")]
        public IActionResult GetClassesByCompetitionId(int competitionId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                    return NotFound("Competition not found");

                if (competition.HostRanchId != ranchId)
                    return StatusCode(403, "אין לך הרשאה לצפות במקצים של תחרות זו");

                var list = ClassInCompetition.GetClassesByCompetitionId(competitionId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetClassesByCompetitionId: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מקצים");
            }
        }

        [HttpPost]
        public IActionResult CreateClassInCompetition([FromBody] CreateClassInCompetitionRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request");

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                    return NotFound("Competition not found");

                if (competition.HostRanchId != request.HostRanchId)
                    return StatusCode(403, "אין לך הרשאה להוסיף מקצים לתחרות זו");

                int newId = ClassInCompetition.CreateClassInCompetition(request);
                var newItem = ClassInCompetition.GetClassById(newId);

                if (newItem == null)
                    return NotFound("Created class was not found");

                return Ok(newItem);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateClassInCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת מקצה");
            }
        }

        [HttpPut("{classInCompId}")]
        public IActionResult UpdateClassInCompetition(int classInCompId, [FromBody] UpdateClassInCompetitionRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request");

                if (classInCompId != request.ClassInCompId)
                    return BadRequest("ClassInCompId mismatch");

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                    return NotFound("Competition not found");

                if (competition.HostRanchId != request.HostRanchId)
                    return StatusCode(403, "אין לך הרשאה לערוך מקצים בתחרות זו");

                ClassInCompetition.UpdateClassInCompetition(request);
                var updatedItem = ClassInCompetition.GetClassById(classInCompId);

                if (updatedItem == null)
                    return NotFound("Updated class was not found");

                return Ok(updatedItem);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateClassInCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון מקצה");
            }
        }

        [HttpDelete("{classInCompId}")]
        public IActionResult DeleteClassInCompetition(
            int classInCompId,
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

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                    return NotFound("Competition not found");

                if (competition.HostRanchId != ranchId)
                    return StatusCode(403, "אין לך הרשאה למחוק מקצים מתחרות זו");

                ClassInCompetition.DeleteClassInCompetition(classInCompId);
                return Ok("Class deleted successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeleteClassInCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה במחיקת מקצה");
            }
        }
    }
}