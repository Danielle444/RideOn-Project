using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CompetitionsController : ControllerBase
    {
        [HttpGet("by-host-ranch")]
        public IActionResult GetCompetitionsByHostRanch(
            [FromQuery] int ranchId,
            [FromQuery] string? searchText,
            [FromQuery] string? status,
            [FromQuery] byte? fieldId,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                CompetitionFiltersRequest filters = new CompetitionFiltersRequest
                {
                    RanchId = ranchId,
                    SearchText = searchText,
                    Status = status,
                    FieldId = fieldId,
                    DateFrom = dateFrom,
                    DateTo = dateTo
                };

                List<Competition> list = Competition.GetCompetitionsByHostRanch(filters);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionsByHostRanch: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת תחרויות החווה המארחת");
            }
        }

        [HttpGet("{competitionId}")]
        public IActionResult GetCompetitionById(int competitionId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בתחרות זו");
                }

                return Ok(competition);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionById: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פרטי התחרות");
            }
        }

        [HttpPost]
        public IActionResult CreateCompetition([FromBody] CreateCompetitionRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                int newCompetitionId = Competition.CreateCompetition(request, personId);

                return Ok(new
                {
                    CompetitionId = newCompetitionId,
                    Message = "Competition created successfully"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת תחרות");
            }
        }

        [HttpPost("duplicate")]
        public IActionResult DuplicateCompetition([FromBody] DuplicateCompetitionRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition sourceCompetition = Competition.GetCompetitionById(request.SourceCompetitionId)
                    ?? throw new Exception("Source competition not found");

                if (sourceCompetition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לשכפל תחרות זו");
                }

                DuplicateCompetitionResponse response = Competition.DuplicateCompetition(
                    request,
                    personId
                );

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DuplicateCompetition: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("duplicate-from-selection")]
        public IActionResult DuplicateCompetitionFromSelection(
    [FromBody] DuplicateCompetitionFromSelectionRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition sourceCompetition = Competition.GetCompetitionById(request.SourceCompetitionId)
                    ?? throw new Exception("Source competition not found");

                if (sourceCompetition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לשכפל תחרות זו");
                }

                DuplicateCompetitionResponse response = Competition.DuplicateCompetitionFromSelection(
                    request,
                    personId
                );

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DuplicateCompetitionFromSelection: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{competitionId}")]
        public IActionResult UpdateCompetition(int competitionId, [FromBody] UpdateCompetitionRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (competitionId != request.CompetitionId)
                {
                    return BadRequest("CompetitionId in URL does not match body");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition existingCompetition = Competition.GetCompetitionById(request.CompetitionId)
                    ?? throw new Exception("Competition not found");

                if (existingCompetition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לערוך תחרות זו");
                }

                // Ordinary edits must not be able to move an EXISTING competition's
                // dates — that would silently desynchronize classes/paid-time/stall
                // bookings/shavings from the competition row, bypassing the atomic
                // reschedule operation. usp_UpdateCompetition itself has no such
                // guard (it is a plain column UPDATE), so this must be enforced
                // here, before the BL/DAL call, using the already-fetched
                // persisted row as the source of truth. Name/field/notes/status
                // and the manually-managed registration/paid-time admin dates are
                // untouched by this check and continue through unchanged.
                if (existingCompetition.CompetitionStartDate.Date != request.CompetitionStartDate.Date ||
                    existingCompetition.CompetitionEndDate.Date != request.CompetitionEndDate.Date)
                {
                    return StatusCode(
                        StatusCodes.Status409Conflict,
                        "לא ניתן לשנות תאריכי תחרות קיימת דרך העריכה הרגילה. יש להשתמש בפעולת דחיית התחרות."
                    );
                }

                Competition.UpdateCompetition(request);

                return Ok("Competition updated successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון תחרות");
            }
        }

        // Dedicated reschedule endpoint — deliberately NOT folded into
        // UpdateCompetition. Rescheduling is a multi-table atomic business
        // operation (competition + classes + paid-time + stall bookings +
        // undelivered shavings), not a plain field edit, and needs its own
        // failure-mapping (409 for expected business conflicts) that
        // UpdateCompetition's callers do not expect.
        [HttpPost("{competitionId}/reschedule")]
        public IActionResult RescheduleCompetition(int competitionId, [FromBody] RescheduleCompetitionRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (competitionId != request.CompetitionId)
                {
                    return BadRequest("CompetitionId in URL does not match body");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.HostRanchId,
                    RoleNames.HostSecretary
                );

                Competition? existingCompetition = Competition.GetCompetitionById(request.CompetitionId);

                if (existingCompetition == null)
                {
                    return NotFound("Competition not found");
                }

                if (existingCompetition.HostRanchId != request.HostRanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לדחות תחרות זו");
                }

                RescheduleCompetitionResponse response = Competition.RescheduleCompetition(request);

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Expected business-rule failure (already started, invalid
                // offset, pending requests, out-of-range schedule, stall
                // overlap) — an actionable conflict, not a server error.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in RescheduleCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.");
            }
        }

        [HttpGet("mobile/admin-board")]
        public IActionResult GetMobileAdminCompetitionsBoard([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                List<Competition> list = Competition.GetAllCompetitionsForMobileAdmin();
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMobileAdminCompetitionsBoard: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת לוח התחרויות לאדמין");
            }
        }

        [HttpGet("mobile/worker-board")]
        public IActionResult GetMobileWorkerCompetitionsBoard([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchWorker
                );

                List<Competition> list = Competition.GetCompetitionsForMobileWorker(ranchId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMobileWorkerCompetitionsBoard: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת לוח התחרויות לעובד");
            }
        }

        [HttpGet("mobile/payer-board")]
        public IActionResult GetMobilePayerCompetitionsBoard([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.Payer
                );

                List<Competition> list = Competition.GetCompetitionsForMobilePayer(ranchId, personId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMobilePayerCompetitionsBoard: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת לוח התחרויות למשלם");
            }
        }

        [HttpGet("mobile/admin-home")]
        public IActionResult GetMobileAdminHomeCompetitions([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                List<Competition> list = Competition.GetCompetitionsForMobileAdminHome(personId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMobileAdminHomeCompetitions: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת תחרויות הבית לאדמין");
            }
        }

        [HttpGet("{competitionId}/invitation")]
        public IActionResult GetCompetitionInvitationDetails(int competitionId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                Competition? competition = Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                var roles = User.Claims
                    .Where(c => c.Type == "RoleName")
                    .Select(c => c.Value)
                    .ToList();

                if (roles.Count == 0)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "Missing roles");
                }

                if (roles.Contains(RoleNames.HostSecretary))
                {
                    UserAccessValidator.EnsureUserHasRoleInRanch(
                        personId,
                        competition.HostRanchId,
                        RoleNames.HostSecretary
                    );
                }
                else if (roles.Contains(RoleNames.RanchAdmin))
                {
                    UserAccessValidator.EnsureUserHasAnyApprovedRole(
                        personId,
                        RoleNames.RanchAdmin
                    );
                }
                else if (roles.Contains(RoleNames.Payer))
                {
                    UserAccessValidator.EnsureUserHasAnyApprovedRole(
                        personId,
                        RoleNames.Payer
                    );
                }
                else if (roles.Contains(RoleNames.RanchWorker))
                {
                    UserAccessValidator.EnsureUserHasRoleInRanch(
                        personId,
                        competition.HostRanchId,
                        RoleNames.RanchWorker
                    );
                }
                else
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בפרטי תחרות");
                }

                if (competition.CompetitionStatus == CompetitionStatuses.Draft &&
                    !roles.Contains(RoleNames.HostSecretary))
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "טיוטת תחרות זמינה רק לחווה המארחת");
                }

                var response = CompetitionInvitationManager.GetInvitationDetails(competitionId);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionInvitationDetails: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פרטי הזמנת התחרות");
            }
        }
    }
}