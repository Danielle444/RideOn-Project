using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs;
using RideOnServer.BL.DTOs.Competition.PaidTimeSlotInCompetition;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaidTimeSlotsInCompetitionController : ControllerBase
    {
        [Authorize]
        [HttpGet("{competitionId}")]
        public IActionResult GetPaidTimeSlotsByCompetitionId(int competitionId, [FromQuery] int ranchId)
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בפייד-טיים של תחרות זו");
                }

                List<PaidTimeSlotInCompetition> list = PaidTimeSlotInCompetition.GetPaidTimeSlotsByCompetitionId(competitionId);
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
        [HttpGet("base-slots")]
        public IActionResult GetAllPaidTimeBaseSlots([FromQuery] int ranchId)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                List<PaidTimeSlot> list = PaidTimeSlot.GetAllPaidTimeBaseSlots();
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
        public IActionResult CreatePaidTimeSlotInCompetition([FromBody] CreatePaidTimeSlotInCompetitionRequest request)
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה להוסיף פייד-טיים לתחרות זו");
                }

                int newId = PaidTimeSlotInCompetition.CreatePaidTimeSlotInCompetition(request);

                return Ok(new
                {
                    CompSlotId = newId,
                    Message = "Paid time slot added successfully"
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
        [HttpPut("{compSlotId}")]
        public IActionResult UpdatePaidTimeSlotInCompetition(int compSlotId, [FromBody] UpdatePaidTimeSlotInCompetitionRequest request)
        {
            try
            {
                if (compSlotId != request.CompSlotId)
                {
                    return BadRequest("CompSlotId in URL does not match body");
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לערוך פייד-טיים בתחרות זו");
                }

                PaidTimeSlotInCompetition.UpdatePaidTimeSlotInCompetition(request);
                return Ok("Paid time slot updated successfully");
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
        [HttpDelete("{compSlotId}")]
        public IActionResult DeletePaidTimeSlotInCompetition(
            int compSlotId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] bool forceDelete = false)
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה למחוק פייד-טיים מתחרות זו");
                }

                PaidTimeSlotInCompetition.DeletePaidTimeSlotInCompetition(compSlotId, forceDelete);
                return Ok("Paid time slot deleted successfully");
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