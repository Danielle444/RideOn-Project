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

                // Ranch-model fix: requesting ranch is the HORSE's own ranch,
                // derived server-side -- never trusted from request.RanchId.
                // Authorization is checked against this derived value.
                int? horseRanchId = new HorseDAL().GetHorseRanchId(request.HorseId);
                if (horseRanchId == null)
                {
                    return NotFound("הסוס לא נמצא");
                }

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    horseRanchId.Value,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                // Host/service ranch is the COMPETITION's own host ranch,
                // derived server-side -- never trusted from request.RanchId.
                // usp_createstallbooking validates PriceCatalog and writes
                // StallBooking.RanchId against this value.
                RideOnServer.BL.Competition? competition = new CompetitionDAL().GetCompetitionById(request.CompetitionId);
                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                request.RanchId = competition.HostRanchId;
                request.OrderedBySystemUserId = personId;

                int id = StallBookingDAL.CreateStallBooking(request);
                return Ok(id);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
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

        // HostSecretary cross-ranch service flows (2026-08-07): additive
        // sibling of GetHorsesForStallBooking above. That endpoint filters
        // horses to ranchId's own ranch and is shared with the mobile
        // RanchAdmin self-service flow, which must keep seeing only its own
        // ranch's horses -- left untouched. This endpoint is HostSecretary-
        // only and returns every horse entered in the competition across all
        // participating ranches, authorized against the competition's own
        // host ranch (never a client-supplied scope), same pattern as
        // SecretaryCreateStallBookingForPayer below.
        [HttpGet("horses-for-booking-by-competition")]
        public IActionResult GetHorsesForStallBookingByCompetition(
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

                RideOnServer.BL.Competition? competition = new CompetitionDAL().GetCompetitionById(competitionId);
                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בסוסים של תחרות זו");
                }

                var result = StallBookingDAL.GetHorsesForStallBookingByCompetition(competitionId);
                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHorsesForStallBookingByCompetition: {ex.Message}");
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

                // Ranch-model fix: there is no horse to derive a requesting
                // ranch from for a tack stall, so it must be supplied
                // explicitly. It is not blindly trusted, though -- the actor
                // must actually hold an approved role in it.
                //
                // Backward-compat fallback: the currently-installed mobile
                // client still sends the old field, RanchId, for this
                // meaning (it predates RequestingRanchId existing at all).
                // RequestingRanchId wins whenever a new client supplies it;
                // RanchId is read here ONLY as a fallback for that old
                // client, BEFORE it gets overwritten below with the
                // competition's host ranch -- it must never be confused with
                // that host-ranch value. Both fields, when used, mean the
                // requesting/guest ranch in this tack flow, never the host.
                int resolvedRequestingRanchId = ResolveTackRequestingRanchId(
                    request.RequestingRanchId, request.RanchId);

                if (resolvedRequestingRanchId <= 0)
                {
                    return BadRequest("RequestingRanchId is required.");
                }

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    resolvedRequestingRanchId,
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

                // Host/service ranch is the COMPETITION's own host ranch,
                // derived server-side -- never trusted from request.RanchId.
                RideOnServer.BL.Competition? competition = new CompetitionDAL().GetCompetitionById(request.CompetitionId);
                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                request.RequestingRanchId = resolvedRequestingRanchId;
                request.RanchId = competition.HostRanchId;
                request.OrderedBySystemUserId = personId;

                List<int> createdIds = StallBookingDAL.CreateTackStallBookings(request);
                return Ok(createdIds);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateTackStallBookings: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת תאי ציוד");
            }
        }

        // Ranch-model fix, backward-compat fallback (2026-08-06): pure,
        // side-effect-free resolution logic extracted for direct unit
        // testing -- same rationale as StallBookingDAL's Build...Command
        // extraction (this project avoids mocking/an HTTP test host, so
        // only I/O-free logic like this is tested by direct invocation).
        // RequestingRanchId always wins when supplied; RanchId is a
        // fallback for the currently-installed mobile client, which
        // predates RequestingRanchId and still sends the requesting/guest
        // ranch under the RanchId field for this flow.
        public static int ResolveTackRequestingRanchId(int requestingRanchId, int ranchId)
        {
            return requestingRanchId > 0 ? requestingRanchId : ranchId;
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
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
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
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
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
            [FromBody] CreateStallChangeRequestByPayerRequest request)
        {
            try
            {
                if (request == null || request.StallBookingId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
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

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.Payer
                );

                int requestId = StallBooking.CreateChangeRequestByPayer(
                    request.StallBookingId,
                    personId,
                    request.NewStartDate,
                    request.NewEndDate,
                    request.Notes
                );

                return Ok(requestId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateStallChangeRequestByPayer: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("secretary/{stallBookingId}")]
        public IActionResult SecretaryDeleteStallBooking(
            int stallBookingId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (stallBookingId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                int requestId = StallBooking.SecretaryDeleteStallBooking(stallBookingId, personId);

                return Ok(new { ChangeRequestId = requestId, Message = "Stall booking cancelled" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Business-rule/authorization guard raised inside
                // usp_secretarydeletestallbooking, already translated to
                // Hebrew by StallBookingDAL.TranslateSecretaryDeleteStallBookingError.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SecretaryDeleteStallBooking: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול הזמנת התא");
            }
        }

        // Admin-payer direct-changes feature: RanchAdmin direct stall
        // booking cancel, the stall sibling of EntriesController.AdminCancelEntry
        // and the cancel-side counterpart to AdminEditStallBooking below.
        // Deliberately a NEW, separate endpoint -- the existing
        // POST /cancel-request (payer-style pending change request) is left
        // completely unchanged.
        [HttpDelete("admin-cancel/{stallBookingId}")]
        public IActionResult AdminCancelStallBooking(
            int stallBookingId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (stallBookingId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                int requestId = StallBooking.AdminCancelStallBooking(stallBookingId, ranchId, personId);

                return Ok(new { ChangeRequestId = requestId, Message = "Stall booking cancelled" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Authorization/business-rule guard raised inside
                // usp_admincancelstallbooking.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AdminCancelStallBooking: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול הזמנת התא");
            }
        }

        [HttpPut("secretary/{stallBookingId}")]
        public IActionResult SecretaryUpdateStallBooking(
            int stallBookingId,
            [FromBody] SecretaryUpdateStallBookingRequest request)
        {
            try
            {
                if (request == null || stallBookingId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                if (stallBookingId != request.StallBookingId)
                {
                    return BadRequest("StallBookingId mismatch");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                StallBooking.SecretaryUpdateStallBooking(
                    stallBookingId,
                    personId,
                    request.NewStartDate,
                    request.NewEndDate,
                    request.Notes,
                    request.IsForTack,
                    request.HorseId);

                return Ok(new { Message = "Stall booking updated" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SecretaryUpdateStallBooking: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        // Admin-payer direct-changes feature: RanchAdmin direct stall
        // booking edit, the stall sibling of EntriesController.AdminEditEntry.
        // Deliberately a NEW, separate endpoint -- the existing
        // POST /change-request (payer-style pending change request) is left
        // completely unchanged, so the mobile edit modal's old behavior
        // stays available to any client that still calls it.
        [HttpPost("admin-edit")]
        public IActionResult AdminEditStallBooking([FromBody] AdminEditStallBookingRequest request)
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
                    RoleNames.RanchAdmin
                );

                StallBooking.AdminEditStallBooking(request, personId);

                return Ok(new { Message = "Stall booking updated" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Authorization/business-rule guard raised inside
                // usp_admineditstallbooking, including the assigned-booking
                // product-change rejection.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AdminEditStallBooking: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון הזמנת התא");
            }
        }

        [HttpPost("secretary/create-for-payer")]
        public IActionResult SecretaryCreateStallBookingForPayer(
            [FromBody] SecretaryCreateStallBookingRequest request)
        {
            try
            {
                if (request == null ||
                    request.CompetitionId <= 0 ||
                    request.PayerPersonId <= 0 ||
                    request.ProductId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                // Ranch-model fix: host-secretary authorization is checked
                // against the COMPETITION's own host ranch, derived
                // server-side -- never trusted from request.RanchId (kept on
                // the DTO only for client backward compatibility; unused here).
                RideOnServer.BL.Competition? competition = new CompetitionDAL().GetCompetitionById(request.CompetitionId);
                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    competition.HostRanchId,
                    RoleNames.HostSecretary
                );

                int newId = StallBooking.SecretaryCreateStallBookingForPayer(
                    request.CompetitionId,
                    personId,
                    request.PayerPersonId,
                    request.HorseId,
                    request.StartDate,
                    request.EndDate,
                    request.IsForTack,
                    request.ProductId,
                    request.Notes,
                    request.RequestingRanchId);

                return Ok(new { StallBookingId = newId, Message = "Stall booking created" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SecretaryCreateStallBookingForPayer: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

    }
}