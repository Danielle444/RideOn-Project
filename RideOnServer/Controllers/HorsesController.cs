using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Horses;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class HorsesController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetHorses([FromQuery] int ranchId, [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var filters = new GetHorsesFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = search
                };

                var horses = Horse.GetHorsesByRanch(filters);
                return Ok(horses);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHorses: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת סוסים");
            }
        }

        [HttpGet("competition")]
        public IActionResult GetCompetitionHorses(
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

                var filters = new GetCompetitionHorsesFiltersRequest
                {
                    CompetitionId = competitionId,
                    RanchId = ranchId,
                    SearchText = search
                };

                var horses = Horse.GetHorsesForCompetition(filters);
                return Ok(horses);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionHorses: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת סוסים לתחרות");
            }
        }

        [HttpPut("{horseId}/barnname")]
        public IActionResult UpdateHorseBarnName(int horseId, [FromBody] UpdateHorseBarnNameRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request");

                if (horseId != request.HorseId)
                    return BadRequest("HorseId mismatch");

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                Horse.UpdateHorseBarnName(request);
                return Ok("Horse barn name updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateHorseBarnName: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון שם הסוס");
            }
        }

        [HttpGet("health-certificates")]
        public IActionResult GetHealthCertificates(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                var certificates =
                    HorseParticipationInCompetition.GetHealthCertificatesForCompetition(competitionId);

                return Ok(new { data = certificates });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHealthCertificates: {ex.Message}");
                return StatusCode(500, "שגיאה בשליפת תעודות הבריאות");
            }
        }

        [HttpPost("health-certificates/save")]
        public IActionResult SaveHealthCertificate([FromBody] SaveHealthCertificateRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request");

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                // ❗ צריך RanchId אמיתי בתוך request
                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                HorseParticipationInCompetition.SaveHealthCertificate(request);

                return Ok(new { message = "תעודת הבריאות נשמרה בהצלחה" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SaveHealthCertificate: {ex.Message}");
                return StatusCode(500, "שגיאה בשמירת תעודת הבריאות");
            }
        }

        [HttpPost("health-certificates/approve")]
        public IActionResult ApproveHealthCertificate([FromBody] ApproveHealthCertificateRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request");

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                    return NotFound("Competition not found");

                if (competition.HostRanchId != request.RanchId)
                {
                    return StatusCode(403, "אין לך הרשאה לאשר תעודות בתחרות זו");
                }

                HorseParticipationInCompetition.ApproveHealthCertificate(request, currentPersonId);

                return Ok(new { message = "תעודת הבריאות אושרה בהצלחה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApproveHealthCertificate: {ex.Message}");
                return StatusCode(500, "שגיאה באישור תעודת הבריאות");
            }
        }
    }
}