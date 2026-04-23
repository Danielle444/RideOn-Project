using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.StallBookings;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class StallBookingsController : ControllerBase
    {
        [Authorize]
        [HttpPost]
        public ActionResult<int> CreateStallBooking([FromBody] CreateStallBookingRequest request)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                // חשוב מאוד – לא מאפשרים להזמין בשם מישהו אחר
                if (request.OrderedBySystemUserId != personId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לבצע פעולה זו עבור משתמש אחר");
                }

                int id = StallBookingDAL.CreateStallBooking(request);
                return Ok(id);
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
        [HttpGet("horses-for-booking")]
        public IActionResult GetHorsesForStallBooking(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

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
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("horse-payers")]
        public IActionResult GetHorsePayersForCompetition(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

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
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("by-competition-and-ranch")]
        public IActionResult GetStallBookingsForCompetitionAndRanch(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

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
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("{stallBookingId}/payers")]
        public IActionResult GetPayersForStallBooking(int stallBookingId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

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
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("payers/by-competition-and-ranch")]
        public IActionResult GetAllStallBookingPayersForCompetitionAndRanch(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = GetPersonIdFromClaims();

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
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("equipment")]
        public IActionResult CreateEquipmentStallBookings([FromBody] CreateEquipmentStallBookingsRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Request body is required.");
                }

                if (request.Quantity <= 0)
                {
                    return BadRequest("Quantity must be greater than 0.");
                }

                if (request.Payers == null || request.Payers.Count == 0)
                {
                    return BadRequest("At least one payer is required.");
                }

                List<int> createdIds = StallBookingDAL.CreateEquipmentStallBookings(request);
                return Ok(createdIds);
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