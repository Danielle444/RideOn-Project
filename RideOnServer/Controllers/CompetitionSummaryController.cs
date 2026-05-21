using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.CompetitionSummary;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CompetitionSummaryController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetCompetitionSummary(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition =
                    Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה לצפות בסיכום תחרות זו"
                    );
                }

                CompetitionSummaryResponse response =
                    CompetitionSummary.GetCompetitionSummary(
                        competitionId,
                        ranchId
                    );

                return Ok(response);
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
                    $"Error in GetCompetitionSummary: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת סיכום התחרות"
                );
            }
        }

        [HttpGet("classes")]
        public IActionResult GetCompetitionSummaryClassDetails(
    [FromQuery] int competitionId,
    [FromQuery] int ranchId,
    [FromQuery] string sectionKey)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition =
                    Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה לצפות בסיכום תחרות זו"
                    );
                }

                List<CompetitionSummaryClassDetailItem> items =
                    CompetitionSummary.GetCompetitionSummaryClassDetails(
                        competitionId,
                        ranchId,
                        sectionKey
                    );

                return Ok(items);
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
                    $"Error in GetCompetitionSummaryClassDetails: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת פירוט המקצים"
                );
            }
        }

        [HttpGet("classes/{classInCompId}/entries")]
        public IActionResult GetCompetitionSummaryClassEntries(
            int classInCompId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] string sectionKey)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0 || classInCompId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition =
                    Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה לצפות בסיכום תחרות זו"
                    );
                }

                List<CompetitionSummaryClassEntryItem> items =
                    CompetitionSummary.GetCompetitionSummaryClassEntries(
                        competitionId,
                        ranchId,
                        classInCompId,
                        sectionKey
                    );

                return Ok(items);
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
                    $"Error in GetCompetitionSummaryClassEntries: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת כניסות המקצה"
                );
            }
        }

        [HttpGet("paid-time")]
        public IActionResult GetCompetitionSummaryPaidTimeDetails(
    [FromQuery] int competitionId,
    [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                List<CompetitionSummaryPaidTimeDetailItem> items =
                    CompetitionSummary.GetCompetitionSummaryPaidTimeDetails(
                        competitionId,
                        ranchId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCompetitionSummaryPaidTimeDetails: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת פירוט פייד־טיים");
            }
        }

        [HttpGet("paid-time/{paidTimeSlotInCompId}/entries")]
        public IActionResult GetCompetitionSummaryPaidTimeEntries(
            int paidTimeSlotInCompId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] short productId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                if (paidTimeSlotInCompId <= 0 || productId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                List<CompetitionSummaryPaidTimeEntryItem> items =
                    CompetitionSummary.GetCompetitionSummaryPaidTimeEntries(
                        competitionId,
                        ranchId,
                        paidTimeSlotInCompId,
                        productId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCompetitionSummaryPaidTimeEntries: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת בקשות פייד־טיים");
            }
        }

        [HttpGet("stalls")]
        public IActionResult GetCompetitionSummaryStallDetails(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                List<CompetitionSummaryStallDetailItem> items =
                    CompetitionSummary.GetCompetitionSummaryStallDetails(
                        competitionId,
                        ranchId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCompetitionSummaryStallDetails: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת פירוט תאים");
            }
        }

        [HttpGet("stalls/entries")]
        public IActionResult GetCompetitionSummaryStallEntries(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] int bookingRanchId,
            [FromQuery] short productId,
            [FromQuery] bool isForTack)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                if (bookingRanchId <= 0 || productId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                List<CompetitionSummaryStallEntryItem> items =
                    CompetitionSummary.GetCompetitionSummaryStallEntries(
                        competitionId,
                        ranchId,
                        bookingRanchId,
                        productId,
                        isForTack
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCompetitionSummaryStallEntries: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת הזמנות תאים");
            }
        }

        [HttpGet("shavings")]
        public IActionResult GetCompetitionSummaryShavingsDetails(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                List<CompetitionSummaryShavingsDetailItem> items =
                    CompetitionSummary.GetCompetitionSummaryShavingsDetails(
                        competitionId,
                        ranchId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCompetitionSummaryShavingsDetails: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת פירוט נסורת");
            }
        }

        [HttpGet("shavings/entries")]
        public IActionResult GetCompetitionSummaryShavingsEntries(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] int bookingRanchId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                if (bookingRanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                List<CompetitionSummaryShavingsEntryItem> items =
                    CompetitionSummary.GetCompetitionSummaryShavingsEntries(
                        competitionId,
                        ranchId,
                        bookingRanchId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCompetitionSummaryShavingsEntries: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת הזמנות נסורת");
            }
        }

        [HttpGet("cash")]
        public IActionResult GetCompetitionSummaryCashDetails(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                List<CompetitionSummaryCashDetailItem> items =
                    CompetitionSummary.GetCompetitionSummaryCashDetails(
                        competitionId,
                        ranchId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCompetitionSummaryCashDetails: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת פירוט קופה");
            }
        }

        [HttpGet("payments/method-breakdown")]
        public IActionResult GetPaymentMethodBreakdown(
    [FromQuery] int competitionId,
    [FromQuery] int ranchId,
    [FromQuery] string chargeOwner = "Organizer")
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                List<CompetitionSummaryPaymentMethodBreakdownItem> items =
                    CompetitionSummary.GetPaymentMethodBreakdown(
                        competitionId,
                        ranchId,
                        chargeOwner
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetPaymentMethodBreakdown: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת פילוח תשלומים");
            }
        }

        [HttpGet("payments/batches")]
        public IActionResult GetPaymentBatches(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] string chargeOwner = "Organizer",
            [FromQuery] int? paymentMethodId = null)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                List<CompetitionSummaryPaymentBatchItem> items =
                    CompetitionSummary.GetPaymentBatches(
                        competitionId,
                        ranchId,
                        chargeOwner,
                        paymentMethodId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetPaymentBatches: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת חשבוניות תשלום");
            }
        }

        [HttpGet("payments/batches/{paymentBatchId}/methods")]
        public IActionResult GetPaymentBatchMethods(
            int paymentBatchId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                if (paymentBatchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                List<CompetitionSummaryPaymentBatchMethodItem> items =
                    CompetitionSummary.GetPaymentBatchMethods(
                        competitionId,
                        ranchId,
                        paymentBatchId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetPaymentBatchMethods: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת אמצעי התשלום לחשבונית");
            }
        }

        [HttpGet("payments/batches/{paymentBatchId}/charges")]
        public IActionResult GetPaymentBatchCharges(
            int paymentBatchId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                if (paymentBatchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                List<CompetitionSummaryPaymentBatchChargeItem> items =
                    CompetitionSummary.GetPaymentBatchCharges(
                        competitionId,
                        ranchId,
                        paymentBatchId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetPaymentBatchCharges: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת פריטי החשבונית");
            }
        }

        [HttpGet("cash-desk/overview")]
        public IActionResult GetCashDeskOverview(
    [FromQuery] int competitionId,
    [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretarySummaryAccess(competitionId, ranchId);

                CompetitionCashDeskOverviewItem item =
                    CompetitionSummary.GetCashDeskOverview(
                        competitionId,
                        ranchId
                    );

                return Ok(item);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetCashDeskOverview: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשליפת נתוני קופה");
            }
        }

        [HttpPost("cash-desk/count")]
        public IActionResult SaveCashCount(
    [FromBody] SaveCompetitionCashCountRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                ValidateHostSecretarySummaryAccess(
                    request.CompetitionId,
                    request.RanchId
                );

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                request.CountedBySystemUserId = personId;

                int cashCountId =
                    CompetitionSummary.SaveCashCount(request);

                return Ok(
                    new SaveCompetitionCashActionResponse
                    {
                        Id = cashCountId,
                        Message = "ספירת הקופה נשמרה בהצלחה"
                    }
                );
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in SaveCashCount: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשמירת ספירת הקופה");
            }
        }

        [HttpPost("cash-desk/safe-transfer")]
        public IActionResult SaveCashSafeTransfer(
    [FromBody] SaveCompetitionCashSafeTransferRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                ValidateHostSecretarySummaryAccess(
                    request.CompetitionId,
                    request.RanchId
                );

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                request.TransferredBySystemUserId = personId;

                int transferId =
                    CompetitionSummary.SaveCashSafeTransfer(request);

                return Ok(
                    new SaveCompetitionCashActionResponse
                    {
                        Id = transferId,
                        Message = "העברה לכספת נשמרה בהצלחה"
                    }
                );
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in SaveCashSafeTransfer: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בשמירת העברה לכספת");
            }
        }

        private void ValidateHostSecretarySummaryAccess(
    int competitionId,
    int ranchId)
        {
            if (competitionId <= 0 || ranchId <= 0)
            {
                throw new Exception("Invalid request");
            }

            int personId =
                UserAccessValidator.GetPersonIdFromClaims(User);

            UserAccessValidator.EnsureUserHasRoleInRanch(
                personId,
                ranchId,
                RoleNames.HostSecretary
            );

            Competition? competition =
                Competition.GetCompetitionById(competitionId);

            if (competition == null)
            {
                throw new Exception("Competition not found");
            }

            if (competition.HostRanchId != ranchId)
            {
                throw new UnauthorizedAccessException(
                    "אין לך הרשאה לצפות בסיכום תחרות זו"
                );
            }
        }
    }
}