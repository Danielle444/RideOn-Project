using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ShavingsOrders;

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
            catch (UnauthorizedAccessException ex)
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
    }
}
