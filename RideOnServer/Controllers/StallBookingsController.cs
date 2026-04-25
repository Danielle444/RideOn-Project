using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.StallBookings;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StallBookingsController : ControllerBase
    {
        [HttpPost]
        public ActionResult<int> CreateStallBooking([FromBody] CreateStallBookingRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Request body is required.");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                request.OrderedBySystemUserId = personId;

                int id = StallBookingDAL.CreateStallBooking(request);
                return Ok(id);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateStallBooking: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת הזמנת התא");
            }
        }

        [HttpGet("horses-for-booking")]
        public IActionResult GetHorsesForStallBooking(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                var result = StallBookingDAL.GetHorsesForStallBooking(competitionId, ranchId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHorsesForStallBooking: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת סוסים להזמנת תאים");
            }
        }

        [HttpGet("horse-payers")]
        public IActionResult GetHorsePayersForCompetition(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                var result = StallBookingDAL.GetHorsePayersForCompetition(competitionId, ranchId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHorsePayersForCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת משלמי הסוסים");
            }
        }

        [HttpGet("by-competition-and-ranch")]
        public IActionResult GetStallBookingsForCompetitionAndRanch(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                var result = StallBookingDAL.GetStallBookingsForCompetitionAndRanch(competitionId, ranchId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetStallBookingsForCompetitionAndRanch: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת הזמנות התאים");
            }
        }

        [HttpGet("{stallBookingId}/payers")]
        public IActionResult GetPayersForStallBooking(
            int stallBookingId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                var result = StallBookingDAL.GetPayersForStallBooking(stallBookingId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPayersForStallBooking: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת משלמי הזמנת התא");
            }
        }

        [HttpGet("payers/by-competition-and-ranch")]
        public IActionResult GetAllStallBookingPayersForCompetitionAndRanch(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                var result = StallBookingDAL.GetAllStallBookingPayersForCompetitionAndRanch(competitionId, ranchId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAllStallBookingPayersForCompetitionAndRanch: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת משלמי התאים");
            }
        }

        [HttpPost("tack")]
        public IActionResult CreateTackStallBookings([FromBody] CreateTackStallBookingsRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Request body is required.");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                if (request.Quantity <= 0)
                {
                    return BadRequest("Quantity must be greater than 0.");
                }

                if (request.Payers == null || request.Payers.Count == 0)
                {
                    return BadRequest("At least one payer is required.");
                }

                request.OrderedBySystemUserId = personId;

                List<int> createdIds = StallBookingDAL.CreateTackStallBookings(request);
                return Ok(createdIds);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateTackStallBookings: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת תאי ציוד");
            }
        }
    }
}