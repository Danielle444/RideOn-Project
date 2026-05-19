using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.CompetitionPayments;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CompetitionPaymentsController : ControllerBase
    {
        [HttpGet("payers")]
        public IActionResult GetPayersPaymentSummary(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    competitionId,
                    ranchId
                );

                List<CompetitionPayerPaymentSummaryItem> items =
                    CompetitionPayment.GetPayersPaymentSummary(
                        competitionId,
                        ranchId
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
                    $"Error in GetPayersPaymentSummary: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת רשימת משלמים"
                );
            }
        }

        [HttpGet("payers/{payerPersonId}/account-summary")]
        public IActionResult GetPayerAccountSummary(
            int payerPersonId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    competitionId,
                    ranchId
                );

                List<CompetitionPayerAccountSummaryItem> items =
                    CompetitionPayment.GetPayerAccountSummary(
                        competitionId,
                        ranchId,
                        payerPersonId
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
                    $"Error in GetPayerAccountSummary: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת סיכום חשבון משלם"
                );
            }
        }

        [HttpGet("payers/{payerPersonId}/category-summary")]
        public IActionResult GetPayerCategorySummary(
            int payerPersonId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    competitionId,
                    ranchId
                );

                List<CompetitionPayerCategorySummaryItem> items =
                    CompetitionPayment.GetPayerCategorySummary(
                        competitionId,
                        ranchId,
                        payerPersonId
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
                    $"Error in GetPayerCategorySummary: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת קטגוריות חשבון משלם"
                );
            }
        }

        [HttpGet("payers/{payerPersonId}/charges")]
        public IActionResult GetPayerCharges(
            int payerPersonId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] string? chargeOwner,
            [FromQuery] string? categoryKey)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    competitionId,
                    ranchId
                );

                List<CompetitionPayerChargeItem> items =
                    CompetitionPayment.GetPayerCharges(
                        competitionId,
                        ranchId,
                        payerPersonId,
                        chargeOwner,
                        categoryKey
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
                    $"Error in GetPayerCharges: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת שורות חיוב"
                );
            }
        }

        [HttpGet("payment-methods")]
        public IActionResult GetPaymentMethods()
        {
            try
            {
                List<PaymentMethodItem> items =
                    CompetitionPayment.GetPaymentMethods();

                return Ok(items);
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error in GetPaymentMethods: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת אמצעי תשלום"
                );
            }
        }

        [HttpPost("payments")]
        public IActionResult CreateCompetitionPayment(
            [FromBody] CreateCompetitionPaymentRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                ValidateHostSecretaryCompetitionAccess(
                    request.CompetitionId,
                    request.RanchId
                );

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                request.EnteredBySystemUserId = personId;

                int paymentBatchId =
                    CompetitionPayment.CreateCompetitionPayment(
                        request
                    );

                CreateCompetitionPaymentResponse response =
                    new CreateCompetitionPaymentResponse
                    {
                        PaymentBatchId = paymentBatchId,
                        Message = "Payment created successfully"
                    };

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
                    $"Error in CreateCompetitionPayment: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה ביצירת תשלום"
                );
            }
        }

        private void ValidateHostSecretaryCompetitionAccess(
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
                    "אין לך הרשאה לצפות בתשלומי תחרות זו"
                );
            }
        }
    }
}