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

        [HttpPost("federation/credits")]
        public IActionResult CreateFederationExternalCredit(
    [FromBody] CreateFederationExternalCreditRequest request)
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

                request.CreatedBySystemUserId = personId;

                FederationExternalCreditItem item =
                    CompetitionPayment.CreateFederationExternalCredit(
                        request
                    );

                return Ok(item);
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
                    $"Error in CreateFederationExternalCredit: {ex.Message}"
                );

                return BadRequest(
                    ex.Message
                );
            }
        }

        [HttpGet("federation/credits/search")]
        public IActionResult SearchFederationExternalCredits(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] string? searchText,
            [FromQuery] bool onlyAvailable = false)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    competitionId,
                    ranchId
                );

                List<FederationExternalCreditItem> items =
                    CompetitionPayment.SearchFederationExternalCredits(
                        competitionId,
                        ranchId,
                        searchText,
                        onlyAvailable
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
                    $"Error in SearchFederationExternalCredits: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בחיפוש יתרות התאחדות"
                );
            }
        }

        [HttpPost("federation/credits/allocate")]
        public IActionResult AllocateFederationCreditToCharge(
            [FromBody] AllocateFederationCreditRequest request)
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

                request.AllocatedBySystemUserId = personId;

                AllocateFederationCreditResponse response =
                    CompetitionPayment.AllocateFederationCreditToCharge(
                        request
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
                    $"Error in AllocateFederationCreditToCharge: {ex.Message}"
                );

                return BadRequest(
                    ex.Message
                );
            }
        }

        [HttpGet("federation/credits/{federationExternalCreditId}/allocations")]
        public IActionResult GetFederationCreditAllocations(
            int federationExternalCreditId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    competitionId,
                    ranchId
                );

                List<FederationCreditAllocationItem> items =
                    CompetitionPayment.GetFederationCreditAllocations(
                        competitionId,
                        ranchId,
                        federationExternalCreditId
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
                    $"Error in GetFederationCreditAllocations: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת שיוכי יתרת התאחדות"
                );
            }
        }

        [HttpGet("federation/payers/{payerPersonId}/coverage-status")]
        public IActionResult GetFederationCoverageStatusForPayer(
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

                FederationCoverageStatusItem item =
                    CompetitionPayment.GetFederationCoverageStatusForPayer(
                        competitionId,
                        ranchId,
                        payerPersonId
                    );

                return Ok(item);
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
                    $"Error in GetFederationCoverageStatusForPayer: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת סטטוס כיסוי התאחדות"
                );
            }
        }

        [HttpGet("federation/payers/{payerPersonId}/charges")]
        public IActionResult GetFederationChargesForPayer(
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

                List<FederationChargeCoverageItem> items =
                    CompetitionPayment.GetFederationChargesForPayer(
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
                    $"Error in GetFederationChargesForPayer: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת חיובי התאחדות למשלם"
                );
            }
        }

        [HttpGet("federation/payers/{payerPersonId}/validate-before-organizer-payment")]
        public IActionResult ValidateFederationCoverageBeforeOrganizerPayment(
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

                ValidateFederationCoverageResponse response =
                    CompetitionPayment.ValidateFederationCoverageBeforeOrganizerPayment(
                        competitionId,
                        ranchId,
                        payerPersonId
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
                    $"Error in ValidateFederationCoverageBeforeOrganizerPayment: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בבדיקת כיסוי התאחדות לפני תשלום מארגן"
                );
            }
        }

        [HttpPost("federation/credits/import-excel")]
        [Consumes("multipart/form-data")]
        public IActionResult ImportFederationCreditsFromExcel(
     [FromForm] int competitionId,
     [FromForm] int ranchId,
     IFormFile file)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    competitionId,
                    ranchId
                );

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                FederationExcelImportResult result =
                    CompetitionPayment.ImportFederationExcelCreditsFromExcel(
                        competitionId,
                        ranchId,
                        personId,
                        file
                    );

                return Ok(result);
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
                    $"Error in ImportFederationCreditsFromExcel: {ex.Message}"
                );

                return BadRequest(
                    ex.Message
                );
            }
        }

        [HttpGet("federation/matching-suggestions")]
        public IActionResult GetFederationMatchingSuggestions(
    [FromQuery] int competitionId,
    [FromQuery] int ranchId)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    competitionId,
                    ranchId
                );

                List<FederationMatchingSuggestionItem> items =
                    CompetitionPayment.GetFederationMatchingSuggestions(
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
                    $"Error in GetFederationMatchingSuggestions: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת הצעות התאמת קבלות התאחדות"
                );
            }
        }

        [HttpPost("federation/matching-suggestions/approve")]
        public IActionResult ApproveFederationMatchingSuggestion(
    [FromBody] ApproveFederationMatchingSuggestionRequest request)
        {
            try
            {
                ValidateHostSecretaryCompetitionAccess(
                    request.CompetitionId,
                    request.RanchId
                );

                int personId =
                    UserAccessValidator.GetPersonIdFromClaims(User);

                ApproveFederationMatchingSuggestionResponse response =
                    CompetitionPayment.ApproveFederationMatchingSuggestion(
                        request,
                        personId
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
                    $"Error in ApproveFederationMatchingSuggestion: {ex.Message}"
                );

                return BadRequest(
                    ex.Message
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