using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Payers;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PayersController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetManagedPayers(
            [FromQuery] int ranchId,
            [FromQuery] string? search,
            [FromQuery] string? approvalStatus)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                GetManagedPayersFiltersRequest filters = new GetManagedPayersFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = search,
                    ApprovalStatus = approvalStatus
                };

                List<ManagedPayerListItem> payers =
                    Payer.GetManagedPayersBySystemUser(currentPersonId, filters);

                return Ok(payers);
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

        [HttpGet("lookup")]
        public IActionResult FindPotentialPayerByContact(
    [FromQuery] int ranchId,
    [FromQuery] string? email,
    [FromQuery] string? cellPhone)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                PotentialPayerLookupResponse? payer =
                    Payer.FindPotentialPayerByContact(email, cellPhone);

                return Ok(payer);
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

        [HttpPost("request-managed")]
        public IActionResult RequestManagedPayer([FromBody] RequestManagedPayerRequest request)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                int personId = Payer.RequestManagedPayer(currentPersonId, request);

                return Ok(new
                {
                    PersonId = personId,
                    Message = "Managed payer request created successfully"
                });
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

        [HttpPut("{personId}")]
        public IActionResult UpdateManagedPayer(int personId, [FromBody] UpdateManagedPayerRequest request)
        {
            try
            {
                if (personId != request.PersonId)
                {
                    return BadRequest("PersonId in URL does not match body");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                Payer.UpdateManagedPayerBasicDetails(currentPersonId, request);
                return Ok("Managed payer updated successfully");
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

        [HttpDelete("{personId}")]
        public IActionResult RemoveManagedPayer(int personId, [FromQuery] int ranchId)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                Payer.RemoveManagedPayer(currentPersonId, personId);
                return Ok("Managed payer removed successfully");
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


        [HttpGet("competition")]
        public IActionResult GetCompetitionPayers(
                [FromQuery] int ranchId,
                [FromQuery] int competitionId,
                [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    currentPersonId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                GetCompetitionPayersFiltersRequest filters = new GetCompetitionPayersFiltersRequest
                {
                    CompetitionId = competitionId,
                    SearchText = search
                };

                List<CompetitionPayerListItem> payers =
                    Payer.GetCompetitionPayersBySystemUser(currentPersonId, filters);

                return Ok(payers);
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


        [HttpGet("{personId}/managers")]
        public IActionResult GetPayerManagers(int personId)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                if (currentPersonId != personId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות במנהלים של משלם אחר");
                }

                List<PayerManagerItem> admins = Payer.GetPayerManagers(personId);
                return Ok(admins);
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

        [HttpGet("{personId}/available-managers")]
        public IActionResult GetAvailablePayerManagers(int personId, [FromQuery] string? search)
        {
            try
            {
                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                if (currentPersonId != personId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות במנהלים זמינים עבור משלם אחר");
                }

                List<AvailablePayerManagerItem> admins =
                    Payer.GetAvailablePayerManagers(personId, search);

                return Ok(admins);
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

        [HttpPost("{personId}/managers")]
        public IActionResult AddPayerManager(int personId, [FromBody] AddPayerManagerRequest request)
        {
            try
            {
                if (personId != request.PersonId)
                {
                    return BadRequest("PersonId in URL does not match body");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                Payer.AddPayerManager(currentPersonId, request);
                return Ok("Managing admin added successfully");
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

        [HttpDelete("{personId}/managers")]
        public IActionResult RemovePayerManager(int personId, [FromBody] RemovePayerManagerRequest request)
        {
            try
            {
                if (personId != request.PersonId)
                {
                    return BadRequest("PersonId in URL does not match body");
                }

                int currentPersonId = UserAccessValidator.GetPersonIdFromClaims(User);

                Payer.RemovePayerManager(currentPersonId, request);
                return Ok("Managing admin removed successfully");
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