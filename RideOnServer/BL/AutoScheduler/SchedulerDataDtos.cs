using System.Text.Json;
using System.Text.Json.Serialization;

namespace RideOnServer.BL.AutoScheduler
{
    // מודל הנתונים שמתקבל מ-usp_GetAutoSchedulerData (snapshot עקבי).
    public class SchedulerData
    {
        [JsonPropertyName("competitionId")]
        public int CompetitionId { get; set; }

        [JsonPropertyName("now")]
        public DateTime Now { get; set; }

        [JsonPropertyName("slots")]
        public List<SchedulerSlot> Slots { get; set; } = new();

        [JsonPropertyName("requests")]
        public List<SchedulerRequest> Requests { get; set; } = new();

        [JsonPropertyName("batches")]
        public List<SchedulerBatch> Batches { get; set; } = new();
    }

    public class SchedulerSlot
    {
        [JsonPropertyName("paidTimeSlotInCompId")]
        public int PaidTimeSlotInCompId { get; set; }

        [JsonPropertyName("slotDate")]
        public DateTime SlotDate { get; set; }

        [JsonPropertyName("startTime")]
        public string StartTimeRaw { get; set; } = "00:00:00";

        [JsonPropertyName("endTime")]
        public string EndTimeRaw { get; set; } = "00:00:00";

        [JsonIgnore]
        public TimeSpan StartTime => TimeSpan.Parse(StartTimeRaw);

        [JsonIgnore]
        public TimeSpan EndTime => TimeSpan.Parse(EndTimeRaw);

        [JsonPropertyName("totalCapacityMinutes")]
        public int TotalCapacityMinutes { get; set; }

        [JsonPropertyName("arenaRanchId")]
        public int ArenaRanchId { get; set; }

        [JsonPropertyName("arenaId")]
        public int ArenaId { get; set; }

        [JsonPropertyName("arenaName")]
        public string ArenaName { get; set; } = string.Empty;

        [JsonPropertyName("isPublished")]
        public bool IsPublished { get; set; }

        [JsonPropertyName("slotStatus")]
        public string? SlotStatus { get; set; }

        public string ArenaKey => ArenaRanchId + "-" + ArenaId;
    }

    public class SchedulerRequest
    {
        [JsonPropertyName("paidTimeRequestId")]
        public int PaidTimeRequestId { get; set; }

        [JsonPropertyName("horseId")]
        public int HorseId { get; set; }

        [JsonPropertyName("coachFederationMemberId")]
        public int CoachFederationMemberId { get; set; }

        [JsonPropertyName("riderFederationMemberId")]
        public int RiderFederationMemberId { get; set; }

        [JsonPropertyName("priceCatalogId")]
        public int PriceCatalogId { get; set; }

        [JsonPropertyName("productId")]
        public int ProductId { get; set; }

        [JsonPropertyName("durationMinutes")]
        public int DurationMinutes { get; set; }   // effective (with +1 transition)

        [JsonPropertyName("requestedCompSlotId")]
        public int RequestedCompSlotId { get; set; }

        [JsonPropertyName("assignedCompSlotId")]
        public int? AssignedCompSlotId { get; set; }

        [JsonPropertyName("assignedStartTime")]
        public DateTime? AssignedStartTime { get; set; }

        [JsonPropertyName("assignedOrder")]
        public int? AssignedOrder { get; set; }

        // V2-2: מקור-השיבוץ ('Auto' / 'Manual' / NULL). כבר נפלט מ-usp_getautoschedulerdata
        // ורק לא נקלט ב-DTO עד כה. משמש *אך ורק* לשימור-ערך בעת הזזה - אינו משפיע על
        // סיווג הניידות ואינו קלט לאלגוריתם. NULL הוא ערך תקין ונפוץ (69 שורות Assigned
        // בנתונים החיים), ולכן "שימור" פירושו גם NULL -> NULL.
        [JsonPropertyName("allocationOrigin")]
        public string? AllocationOrigin { get; set; }

