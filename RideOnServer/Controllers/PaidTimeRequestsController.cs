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

                EnsureCanCreatePaidTimeRequest(personId, request);

                request.OrderedBySystemUserId = personId;

                int newId = PaidTimeRequest.CreatePaidTimeRequest(request);

                return Ok(newId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreatePaidTimeRequest: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת בקשת פייד־טיים");
            }
        }

        // HostSecretary Paid-Time creation (Slice B, 2026-08-07): OR-combined
        // authorization, same shape as ShavingsOrdersController's
        // EnsureCanAccessCompetitionRanchShavings.
        //   1. Own-ranch access -- cheapest, covers the existing mobile
        //      RanchAdmin self-service path completely unchanged: for a
        //      valid RanchAdmin caller this returns immediately, with zero
        //      extra DB calls and zero behavior change (including its
        //      existing error path for a bad RequestedCompSlotId, which
        //      still reaches proc 120 unmodified in that case).
        //   2. Host-ranch access -- HostSecretary of the competition's own
        //      host ranch, derived server-side from the requested slot,
        //      never trusted from the request. Lets a HostSecretary create
        //      a request on behalf of a guest ranch's horse/rider/coach/
        //      payer. usp_InsertPaidTimeRequest (120) already validates
        //      horse.ranchid = request.RanchId and pricecatalog.ranchid =
        //      competition.hostranchid server-side -- unchanged, reused as-is.
        private void EnsureCanCreatePaidTimeRequest(int personId, CreatePaidTimeRequestRequest request)
        {
            if (UserAccessValidator.HasUserRoleInRanch(personId, request.RanchId, RoleNames.RanchAdmin))
            {
                return;
            }

            PaidTimeSlotInCompetition? slot = PaidTimeSlotInCompetition.GetById(request.RequestedCompSlotId);

            if (slot != null)
            {
                Competition? competition = Competition.GetCompetitionById(slot.CompetitionId);

                if (competition != null &&
                    UserAccessValidator.HasUserRoleInRanch(personId, competition.HostRanchId, RoleNames.HostSecretary))
                {
                    return;
                }
            }

            throw new UnauthorizedAccessException("אין לך הרשאה ליצור בקשת פייד-טיים עבור החווה שנבחרה");
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
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in AssignPaidTimeRequest: {ex.Message}");
                return BadRequest(ResolveAssignErrorMessage(ex.Message));
            }
        }

        // ================= controlled error messages =================
        //
        // Both assign and unassign echo a *closed set* of Hebrew business messages
        // back to the secretary and collapse everything else to a generic message.
        // The raw text stays in the Console.WriteLine of each catch block.
        //
        // A controlled message reaches the controller wrapped twice:
        //   1. Npgsql 8 builds PostgresException.Message as "{SqlState}: {MessageText}",
        //      and plpgsql's `raise exception` always uses SQLSTATE P0001;
        //   2. the DAL re-wraps every NpgsqlException as "Database error: {ex.Message}".
        // So the live shape is "Database error: P0001: <message>". Normalization
        // peels those two layers - at most one each, never in a loop - and the
        // result is only ever a *candidate*: it still has to pass an exact
        // allowlist (or the one anchored dynamic pattern) before it is returned.
        private const string DatabaseErrorPrefix = "Database error: ";

        // Exactly five ASCII letters/digits followed by ": ", anchored at the start.
        // Matches a real SQLSTATE (P0001, 42P01, 57014, 28P01...). "ERROR: " also
        // has five letters, which is harmless: peeling it can only expose more
        // technical text, never turn an unlisted message into an allowlisted one.
        private static readonly Regex SqlStatePrefix =
            new Regex("^[0-9A-Za-z]{5}: ", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private static string NormalizeDatabaseErrorMessage(string? message)
        {
            string candidate = message ?? "";

            if (candidate.StartsWith(DatabaseErrorPrefix, StringComparison.Ordinal))
            {
                candidate = candidate.Substring(DatabaseErrorPrefix.Length);
            }

            Match sqlState = SqlStatePrefix.Match(candidate);

            if (sqlState.Success)
            {
                candidate = candidate.Substring(sqlState.Length);
            }

            return candidate;
        }

        // Controlled business validation messages reachable from the assign path:
        // the two raised by public.usp_assignpaidtimerequest itself, plus the six
        // raised by public.usp_recalculatepaidtimeslotassignments, which assign
        // calls for the target slot and again for a vacated previous slot. This
        // list mirrors the deployed functions exactly.
        private static readonly HashSet<string> AssignBusinessErrorMessages =
            new HashSet<string>(StringComparer.Ordinal)
        {
            "לא ניתן לשבץ בקשה שבוטלה",
            "לא ניתן לשבץ בקשה בסלוט שפורסם",
            "השיבוץ הידני יוצר חפיפה בתוך הסלוט",
            "אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי",
            "השיבוץ הידני יוצר חפיפה בזמני המאמן",
            "השיבוץ הידני יוצר חפיפה בזמני הרוכב",
            "השיבוץ הידני יוצר חפיפה בזמני הסוס",
            "קיים יותר משיבוץ אחד באותו מיקום בסלוט"
        };

        // The one controlled assign message that carries data: the occupied entry
        // order and the horse's barn/horse name, both interpolated by
        // usp_assignpaidtimerequest. The three literal segments below are the
        // whole template - they are used BOTH to build the anchored pattern and to
        // rebuild the returned string, so a match can never be echoed verbatim and
        // no appended DETAIL/CONTEXT text can ride along.
        private const string OccupiedOrderPrefixText = "המקום ";
        private const string OccupiedOrderMiddleText = " כבר תפוס על ידי ";
        private const string OccupiedOrderSuffixText = ". יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים";

        // \A and \z (not ^ and $): $ also matches just before a trailing newline,
        // which would let "...הקיים\n" through.
        private static readonly Regex OccupiedOrderPattern = new Regex(
            @"\A" + Regex.Escape(OccupiedOrderPrefixText) +
            @"(?<order>[0-9]{1,4})" + Regex.Escape(OccupiedOrderMiddleText) +
            @"(?<name>[^\r\n]{1,60})" + Regex.Escape(OccupiedOrderSuffixText) + @"\z",
            RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private static string BuildOccupiedOrderMessage(string order, string name)
        {
            return OccupiedOrderPrefixText + order + OccupiedOrderMiddleText + name + OccupiedOrderSuffixText;
        }

        private static string ResolveAssignErrorMessage(string message)
        {
            string candidate = NormalizeDatabaseErrorMessage(message);

            if (AssignBusinessErrorMessages.Contains(candidate))
            {
                return candidate;
            }

            Match occupied = OccupiedOrderPattern.Match(candidate);

            if (occupied.Success)
            {
                return BuildOccupiedOrderMessage(
                    occupied.Groups["order"].Value,
                    occupied.Groups["name"].Value
                );
            }

            return "אירעה שגיאה בשיבוץ בקשת פייד־טיים";
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
                return BadRequest(ResolveUnassignErrorMessage(ex.Message));
            }
        }

        // Controlled business validation messages raised by
        // public.usp_recalculatepaidtimeslotassignments, which usp_unassignpaidtimerequest
        // calls to re-sequence the slot it emptied. This list mirrors those messages
        // exactly; it is the only text the unassign endpoint echoes back to the
        // secretary, so raw Npgsql/PostgreSQL detail can never reach the client.
        private static readonly HashSet<string> UnassignBusinessErrorMessages = new HashSet<string>
        {
            "השיבוץ הידני יוצר חפיפה בתוך הסלוט",
            "אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי",
            "השיבוץ הידני יוצר חפיפה בזמני המאמן",
            "השיבוץ הידני יוצר חפיפה בזמני הרוכב",
            "השיבוץ הידני יוצר חפיפה בזמני הסוס",
            "קיים יותר משיבוץ אחד באותו מיקום בסלוט"
        };

        // Shares NormalizeDatabaseErrorMessage with the assign path. The earlier
        // version of this method stripped only the DAL's "Database error: " wrap,
        // which was not enough: a live message also carries Npgsql's SQLSTATE
        // segment ("Database error: P0001: ..."), so no controlled message ever
        // reached the exact-match check and every unassign failure collapsed to
        // the generic text. The allowlist and the fallback below are unchanged.
        private static string ResolveUnassignErrorMessage(string message)
        {
            string candidate = NormalizeDatabaseErrorMessage(message);

            if (UnassignBusinessErrorMessages.Contains(candidate))
            {
                return candidate;
            }

            return "אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים";
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

                // personId (טענת "PersonId") נמסר כמבצע-ההחלה עבור שורות-הביקורת
                // של שיבוצים שהוזזו. אינו קלט לאלגוריתם ואינו חלק מה-Fingerprint.
                AutoSchedulerSummary summary =
                    PaidTimeRequest.ApplyAutoSchedule(competitionId, request.Fingerprint, personId);

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
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
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
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
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

        [HttpGet("{id}/edit-detail")]
        public IActionResult GetPaidTimeRequestEditDetail(
            int id,
            [FromQuery] int ranchId)
        {
            try
            {
                if (id <= 0 || ranchId <= 0)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.RanchAdmin
                );

                PaidTimeRequestEditDetail? detail =
                    PaidTimeRequest.GetPaidTimeRequestEditDetail(id, ranchId);

                if (detail == null)
                {
                    return NotFound("בקשת הפייד-טיים לא נמצאה");
                }

                return Ok(detail);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPaidTimeRequestEditDetail: {ex.Message}");
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
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
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
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
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
                // Read path for the secretary's slot-registrations modal. It has no
                // controlled business vocabulary of its own - public.usp_getpaidtimeslotregistrations
                // raises only internal English text ("Paid time slot not found",
                // "Permission denied: not the host ranch secretary") - so there is
                // nothing to allowlist here and the whole catch collapses to one
                // generic message. The raw text stays in the log line above.
                Console.WriteLine($"Error in GetPaidTimeSlotRegistrations: {ex.Message}");
                return BadRequest("אירעה שגיאה בטעינת הרשמות הפייד־טיים");
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
            catch (ValidationException ex)
            {
                return StatusCode(StatusCodes.Status409Conflict, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in TransferPaidTimeRequestToSlot: {ex.Message}");

                // request is non-null here: the guard above returns rather than
                // throws, so anything reaching this catch got past it. The
                // null-conditional only keeps the fallback choice defined if that
                // ever stops being true.
                return BadRequest(
                    ResolveTransferErrorMessage(ex.Message, request?.NewSlotInCompId == null));
            }
        }

        // ================= controlled error messages: transfer =================
        //
        // The secretary's slot-registrations modal drives BOTH placement actions
        // through this one endpoint: a transfer carries a target slot, a modal
        // unassign carries NewSlotInCompId = null. The resolver therefore takes a
        // flag and picks the matching generic fallback.
        //
        // Reachable controlled text, read from the deployed functions (verified
        // with pg_get_functiondef, which matched the repo .sql exactly):
        //
        //   * public.usp_transferpaidtimerequesttoslot raises SIX messages, all
        //     English. Three are actionable for the secretary and are mapped to
        //     Hebrew below. The other three describe a stale or hand-crafted
        //     payload, not something a secretary can act on, and stay behind the
        //     generic fallback: the controller authorizes against the client-sent
        //     RanchId while the function authorizes against the competition's real
        //     host ranch, so echoing "not found" versus "permission denied" would
        //     tell a caller whether a foreign request or slot id exists.
        //
        //   * public.usp_recalculatepaidtimeslotassignments, which proc 151 calls
        //     for the target slot and again for a vacated source slot, raises the
        //     six approved Hebrew messages - those pass through verbatim - plus one
        //     internal English message ("Paid time slot not found for this ranch")
        //     which is unreachable from here, since proc 151 derives both the ranch
        //     id and the slot ids from the same competition row.
        //
        // Payment is deliberately not a factor. Neither function touches a product,
        // price, bill, charge or payment record: payment freezes billing-related
        // changes, not placement. Nothing here adds a payment-based restriction.
        //
        // Reuses NormalizeDatabaseErrorMessage with the assign and unassign paths,
        // unchanged. That helper is not the security boundary - the exact-match
        // allowlist below it is - so peeling can only ever expose more technical
        // text, never turn an unlisted message into a listed one.

        // The six messages public.usp_recalculatepaidtimeslotassignments raises.
        // These are byte-identical to UnassignBusinessErrorMessages *today*, and
        // only because both endpoints delegate their Hebrew to that one function.
        // The sets are kept separate because their provenance differs: this one is
        // defined by what proc 151's two recalc calls can raise. If proc 151 ever
        // gains validation of its own, widening it must not widen unassign too.
        private static readonly HashSet<string> TransferBusinessErrorMessages =
            new HashSet<string>(StringComparer.Ordinal)
        {
            "השיבוץ הידני יוצר חפיפה בתוך הסלוט",
            "אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי",
            "השיבוץ הידני יוצר חפיפה בזמני המאמן",
            "השיבוץ הידני יוצר חפיפה בזמני הרוכב",
            "השיבוץ הידני יוצר חפיפה בזמני הסוס",
            "קיים יותר משיבוץ אחד באותו מיקום בסלוט"
        };

        // The three proc-151 messages worth showing the secretary, mapped to stable
        // Hebrew. The keys are what the deployed function raises, verbatim; mapping
        // here rather than in the function keeps this shippable with the code and
        // leaves proc 151 untouched. Business meanings:
        //   * cancelled request  - the payer or ranch admin cancelled while the
        //                          modal was open; the row on screen is stale.
        //   * target slot        - the chosen slot was deleted after the dropdown
        //                          was built from the already-loaded slots.
        //   * published slot     - the target slot's schedule is already published
        //                          to payers; moving a rider in would silently
        //                          change a published schedule.
        private static readonly Dictionary<string, string> TransferBusinessErrorTranslations =
            new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["Cannot transfer a cancelled request"] = "לא ניתן להעביר בקשה שבוטלה",
            ["Target slot not found"] = "סלוט היעד לא נמצא. יש לרענן את המסך ולנסות שוב",
            ["Cannot transfer into a published slot"] = "לא ניתן להעביר בקשה לסלוט שפורסם"
        };

        private const string TransferGenericMessage =
            "אירעה שגיאה בהעברת בקשת פייד־טיים";

        // Matches the /unassign endpoint's generic text on purpose: to the
        // secretary both are the same action ("clear this placement"), even though
        // they reach different endpoints and different functions.
        private const string ModalUnassignGenericMessage =
            "אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים";

        private static string ResolveTransferErrorMessage(string message, bool isUnassign)
        {
            string candidate = NormalizeDatabaseErrorMessage(message);

            if (TransferBusinessErrorMessages.Contains(candidate))
            {
                return candidate;
            }

            if (TransferBusinessErrorTranslations.TryGetValue(candidate, out string? translated))
            {
                return translated;
            }

            return isUnassign ? ModalUnassignGenericMessage : TransferGenericMessage;
        }
    }
}