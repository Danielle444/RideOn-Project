using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PaidTimeRequestsController : ControllerBase
    {
        [HttpPost]
        public IActionResult CreatePaidTimeRequest([FromBody] CreatePaidTimeRequestRequest request)
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

                int newId = PaidTimeRequest.CreatePaidTimeRequest(request);

                return Ok(newId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreatePaidTimeRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת בקשת פייד־טיים");
            }
        }

        [HttpGet("assignment")]
        public IActionResult GetPaidTimeRequestsForAssignment(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromQuery] int[] selectedCompSlotIds,
            [FromQuery] bool includeAllPending = false)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                if (selectedCompSlotIds == null || selectedCompSlotIds.Length == 0)
                {
                    return BadRequest("At least one selected slot is required");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                List<PaidTimeAssignmentItemResponse> requests =
                    PaidTimeRequest.GetPaidTimeRequestsForAssignment(
                        competitionId,
                        selectedCompSlotIds,
                        includeAllPending
                    );

                return Ok(requests);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPaidTimeRequestsForAssignment: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת בקשות פייד־טיים לשיבוץ");
            }
        }

        [HttpPost("assign")]
        public IActionResult AssignPaidTimeRequest([FromBody] AssignPaidTimeRequestRequest request)
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
                    RoleNames.HostSecretary
                );

                PaidTimeRequest.AssignPaidTimeRequest(request);

                return Ok("Paid time request assigned successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AssignPaidTimeRequest: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("unassign")]
        public IActionResult UnassignPaidTimeRequest([FromBody] UnassignPaidTimeRequestRequest request)
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
                    RoleNames.HostSecretary
                );

                PaidTimeRequest.UnassignPaidTimeRequest(request);

                return Ok("Paid time request unassigned successfully");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UnassignPaidTimeRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים");
            }
        }

        [HttpPost("auto-schedule")]
        public IActionResult RunAutoScheduler([FromQuery] int competitionId, [FromQuery] int ranchId)
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

                // כובלים את התחרות לחווה של המשתמש לפני קריאת/החלת נתוני-שיבוץ.
                Competition? competition = Competition.GetCompetitionById(competitionId);
                if (competition == null)
                {
                    return NotFound("Competition not found");
                }
                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לפעולה זו עבור תחרות זו");
                }

                AutoSchedulerSummary summary = PaidTimeRequest.RunAutoScheduler(competitionId);

                return Ok(summary);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in RunAutoScheduler: {ex.Message}");
                return BadRequest("אירעה שגיאה בהרצת השיבוץ האוטומטי");
            }
        }

        [HttpPost("auto-schedule/preview")]
        public IActionResult PreviewAutoScheduler([FromQuery] int competitionId, [FromQuery] int ranchId)
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

                // כובלים את התחרות לחווה של המשתמש לפני קריאת נתוני-שיבוץ (read-only).
                Competition? competition = Competition.GetCompetitionById(competitionId);
                if (competition == null)
                {
                    return NotFound("Competition not found");
                }
                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לפעולה זו עבור תחרות זו");
                }

                AutoSchedulePreviewResponse preview = PaidTimeRequest.PreviewAutoSchedule(competitionId);

                return Ok(preview);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in PreviewAutoScheduler: {ex.Message}");
                return BadRequest("אירעה שגיאה בהפקת תצוגה מקדימה של השיבוץ האוטומטי");
            }
        }

        // מבנה SHA-256 hex: 64 תווים הקסדצימליים בדיוק. ה-Fingerprint שהשרת מפיק הוא
        // תמיד בצורה זו; קלט שאינו כזה מעולם לא הגיע מ-Preview => שגיאת-קלט (400), לא 409.
        private static readonly Regex FingerprintShape =
            new Regex("^[0-9a-fA-F]{64}$", RegexOptions.Compiled);

        // החלת (Apply) התצוגה המקדימה - שלב D1. הלקוח שולח *רק* Fingerprint בגוף הבקשה.
        // השרת מאמת אותו מול snapshot טרי, מחשב מחדש את ההצעה, ומחיל רק את ההחלטות שהוא
        // עצמו ייצר. Fingerprint לא-תואם => 409 Conflict עם קוד יציב וקריא-מכונה.
        [HttpPost("auto-schedule/apply")]
        public IActionResult ApplyAutoScheduler(
            [FromQuery] int competitionId,
            [FromQuery] int ranchId,
            [FromBody] ApplyAutoScheduleRequest request)
        {
            try
            {
                if (competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                if (request == null || string.IsNullOrWhiteSpace(request.Fingerprint))
                {
                    return BadRequest("Fingerprint is required");
                }

                if (!FingerprintShape.IsMatch(request.Fingerprint.Trim()))
                {
                    return BadRequest("Invalid fingerprint");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                // כובלים את התחרות לחווה של המשתמש לפני החלת נתוני-שיבוץ.
                Competition? competition = Competition.GetCompetitionById(competitionId);
                if (competition == null)
                {
                    return NotFound("Competition not found");
                }
                if (competition.HostRanchId != ranchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לפעולה זו עבור תחרות זו");
                }

                AutoSchedulerSummary summary =
                    PaidTimeRequest.ApplyAutoSchedule(competitionId, request.Fingerprint);

                return Ok(summary);
            }
            catch (StalePreviewException ex)
            {
                // תצוגה מקדימה מיושנת: לא בוצעה שום כתיבה. אין חישוב-מחדש אוטומטי -
                // ה-UI העתידי ידרוש "חשב מחדש". מוחזר קוד יציב לצד ההודעה.
                return Conflict(new { code = StalePreviewException.Code, message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApplyAutoScheduler: {ex.Message}");
                return BadRequest("אירעה שגיאה בהחלת השיבוץ האוטומטי");
            }
        }

        [HttpPost("bulk")]
        public IActionResult BulkCreatePaidTimeRequests([FromBody] BulkCreatePaidTimeRequestsRequest request)
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

                // כובלים את התחרות לחווה של המשתמש לפני יצירה וקריאת/החלת נתוני-שיבוץ.
                Competition? competition = Competition.GetCompetitionById(request.CompetitionId);
                if (competition == null)
                {
                    return NotFound("Competition not found");
                }
                if (competition.HostRanchId != request.RanchId)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לפעולה זו עבור תחרות זו");
                }

                request.OrderedBySystemUserId = personId;

                BulkCreatePaidTimeRequestsResponse response = PaidTimeRequest.BulkCreate(request, personId);

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in BulkCreatePaidTimeRequests: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת בקשות פייד־טיים מרובות");
            }
        }

        [HttpGet("my-competition")]
        public IActionResult GetMyPaidTimeRequestsForCompetition(
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

                List<MyCompetitionPaidTimeRequestItem> requests =
                    PaidTimeRequest.GetMyPaidTimeRequestsForCompetition(
                        competitionId,
                        personId
                    );

                return Ok(requests);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMyPaidTimeRequestsForCompetition: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("slot-schedule")]
        public IActionResult GetSlotScheduleForViewing(
            [FromQuery] int slotId,
            [FromQuery] int competitionId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (slotId <= 0 || competitionId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);
                UserAccessValidator.EnsureUserHasRoleInRanch(personId, ranchId, RoleNames.RanchAdmin);

                List<SlotScheduleItem> items =
                    PaidTimeRequest.GetSlotScheduleForViewing(slotId, competitionId, ranchId);

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetSlotScheduleForViewing: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("published-slots")]
        public IActionResult GetPublishedSlotsForCompetition(
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
                UserAccessValidator.EnsureUserHasRoleInRanch(personId, ranchId, RoleNames.RanchAdmin);

                List<PublishedSlotItem> items =
                    PaidTimeRequest.GetPublishedSlotsForCompetition(competitionId, ranchId);

                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPublishedSlotsForCompetition: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("cancel")]
        public IActionResult CancelPaidTimeRequest([FromBody] CancelPaidTimeRequestRequest request)
        {
            try
            {
                if (request == null || request.PaidTimeRequestId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                PaidTimeRequest.CancelMyPaidTimeRequest(request.PaidTimeRequestId, personId);

                return Ok("הבקשה בוטלה בהצלחה");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CancelPaidTimeRequest: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("cancel-by-payer")]
        public IActionResult CancelPaidTimeRequestByPayer(
            [FromBody] CancelPaidTimeRequestRequest request)
        {
            try
            {
                if (request == null || request.PaidTimeRequestId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.Payer
                );

                PaidTimeRequest.CancelByPayer(request.PaidTimeRequestId, personId);

                return Ok("הבקשה בוטלה בהצלחה");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CancelPaidTimeRequestByPayer: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("update-notes-by-payer")]
        public IActionResult UpdatePaidTimeNotesByPayer(
            [FromBody] UpdatePaidTimeRequestNotesRequest request)
        {
            try
            {
                if (request == null || request.PaidTimeRequestId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.Payer
                );

                PaidTimeRequest.UpdateNotesByPayer(
                    request.PaidTimeRequestId,
                    personId,
                    request.Notes
                );

                return Ok("ההערות עודכנו בהצלחה");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdatePaidTimeNotesByPayer: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("update-notes")]
        public IActionResult UpdatePaidTimeRequestNotes([FromBody] UpdatePaidTimeRequestNotesRequest request)
        {
            try
            {
                if (request == null || request.PaidTimeRequestId <= 0 || request.RanchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                PaidTimeRequest.UpdateMyPaidTimeRequest(request, personId);

                return Ok("ההערות עודכנו בהצלחה");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdatePaidTimeRequestNotes: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("slot-registrations")]
        public IActionResult GetPaidTimeSlotRegistrations(
            [FromQuery] int slotInCompId,
            [FromQuery] int ranchId)
        {
            try
            {
                if (slotInCompId <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                var items = PaidTimeRequest.GetPaidTimeSlotRegistrations(slotInCompId, personId);
                return Ok(items);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPaidTimeSlotRegistrations: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("transfer-to-slot")]
        public IActionResult TransferPaidTimeRequestToSlot(
            [FromBody] TransferPaidTimeRequestToSlotRequest request)
        {
            try
            {
                if (request == null ||
                    request.PaidTimeRequestId <= 0 ||
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

                PaidTimeRequest.TransferPaidTimeRequestToSlot(
                    request.PaidTimeRequestId,
                    request.NewSlotInCompId,
                    personId);

                return Ok(new { Message = "Slot updated" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in TransferPaidTimeRequestToSlot: {ex.Message}");
                return BadRequest(ex.Message);
            }
        }
    }
}