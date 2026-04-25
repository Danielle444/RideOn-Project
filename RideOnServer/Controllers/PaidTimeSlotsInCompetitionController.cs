using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs;
using RideOnServer.BL.DTOs.Competition.PaidTimeSlotInCompetition;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PaidTimeSlotsInCompetitionController : ControllerBase
    {
        [HttpGet("{competitionId}")]
        public IActionResult GetPaidTimeSlotsByCompetitionId(int competitionId, [FromQuery] int ranchId)
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
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בפייד-טיים של תחרות זו");
                }

                var list = PaidTimeSlotInCompetition.GetPaidTimeSlotsByCompetitionId(competitionId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPaidTimeSlotsByCompetitionId: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פייד-טיים");
            }
        }

        [HttpGet("base-slots")]
        public IActionResult GetAllPaidTimeBaseSlots([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                var list = PaidTimeSlot.GetAllPaidTimeBaseSlots();
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllPaidTimeBaseSlots: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת סלוטים בסיסיים");
            }
        }

        [HttpPost]
        public IActionResult CreatePaidTimeSlotInCompetition([FromBody] CreatePaidTimeSlotInCompetitionRequest request)
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
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה להוסיף פייד-טיים לתחרות זו");
                }

                int newId = PaidTimeSlotInCompetition.CreatePaidTimeSlotInCompetition(request);
                var newItem = PaidTimeSlotInCompetition.GetById(newId);

                if (newItem == null)
                {
                    return NotFound("Created paid time slot was not found");
                }

                return Ok(newItem);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreatePaidTimeSlotInCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת פייד-טיים");
            }
        }

        [HttpPut("{PaidTimeSlotInCompId}")]
        public IActionResult UpdatePaidTimeSlotInCompetition(int PaidTimeSlotInCompId, [FromBody] UpdatePaidTimeSlotInCompetitionRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request");

                if (PaidTimeSlotInCompId != request.PaidTimeSlotInCompId)
                {
                    return BadRequest("PaidTimeSlotInCompId in URL does not match body");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

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
                var updatedItem = PaidTimeSlotInCompetition.GetById(PaidTimeSlotInCompId);

                if (updatedItem == null)
                {
                    return NotFound("Updated paid time slot was not found");
                }

                return Ok(updatedItem);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdatePaidTimeSlotInCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון פייד-טיים");
            }
        }

        [HttpDelete("{PaidTimeSlotInCompId}")]
        public IActionResult DeletePaidTimeSlotInCompetition(
            int PaidTimeSlotInCompId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] bool forceDelete = false)
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
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה למחוק פייד-טיים מתחרות זו");
                }

                PaidTimeSlotInCompetition.DeletePaidTimeSlotInCompetition(PaidTimeSlotInCompId, forceDelete);
                return Ok("Paid time slot deleted successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeletePaidTimeSlotInCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה במחיקת פייד-טיים");
            }
        }
    }
}