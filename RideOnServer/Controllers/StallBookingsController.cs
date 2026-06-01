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

        [HttpPost("cancel-request")]
        public IActionResult CreateStallBookingCancelRequest(
            [FromBody] CreateStallBookingCancelRequest request
        )
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Request body is required.");
                }

                if (request.StallBookingId <= 0)
                {
                    return BadRequest("Invalid stall booking id.");
                }

                if (request.RanchId <= 0)
                {
                    return BadRequest("Invalid ranch id.");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                int requestId = StallBookingDAL.CreateStallBookingCancelRequest(
                    request.StallBookingId,
                    request.RanchId
                );

                return Ok(requestId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateStallBookingCancelRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליחת בקשת ביטול התא");
            }
        }

        [HttpPost("change-request")]
        public IActionResult CreateStallBookingChangeRequest(
            [FromBody] CreateStallBookingChangeRequest request
        )
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Request body is required.");
                }

                if (request.OriginalStallBookingId <= 0)
                {
                    return BadRequest("Invalid original stall booking id.");
                }

                if (request.RanchId <= 0)
                {
                    return BadRequest("Invalid ranch id.");
                }

                if (request.NewStartDate == default || request.NewEndDate == default)
                {
                    return BadRequest("Start date and end date are required.");
                }

                if (request.NewStartDate.Date > request.NewEndDate.Date)
                {
                    return BadRequest("Start date cannot be after end date.");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                int requestId = StallBookingDAL.CreateStallBookingChangeRequest(
                    request,
                    personId
                );

                return Ok(requestId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateStallBookingChangeRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליחת בקשת שינוי התא");
            }
        }

        [HttpPost("cancel-by-payer")]
        public IActionResult CancelStallBookingByPayer(
            [FromBody] CreateStallBookingCancelRequest request)
        {
            try
            {
                if (request == null || request.StallBookingId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.Payer
                );

                int requestId = StallBooking.CancelByPayer(request.StallBookingId, personId);

                return Ok(requestId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CancelStallBookingByPayer: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("change-request-by-payer")]
        public IActionResult CreateStallChangeRequestByPayer(
            [FromBody] CreateStallBookingCancelRequest request)
        {
            try
            {
                if (request == null || request.StallBookingId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.Payer
                );

                int requestId = StallBooking.CreateChangeRequestByPayer(
                    request.StallBookingId,
                    personId
                );

                return Ok(requestId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateStallChangeRequestByPayer: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

    }
}