        [JsonPropertyName("status")]
        public string Status { get; set; } = "Pending";

        [JsonPropertyName("srequestdatetime")]
        public DateTime SrequestDateTime { get; set; }

        [JsonPropertyName("batchId")]
        public int? BatchId { get; set; }

        [JsonPropertyName("notes")]
        public string? Notes { get; set; }

        // העשרת-תצוגה (שלב B): שמות קריאים-אנושית מ-usp_GetAutoSchedulerData.
        // אופציונליים (nullable) - עשויים להיות NULL כשנתון-התצוגה חסר. אינם
        // משמשים את אלגוריתם השיבוץ ואינם נכללים ב-Fingerprint.
        [JsonPropertyName("horseName")]
        public string? HorseName { get; set; }

        [JsonPropertyName("barnName")]
        public string? BarnName { get; set; }

        [JsonPropertyName("riderName")]
        public string? RiderName { get; set; }

        [JsonPropertyName("coachName")]
        public string? CoachName { get; set; }

        [JsonPropertyName("payerName")]
        public string? PayerName { get; set; }
    }

    public class SchedulerBatch
    {
        [JsonPropertyName("batchId")]
        public int BatchId { get; set; }

        [JsonPropertyName("competitionId")]
        public int CompetitionId { get; set; }

        [JsonPropertyName("createdByPersonId")]
        public int CreatedByPersonId { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("payload")]
        public JsonElement Payload { get; set; }

        [JsonPropertyName("requestIds")]
        public List<int> RequestIds { get; set; } = new();
    }

    // התוצאה שהאלגוריתם מייצר ושנכתבת חזרה ל-DB.
    public class AutoScheduleResult
    {
        public int CompetitionId { get; set; }
        public DateTime ExecutedAt { get; set; }
        public int ScheduledCount { get; set; }
        public int UnscheduledCount { get; set; }

        // FrozenCount סופר שיבוצים קיימים שאינם ניתנים להזזה כלל.
        // כאשר allowMovement=false (מסלול ה-bulk, פרוצדורה 129) *כל* שורה Assigned
        // נספרת כאן - התנהגות V2-1 נשמרת ללא שינוי.
        public int FrozenCount { get; set; }

        // V2-2: שיבוצים קיימים שהוזזו בפועל (חלק מקבוצת-הכתיבה).
        public int MovedCount { get; set; }

        // V2-2: שיבוצים קיימים הניתנים להזזה שנותרו במקומם במכוון (אינם נכתבים).
        public int UnchangedCount { get; set; }

        public List<AssignmentDecision> Assignments { get; set; } = new();
        public List<AuditLogEntry> Audit { get; set; } = new();
    }

    // V2-2: סוג-השינוי של החלטה. נקבע *אך ורק* במנוע ומועבר כמות-שהוא ל-DTO
    // ולמטען ה-Apply - אין גזירה מחדש בשכבת המיפוי או ב-JavaScript.
    public static class ChangeKinds
    {
        public const string NewAssignment = "NewAssignment";
        public const string Moved = "Moved";
        public const string Unscheduled = "Unscheduled";
    }

    // V2-2: הסיבה שבגללה שיבוץ קיים אינו ניתן להזזה. מוצג למזכירה בתצוגה המקדימה.
    public static class FrozenReasons
    {
        public const string PublishedSlot = "PublishedSlot";
        public const string OutOfScopePlacement = "OutOfScopePlacement";

        // לשורה עצמה אין assignedstarttime.
        public const string NoStartTime = "NoStartTime";

        // השורה תקינה, אבל הסלוט שבו היא יושבת מכיל שורת-מדור-קודם ללא
        // assignedstarttime. מצב-התפוסה של הסלוט אינו ניתן לאימות, ולכן הסלוט
        // כולו מחוץ לתחום האוטומטי: אין נכנסים אליו, אין יוצאים ממנו ואין זזים
        // בתוכו.
        public const string UnsafeLegacySlot = "UnsafeLegacySlot";
    }

