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
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateEntry: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת הרשמה למקצה");
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

    }
}