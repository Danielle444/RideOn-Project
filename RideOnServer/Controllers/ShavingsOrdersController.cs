using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.DAL;

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
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetWorkerOrders: {ex.Message}");
                return StatusCode(500, "שגיאה בשליפת ההזמנות");
            }
        }

        [HttpPost("save-delivery-photo")]
        public IActionResult SaveDeliveryPhoto([FromBody] SaveDeliveryPhotoRequest request)
        {
            try
            {
                ShavingsOrder.SaveDeliveryPhoto(request);
                return Ok(new { message = "התמונה נשמרה בהצלחה" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SaveDeliveryPhoto: {ex.Message}");
                return StatusCode(500, "שגיאה בשמירת התמונה");
            }
        }

        [HttpGet("pending-approvals")]
        public IActionResult GetPendingApprovals([FromQuery] int ranchId)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                var approvals = ShavingsOrder.GetPendingDeliveryApprovals(ranchId);
                return Ok(new { data = approvals });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPendingApprovals: {ex.Message}");
                return StatusCode(500, "שגיאה בשליפת ההזמנות הממתינות");
            }
        }

        [HttpPost("approve-delivery")]
        public IActionResult ApproveDelivery([FromBody] ApproveDeliveryRequest request)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);
                request.ApprovedByPersonId = currentPersonId;

                ShavingsOrder.ApproveDelivery(request);
                return Ok(new { message = "המשלוח אושר בהצלחה" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApproveDelivery: {ex.Message}");
                return StatusCode(500, "שגיאה באישור המשלוח");
            }
        }

        [HttpPost]
        public ActionResult<int> CreateShavingsOrder([FromBody] CreateShavingsOrderRequest request)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                if (request.OrderedBySystemUserId != personId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לבצע פעולה זו עבור משתמש אחר");
                }

                if (request.Stalls == null || request.Stalls.Count == 0)
                {
                    return BadRequest("At least one stall is required.");
                }

                if (request.Payers == null || request.Payers.Count == 0)
                {
                    return BadRequest("At least one payer is required.");
                }

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                int id = ShavingsOrderDAL.CreateShavingsOrder(request);
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

        [HttpGet("stall-bookings-for-order")]
        public IActionResult GetStallBookingsForShavings(
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

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                var result = ShavingsOrderDAL.GetShavingsOrdersForCompetitionAndRanch(competitionId, ranchId);
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

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

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
    }
}