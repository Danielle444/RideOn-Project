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
        public IActionResult GetHorses(
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

                GetHorsesFiltersRequest filters = new GetHorsesFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = search
                };

                List<HorseListItem> horses = Horse.GetHorsesByRanch(filters);
                return Ok(horses);
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

                GetCompetitionHorsesFiltersRequest filters = new GetCompetitionHorsesFiltersRequest
                {
                    CompetitionId = competitionId,
                    RanchId = ranchId,
                    SearchText = search
                };

                List<CompetitionHorseListItem> horses = Horse.GetHorsesForCompetition(filters);
                return Ok(horses);
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

        [HttpPut("{horseId}/barnname")]
        public IActionResult UpdateHorseBarnName(
            int horseId,
            [FromBody] UpdateHorseBarnNameRequest request)
        {
            try
            {
                if (horseId != request.HorseId)
                {
                    return BadRequest("HorseId in URL does not match body");
                }

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
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("health-certificates")]
        public IActionResult GetHealthCertificates([FromQuery] int competitionId)
        {
            try
            {
                var certificates = HorseParticipationInCompetition.GetHealthCertificatesForCompetition(competitionId);
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
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.CompetitionId,
                    RoleNames.RanchAdmin
                );

                HorseParticipationInCompetition.SaveHealthCertificate(request);
                return Ok(new { message = "תעודת הבריאות נשמרה בהצלחה" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
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
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                HorseParticipationInCompetition.ApproveHealthCertificate(request, currentPersonId);
                return Ok(new { message = "תעודת הבריאות אושרה בהצלחה" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApproveHealthCertificate: {ex.Message}");
                return StatusCode(500, "שגיאה באישור תעודת הבריאות");
            }
        }
    }
}