    // סוגי-מיקום אפשריים של שיבוץ אוטומטי (V2-1). נקבעים *אך ורק* במנוע
    // (AutoScheduler) ומועברים כמות-שהם ל-DTO של התצוגה המקדימה - אין גזירה
    // מחדש שלהם בשכבת המיפוי או ב-JavaScript.
    public static class PlacementKinds
    {
        public const string Requested = "Requested";
        public const string PreviousSameDay = "PreviousSameDay";
        public const string NextSameDay = "NextSameDay";
    }

    public class AssignmentDecision
    {
        public int PaidTimeRequestId { get; set; }
        public int HorseId { get; set; }
        public int CoachFederationMemberId { get; set; }
        public int? AssignedCompSlotId { get; set; }
        public DateTime? AssignedStartTime { get; set; }
        public int? AssignedOrder { get; set; }
        public string Status { get; set; } = "Pending";

        // V2-1, תוספתי בלבד. שני השדות אינם נשלחים ל-usp_applyautoschedule:
        // AutoSchedulerDAL.ApplyAutoSchedule מסרייל הטלה מפורשת של חמישה שדות
        // בלבד, ולכן מטען הפרוצדורה אינו משתנה.
        //
        // סוג-המיקום של החלטת Assigned (Requested / PreviousSameDay / NextSameDay).
        public string PlacementKind { get; set; } = PlacementKinds.Requested;

        // נכון כשבוצע ניסיון-מיקום בפועל על סלוט סמוך כלשהו (רלוונטי ל-Pending).
        public bool AdjacentSlotsTried { get; set; }

        // ===== V2-2, תוספתי בלבד =====
        //
        // סוג-השינוי (NewAssignment / Moved / Unscheduled). קובע את חברות השורה
        // בקבוצת-הכתיבה: רק NewAssignment ו-Moved נשלחים ל-usp_ApplyAutoScheduleV2.
        public string ChangeKind { get; set; } = ChangeKinds.Unscheduled;

        // מצב-הישן הצפוי של שיבוץ קיים שהוזז. NULL בשיבוץ חדש. נמסר ל-SP כשומר
        // מפני תוכנית מיושנת ברמת-השורה (מחליף את הבדיקה 'Pending ולא-משובץ').
        public int? PreviousAssignedCompSlotId { get; set; }
        public DateTime? PreviousAssignedStartTime { get; set; }
        public int? PreviousAssignedOrder { get; set; }
        public string? PreviousAllocationOrigin { get; set; }

        // מקור-השיבוץ הסופי: 'Auto' לשיבוץ חדש, והערך הקודם *כמות-שהוא* (כולל NULL)
        // לשיבוץ קיים שהוזז. אין מחיקת עדות לכך שהשיבוץ נעשה ידנית.
        public string? AllocationOrigin { get; set; }

        // נכון כשהופעל חיפוש-הזזה עבור הבקשה (רלוונטי ל-Pending).
        public bool MovementAttempted { get; set; }

        // נכון כשחיפוש-ההזזה נעצר במגבלת עומק/תקציב ולא מפני שלא קיים פתרון.
        // *תוספתי בלבד* - אינו מחליף את Reason/ReasonCode של הסלוט המבוקש.
        public bool MovementSearchExhausted { get; set; }
    }

    public class AuditLogEntry
    {
        public int PaidTimeRequestId { get; set; }
        // scheduled | unscheduled | kept-frozen | kept-unchanged | moved
        public string Action { get; set; } = string.Empty;
        public string? Reason { get; set; }
        public int? PreviousSlotId { get; set; }
        public int? NewSlotId { get; set; }
        public DateTime? NewStartTime { get; set; }

        // V2-2: קוד-סיבה מובנה לשורה קפואה (FrozenReasons). NULL בכל פעולה אחרת,
        // וגם בשורות קפואות במסלול ה-bulk שבו אין סיווג ניידות.
        public string? FrozenReason { get; set; }
    }
}
