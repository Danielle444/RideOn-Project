using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.DAL;
using System.Linq;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ShavingsOrdersController : ControllerBase
    {
        [HttpGet("worker-orders")]
        public IActionResult GetWorkerOrders()
        {
            try
            {
                int workerSystemUserId = UserAccessValidator.GetPersonIdFromClaims(User);

                var orders = ShavingsOrder.GetWorkerShavingsOrders(workerSystemUserId);
                return Ok(new { data = orders });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetWorkerOrders: {ex.Message}");
                return StatusCode(500, "שגיאה בשליפת ההזמנות");
            }
        }

        [HttpGet("worker-home-feed")]
        public IActionResult GetWorkerHomeFeed([FromQuery] int ranchId)
        {
            try
            {
                int workerSystemUserId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    workerSystemUserId,
                    ranchId,
                    RoleNames.RanchWorker
                );

                var orders = ShavingsOrder.GetWorkerHomeFeed(workerSystemUserId, ranchId);
                return Ok(new { data = orders });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetWorkerHomeFeed: {ex.Message}");
                return StatusCode(500, "שגיאה בשליפת הזמנות הנסורת להיום");
            }
        }

        [HttpGet("worker-by-competition")]
        public IActionResult GetWorkerOrdersByCompetition([FromQuery] int competitionId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchWorker
                );

                var orders = ShavingsOrderDAL.GetShavingsOrdersByCompetitionForWorker(competitionId, ranchId);
                return Ok(new { data = orders });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetWorkerOrdersByCompetition: {ex.Message}");
                return StatusCode(500, "שגיאה בשליפת ההזמנות");
            }
        }

        [HttpPost("claim")]
        public IActionResult ClaimOrder([FromBody] ClaimShavingsOrderRequest request)
        {
            try
            {
                int workerSystemUserId = UserAccessValidator.GetPersonIdFromClaims(User);

                EnsureCallerIsApprovedRanchWorkerForShavingsOrder(workerSystemUserId, request.ShavingsOrderId);

                bool claimed = ShavingsOrderDAL.ClaimShavingsOrder(request.ShavingsOrderId, workerSystemUserId);

                if (!claimed)
                {
                    return Conflict("ההזמנה כבר נלקחה לטיפול על ידי עובד אחר");
                }

                return Ok(new { message = "ההזמנה נלקחה לטיפולך בהצלחה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Ownership/state guard raised inside usp_claimshavingsorder (not found,
                // competition ended, order cancelled, caller not an approved worker here).
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ClaimOrder: {ex.Message}");
                return StatusCode(500, "שגיאה בלקיחת ההזמנה לטיפול");
            }
        }

        [HttpPost("save-delivery-photo")]
        public IActionResult SaveDeliveryPhoto([FromBody] SaveDeliveryPhotoRequest request)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                EnsureCallerIsApprovedRanchWorkerForShavingsOrder(currentPersonId, request.ShavingsOrderId);

                bool saved = ShavingsOrder.SaveDeliveryPhoto(request, currentPersonId);

                if (!saved)
                {
                    return Conflict("לא ניתן לשמור את התמונה עבור הזמנה זו");
                }

                return Ok(new { message = "התמונה נשמרה בהצלחה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ValidationException ex)
            {
                // Ownership/state guard raised inside usp_savedeliveryphoto (not found,
                // competition ended, order cancelled, not claimed by this worker, or a
                // delivery photo was already recorded and must not be silently replaced).
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SaveDeliveryPhoto: {ex.Message}");
                return StatusCode(500, "שגיאה בשמירת התמונה");
            }
        }

        [HttpPost("mark-delivered")]
        public IActionResult MarkDelivered([FromBody] MarkDeliveredRequest request)
        {
            try
            {
                int workerSystemUserId = UserAccessValidator.GetPersonIdFromClaims(User);

                EnsureCallerIsApprovedRanchWorkerForShavingsOrder(workerSystemUserId, request.ShavingsOrderId);

                bool delivered = ShavingsOrder.MarkDelivered(request, workerSystemUserId);

                if (!delivered)
                {
                    return Conflict("ההזמנה כבר סופקה או שאינה קיימת");
                }

                return Ok(new { message = "ההזמנה סופקה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ValidationException ex)
            {
                // Ownership/state guard raised inside usp_markdelivered (not found,
                // competition ended, order cancelled, or not claimed by this worker).
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in MarkDelivered: {ex.Message}");
                return StatusCode(500, "שגיאה בסימון ההזמנה כסופקה");
            }
        }

        [HttpPost]
        public ActionResult<int> CreateShavingsOrder([FromBody] CreateShavingsOrderRequest request)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                if (request.Stalls == null || request.Stalls.Count == 0)
                {
                    return BadRequest("At least one stall is required.");
                }

                // Ranch-model fix: requesting ranch is derived server-side
                // from the referenced stall bookings themselves -- never
                // trusted from request.RanchId. Fails fast here (before the
                // write) if a stall is missing or if the selection spans more
                // than one requesting ranch; usp_createshavingsorder repeats
                // this exact check internally as defense in depth.
                List<int> stallBookingIds = request.Stalls
                    .Select(s => s.StallBookingId)
                    .Distinct()
                    .ToList();

                Dictionary<int, int> requestingRanchByStall =
                    StallBookingDAL.GetRequestingRanchIdsForStallBookings(stallBookingIds);

                List<int> missingStallIds = stallBookingIds
                    .Where(id => !requestingRanchByStall.ContainsKey(id))
                    .ToList();

                if (missingStallIds.Count > 0)
                {
                    return NotFound($"Stall booking(s) not found: {string.Join(", ", missingStallIds)}");
                }

                List<int> distinctRequestingRanchIds = requestingRanchByStall.Values.Distinct().ToList();

                if (distinctRequestingRanchIds.Count != 1)
                {
                    return BadRequest("All selected stalls must belong to the same requesting ranch.");
                }

                int requestingRanchId = distinctRequestingRanchIds[0];

                EnsureCanAccessCompetitionRanchShavings(personId, request.CompetitionId, requestingRanchId);

                // Host/service ranch is the COMPETITION's own host ranch,
                // derived server-side -- never trusted from request.RanchId.
                RideOnServer.BL.Competition? competition = new CompetitionDAL().GetCompetitionById(request.CompetitionId);
                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                request.RanchId = competition.HostRanchId;

                // לא סומכים על ה-client.
                // גם אם הוא שלח OrderedBySystemUserId אחר, אנחנו דורסים אותו לפי הטוקן.
                request.OrderedBySystemUserId = personId;

                int id = ShavingsOrderDAL.CreateShavingsOrder(request);
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
                return BadRequest(ex.Message);
            }
        }

        // Standalone shavings cancellation, Payer-gated: creates a Pending
        // productchangerequest via usp_cancelshavingsorderbypayer (240) --
        // the shavings sibling of StallBookingsController's
        // POST /cancel-request. Secretary approval happens later through the
        // existing Change Tracking page (proc 222 already handles this
        // category correctly, unmodified).
        [HttpPost("cancel-request")]
        public IActionResult CancelShavingsOrderByPayer([FromBody] CancelShavingsOrderRequest request)
        {
            try
            {
                if (request == null || request.ShavingsOrderId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.Payer
                );

                int requestId = ShavingsOrder.CancelShavingsOrderByPayer(request.ShavingsOrderId, personId);

                return Ok(new { ChangeRequestId = requestId, Message = "בקשת הביטול נשלחה למזכירה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CancelShavingsOrderByPayer: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        // Standalone shavings cancellation, RanchAdmin-direct: calls
        // usp_admincancelshavingsorder (241) -- the shavings sibling of
        // StallBookingsController.AdminCancelStallBooking. Deliberately a
        // separate endpoint from the payer-gated POST /cancel-request above.
        [HttpDelete("admin-cancel/{shavingsOrderId}")]
        public IActionResult AdminCancelShavingsOrder(
            int shavingsOrderId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (shavingsOrderId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                int requestId = ShavingsOrder.AdminCancelShavingsOrder(shavingsOrderId, ranchId, personId);

                return Ok(new { ChangeRequestId = requestId, Message = "הזמנת הנסורת בוטלה" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Authorization/business-rule guard raised inside
                // usp_admincancelshavingsorder.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AdminCancelShavingsOrder: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול הזמנת הנסורת");
            }
        }

        // Standalone shavings cancellation, HostSecretary-direct: calls
        // usp_secretarycancelshavingsorder (242) -- the shavings sibling of
        // StallBookingsController.SecretaryDeleteStallBooking, built to the
        // same RN001/409 standard as AdminCancelShavingsOrder above (242,
        // unlike its stall sibling 146, raises RN001).
        [HttpDelete("secretary/{shavingsOrderId}")]
        public IActionResult SecretaryCancelShavingsOrder(
            int shavingsOrderId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (shavingsOrderId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                int requestId = ShavingsOrder.SecretaryCancelShavingsOrder(shavingsOrderId, personId, ranchId);

                return Ok(new { ChangeRequestId = requestId, Message = "הזמנת הנסורת בוטלה" });
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
                Console.WriteLine($"Error in SecretaryCancelShavingsOrder: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול הזמנת הנסורת");
            }
        }

        [HttpGet("stall-bookings-for-order")]
        public IActionResult GetStallBookingsForShavings(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                EnsureCanAccessCompetitionRanchShavings(personId, competitionId, ranchId);

                var result = ShavingsOrderDAL.GetStallBookingsForShavings(competitionId, ranchId);
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

        [HttpGet("by-competition-and-ranch")]
        public IActionResult GetShavingsOrdersForCompetitionAndRanch(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                EnsureCanAccessCompetitionRanchShavings(personId, competitionId, ranchId);

                // CanCancelShavings's ownership dimension (see proc 176's header) mirrors
                // usp_admincancelshavingsorder (241), which only a RanchAdmin at ranchId can
                // ever call -- so the authenticated personId is threaded through ONLY for
                // that caller, never taken from the request. A HostSecretary reached via
                // EnsureCanAccessCompetitionRanchShavings's cross-ranch case cancels through
                // a different proc (242) with no ownership dimension, so passing their
                // personId here would wrongly gate CanCancelShavings by rules that proc never
                // enforces for them -- leaving it null keeps the proc's existing behavior for
                // every non-RanchAdmin caller unchanged.
                int? adminPersonId = UserAccessValidator.HasUserRoleInRanch(personId, ranchId, RoleNames.RanchAdmin)
                    ? personId
                    : (int?)null;

                var result = ShavingsOrderDAL.GetShavingsOrdersForCompetitionAndRanch(competitionId, ranchId, adminPersonId);
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

        [HttpGet("{shavingsOrderId}/details")]
        public IActionResult GetShavingsOrderDetails(int shavingsOrderId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                // NOTE: still the strict single-ranch check, so a host secretary cannot read a
                // guest ranch's order here the way they can on the competition-scoped endpoints.
                // This route has no competitionId to resolve the host ranch from, and no client
                // currently calls it. If a caller is added, resolve the competition from
                // shavingsOrderId and switch to EnsureCanAccessCompetitionRanchShavings.
                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                var result = ShavingsOrderDAL.GetShavingsOrderDetails(shavingsOrderId);
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

        [HttpGet("{shavingsOrderId}/payers")]
        public IActionResult GetPayersForShavingsOrder(int shavingsOrderId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                // NOTE: strict single-ranch check (same limitation as {id}/details) -- no
                // competitionId on this route to derive the host ranch, and no client calls it.
                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                var result = ShavingsOrderDAL.GetPayersForShavingsOrder(shavingsOrderId);
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

        [HttpGet("payers/by-competition-and-ranch")]
        public IActionResult GetAllShavingsOrderPayersForCompetitionAndRanch(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                EnsureCanAccessCompetitionRanchShavings(personId, competitionId, ranchId);

                var result = ShavingsOrderDAL.GetAllShavingsOrderPayersForCompetitionAndRanch(competitionId, ranchId);
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

        [HttpGet("details/by-competition-and-ranch")]
        public IActionResult GetAllDetailsForCompetitionAndRanch(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId
        )
        {
            try
            {
                int personId =
                    UserAccessValidator
                        .GetPersonIdFromClaims(User);

                EnsureCanAccessCompetitionRanchShavings(personId, competitionId, ranchId);

                var list =
                    ShavingsOrderDAL
                        .GetAllShavingsOrderDetailsForCompetitionAndRanch(
                            competitionId,
                            ranchId
                        );

                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    ex.Message
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error getting shavings details: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת פרטי נסורת"
                );
            }
        }

        // Read-authorization for a single (competition, requesting-ranch) shavings slice.
        //
        // Two legitimate callers, either one is sufficient:
        //   1. Own-ranch view (mobile RanchAdmin looking at their own ranch): the caller
        //      has RanchAdmin/HostSecretary in the passed ranchId itself.
        //   2. Host cross-ranch view (web HostSecretary of the competition's host ranch
        //      paging over every PARTICIPATING guest ranch): the caller has
        //      HostSecretary/RanchAdmin in the competition's own host ranch.
        //
        // Case 2 is why the plain EnsureUserHasAnyRoleInRanch(personId, ranchId, ...) check
        // was wrong here -- a host secretary is not a member of the guest ranches whose
        // orders they legitimately manage, so every guest ranch returned 403. The proc is
        // scoped by competitionId + requestingranchid, so host access cannot leak data from
        // a competition the caller does not host.
        private void EnsureCanAccessCompetitionRanchShavings(int personId, int competitionId, int ranchId)
        {
            // 1. Own-ranch access -- cheapest, covers the mobile admin path unchanged.
            if (UserAccessValidator.HasUserAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary))
            {
                return;
            }

            // 2. Host-ranch access -- host ranch is derived server-side from the competition,
            //    never trusted from the request.
            RideOnServer.BL.Competition? competition =
                new CompetitionDAL().GetCompetitionById(competitionId);

            if (competition != null &&
                UserAccessValidator.HasUserAnyRoleInRanch(
                    personId,
                    competition.HostRanchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin))
            {
                return;
            }

            throw new UnauthorizedAccessException(
                "אין לך הרשאה לבצע פעולה זו עבור החווה שנבחרה");
        }

        // Worker shavings-mutation authorization fix (P0). claim / save-delivery-photo /
        // mark-delivered receive no ranchId from the client at all, so the real host ranch is
        // resolved server-side via ShavingsOrderDAL.GetShavingsOrderCompetitionContext -- never
        // trusted from the request -- before UserAccessValidator runs. This is defense layer 1
        // (role/ranch -> 403); usp_claimshavingsorder / usp_savedeliveryphoto / usp_markdelivered
        // each independently re-derive and re-check the same host ranch plus ownership/state as
        // defense layer 2 (-> 409 via RN001), so a direct DB/API call bypassing this controller
        // cannot skip authorization either.
        //
        // An order that does not resolve to a competition (does not exist) is deliberately let
        // through here -- ResolveShavingsMutationAuthorization returns Authorized for a null host
        // ranch -- so the mutating stored procedure's own "Shavings order not found" RN001 guard
        // stays the single source of truth for that message, instead of duplicating it here.
        private static void EnsureCallerIsApprovedRanchWorkerForShavingsOrder(int personId, int shavingsOrderId)
        {
            ShavingsOrderCompetitionContext? context =
                ShavingsOrderDAL.GetShavingsOrderCompetitionContext(shavingsOrderId);

            bool isApprovedRanchWorkerAtHostRanch =
                context != null &&
                UserAccessValidator.HasUserRoleInRanch(personId, context.HostRanchId, RoleNames.RanchWorker);

            ShavingsMutationAuthorization authorization = ResolveShavingsMutationAuthorization(
                context?.HostRanchId,
                isApprovedRanchWorkerAtHostRanch);

            if (authorization == ShavingsMutationAuthorization.Denied)
            {
                throw new UnauthorizedAccessException(
                    "אין לך הרשאה לבצע פעולה זו עבור החווה שנבחרה");
            }
        }

        private enum ShavingsMutationAuthorization
        {
            Authorized,
            Denied
        }

        // Pure decision, reachable by reflection from RideOnServer.Tests without a DB
        // (see StallBookingRanchModelAuthorizationTests / HealthCertificateAuthorizationTests
        // for the established pattern this project uses for authorization coverage).
        private static ShavingsMutationAuthorization ResolveShavingsMutationAuthorization(
            int? hostRanchId,
            bool isApprovedRanchWorkerAtHostRanch)
        {
            if (hostRanchId == null)
            {
                return ShavingsMutationAuthorization.Authorized;
            }

            return isApprovedRanchWorkerAtHostRanch
                ? ShavingsMutationAuthorization.Authorized
                : ShavingsMutationAuthorization.Denied;
        }
    }
}