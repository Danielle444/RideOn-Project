using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EntriesController : ControllerBase
    {
        [HttpPost]
        public IActionResult CreateEntry([FromBody] CreateEntryRequest request)
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
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                request.OrderedBySystemUserId = personId;

                int entryId = Entry.CreateEntry(request);

                return Ok(new
                {
                    EntryId = entryId,
                    Message = "Entry created successfully"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Business-rule/race guard raised inside usp_insertentry (RN001).
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateEntry: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת הרשמה למקצה");
            }
        }

        // Stage B: admin-direct entry creation, routed server-side (Direct vs
        // Pending) by usp_admincreateentry from live registration state.
        // Deliberately a NEW, separate endpoint -- POST /Entries above is
        // left completely unchanged, so any client still calling it keeps
        // its exact current behavior regardless of this addition.
        [HttpPost("admin-create")]
        public IActionResult AdminCreateEntry([FromBody] AdminCreateEntryRequest request)
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
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                // personId is never a field on AdminCreateEntryRequest -- it
                // is passed as its own parameter, so there is nothing on the
                // request body to overwrite. See the DTO's header comment.
                AdminCreateEntryResult result = Entry.AdminCreateEntry(request, personId);

                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Idempotency mismatch, payer authorization failure, or any
                // reused usp_insertentry business-rule guard raised as RN001.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AdminCreateEntry: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת הרשמה למקצה");
            }
        }

        // Stage C: admin-direct entry edit, routed server-side (DirectUpdated
        // vs DirectReplaced vs PendingReplaceApproval) by usp_admineditentry.
        // Deliberately a NEW, separate endpoint -- the existing generic
        // POST /api/ChangeEntryRequests flow is left completely unchanged.
        [HttpPost("admin-edit")]
        public IActionResult AdminEditEntry([FromBody] AdminEditEntryRequest request)
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
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                AdminEditEntryResult result = Entry.AdminEditEntry(request, personId);

                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Authorization/business-rule guard raised inside
                // usp_admineditentry, or inside the change-request procs it
                // composes with.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AdminEditEntry: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון ההרשמה");
            }
        }

        // Stage C: admin-direct entry cancellation, regardless of
        // registration-ended state. Same route/query-param shape as
        // SecretaryDeleteEntry below -- deliberately a NEW, separate
        // endpoint from both that one and the generic
        // POST /api/ChangeEntryRequests/cancel-by-payer flow.
        [HttpDelete("admin-cancel/{entryId}")]
        public IActionResult AdminCancelEntry(
            int entryId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (entryId <= 0 || competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                AdminCancelEntryResult result = Entry.AdminCancelEntry(entryId, personId, competitionId, ranchId);

                return Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Authorization/business-rule guard raised inside
                // usp_admincancelentry, or inside the change-request procs
                // it composes with.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AdminCancelEntry: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול ההרשמה");
            }
        }

        [HttpGet("paid-time-candidates")]
        public IActionResult GetPaidTimeCandidatesByRanch(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                List<PaidTimeCandidateItem> items =
                    Entry.GetPaidTimeCandidatesByRanch(competitionId, ranchId);

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPaidTimeCandidatesByRanch: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מועמדים לפייד טיים");
            }
        }

        // HostSecretary Paid-Time creation (Slice B, 2026-08-07): additive
        // sibling of GetPaidTimeCandidatesByRanch above, which is shared
        // with the mobile RanchAdmin self-service flow and stays untouched.
        // This one is HostSecretary-only, authorized against the
        // competition's own host ranch (never a client-supplied scope), and
        // returns candidates across every participating ranch.
        [HttpGet("paid-time-candidates-for-competition")]
        public IActionResult GetPaidTimeCandidatesForCompetition(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                RideOnServer.BL.Competition? competition = RideOnServer.BL.Competition.GetCompetitionById(competitionId);

                if (competition == null)
                {
                    return NotFound("התחרות לא נמצאה");
                }

                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות במועמדים לפייד טיים של תחרות זו");
                }

                List<PaidTimeCandidateForCompetitionItem> items =
                    Entry.GetPaidTimeCandidatesForCompetition(competitionId);

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPaidTimeCandidatesForCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מועמדים לפייד טיים");
            }
        }

        [HttpGet("my-competition")]
        public IActionResult GetMyCompetitionEntries(
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
                    RoleNames.RanchAdmin
                );

                List<MyCompetitionEntryItem> items =
                    Entry.GetMyCompetitionEntries(
                        competitionId,
                        personId
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
                    $"Error in GetMyCompetitionEntries: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת הרשמות למקצים"
                );
            }
        }

        [HttpGet("secretary-competition")]
        public IActionResult GetSecretaryCompetitionEntries(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

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
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה לצפות בהרשמות של תחרות זו"
                    );
                }

                List<SecretaryCompetitionEntryItem> items =
                    Entry.GetSecretaryCompetitionEntries(competitionId);

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
                    $"Error in GetSecretaryCompetitionEntries: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה בשליפת הכניסות למקצים"
                );
            }
        }

        [HttpGet("competition-view")]
        public IActionResult GetCompetitionEntriesView(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin,
                    RoleNames.HostSecretary
                );

                List<SecretaryCompetitionEntryItem> items =
                    Entry.GetSecretaryCompetitionEntries(competitionId);

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCompetitionEntriesView: {ex.Message}");
                return BadRequest("שגיאה בשליפת הרשמות לתצוגה");
            }
        }

        [HttpPut("draw-order")]
        public IActionResult UpdateClassEntriesDrawOrder(
          [FromBody] UpdateClassEntriesDrawOrderRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (request.CompetitionId <= 0 ||
                    request.ClassInCompId <= 0 ||
                    request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition =
                    Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != request.RanchId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה לעדכן סדר כניסות בתחרות זו"
                    );
                }

                Entry.UpdateClassEntriesDrawOrder(request);

                return Ok(new
                {
                    Message = "Draw order updated successfully"
                });
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
                    $"Error in UpdateClassEntriesDrawOrder: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בעדכון סדר הכניסות");
            }
        }


        [HttpPut("group-draw-order")]
        public IActionResult UpdateGroupEntriesDrawOrder(
         [FromBody] UpdateGroupEntriesDrawOrderRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (request.CompetitionId <= 0 ||
                    request.RanchId <= 0 ||
                    request.OrderInDay <= 0 ||
                    request.ClassDate == default)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition =
                    Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != request.RanchId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה לעדכן סדר כניסות בתחרות זו"
                    );
                }

                Entry.UpdateGroupEntriesDrawOrder(request);

                return Ok(new
                {
                    Message = "Group draw order updated successfully"
                });
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
                    $"Error in UpdateGroupEntriesDrawOrder: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה בעדכון סדר ההגרלה");
            }
        }

        [HttpPost("group-draw-order-preview")]
        public IActionResult GenerateGroupDrawOrderPreview(
    [FromBody] GenerateGroupDrawOrderPreviewRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (request.CompetitionId <= 0 ||
                    request.RanchId <= 0 ||
                    request.OrderInDay <= 0 ||
                    request.ClassDate == default)
                {
                    return BadRequest("Invalid request");
                }

                if (request.MinimumGap <= 0)
                {
                    request.MinimumGap = 7;
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition =
                    Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != request.RanchId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה ליצור הגרלה לתחרות זו"
                    );
                }

                GroupDrawOrderPreviewResponse response =
                    Entry.GenerateGroupDrawOrderPreview(request);

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
                    $"Error in GenerateGroupDrawOrderPreview: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה ביצירת תצוגת הגרלה");
            }
        }

        [HttpPut("group-draw-order/clear")]
        public IActionResult ClearGroupEntriesDrawOrder(
    [FromBody] ClearGroupEntriesDrawOrderRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (request.CompetitionId <= 0 ||
                    request.RanchId <= 0 ||
                    request.OrderInDay <= 0 ||
                    request.ClassDate == default)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                Competition? competition =
                    Competition.GetCompetitionById(request.CompetitionId);

                if (competition == null)
                {
                    return NotFound("Competition not found");
                }

                if (competition.HostRanchId != request.RanchId)
                {
                    return StatusCode(
                        StatusCodes.Status403Forbidden,
                        "אין לך הרשאה למחוק הגרלה בתחרות זו"
                    );
                }

                Entry.ClearGroupEntriesDrawOrder(request);

                return Ok(new
                {
                    Message = "Group draw order cleared successfully"
                });
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
                    $"Error in ClearGroupEntriesDrawOrder: {ex.Message}"
                );

                return BadRequest("אירעה שגיאה במחיקת ההגרלה");
            }
        }

        [HttpGet("my-past-competitions")]
        public IActionResult GetMyPastCompetitionsWithEntries(
            [FromQuery] int excludeCompetitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (excludeCompetitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                List<PastCompetitionWithEntriesItem> items =
                    Entry.GetMyPastCompetitionsWithEntries(personId, excludeCompetitionId);

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMyPastCompetitionsWithEntries: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת תחרויות קודמות");
            }
        }

        [HttpGet("duplicatable-from-competition")]
        public IActionResult GetDuplicatableEntriesFromCompetition(
            [FromQuery] int sourceCompetitionId,
            [FromQuery] int targetCompetitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (sourceCompetitionId <= 0 ||
                    targetCompetitionId <= 0 ||
                    ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                List<DuplicatableEntryItem> items =
                    Entry.GetDuplicatableEntriesFromCompetition(
                        sourceCompetitionId,
                        targetCompetitionId,
                        personId
                    );

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetDuplicatableEntriesFromCompetition: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת הרשמות לשכפול");
            }
        }

        [HttpPost("bulk-duplicate")]
        public IActionResult BulkDuplicateEntries(
            [FromBody] BulkDuplicateEntriesRequest request)
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
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                request.OrderedBySystemUserId = personId;

                BulkDuplicateEntriesResponse response =
                    Entry.BulkDuplicateEntries(request);

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in BulkDuplicateEntries: {ex.Message}");
                return BadRequest("אירעה שגיאה בשכפול הרשמות");
            }
        }

        [HttpDelete("secretary/{entryId}")]
        public IActionResult SecretaryDeleteEntry(
            int entryId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (entryId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                int changeRequestId = Entry.SecretaryDeleteEntry(entryId, personId);

                return Ok(new { ChangeRequestId = changeRequestId, Message = "Entry cancelled" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                // Business-rule/authorization guard raised inside
                // usp_secretarydeleteentry, already translated to Hebrew by
                // EntryDAL.TranslateSecretaryDeleteEntryError.
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SecretaryDeleteEntry: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול ההרשמה");
            }
        }

    }
}