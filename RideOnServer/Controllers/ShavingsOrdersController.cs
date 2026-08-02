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

                // TODO:
                // לחזק בהמשך:
                // לוודא שה-currentPersonId הוא העובד שההזמנה משויכת אליו
                // או שהוא עובד חווה מורשה להזמנה הזו.
                // כרגע אין ב-request ranchId ואין כאן בדיקת שיוך להזמנה.

                ShavingsOrder.SaveDeliveryPhoto(request);
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

                // TODO (parity with save-delivery-photo):
                // אין כאן בדיקת שיוך ההזמנה לעובד הנוכחי. לחזק בהמשך כמו ב-save-delivery-photo.

                bool delivered = ShavingsOrder.MarkDelivered(request);

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

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

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

                UserAccessValidator
                    .EnsureUserHasAnyRoleInRanch(
                        personId,
                        ranchId,
                        RoleNames.HostSecretary,
                        RoleNames.RanchAdmin
                    );

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
    }
}