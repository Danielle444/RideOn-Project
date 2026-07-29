using RideOnServer.BL.AutoScheduler;

namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    // תצוגה מקדימה (read-only) של אלגוריתם השיבוץ האוטומטי - שלב A.
    //
    // ה-DTO מחזיר את מזהי-הישויות מיד (סוס/מאמן/רוכב/סלוט), וכן שדות תצוגה
    // (שמות סוס/מאמן/רוכב/משלם/מגרש) שנשארים ריקים/NULL בשלב A. שלב B ימלא
    // אותם מתוך snapshot מועשר (usp_getautoschedulerdata) בלי לשנות את החוזה.
    //
    // Fingerprint = טביעת-אצבע דטרמיניסטית של קלטי-השיבוץ שבתמונת-המצב, שתשמש
    // את שלב Apply (שלב C) כדי לדחות תוכנית מיושנת. אינו כולל את שעת-השרת (now).
    public class AutoSchedulePreviewResponse
    {
        public string Fingerprint { get; set; } = string.Empty;

        // שעת הפקת התמונה (snapshot now) - לתצוגה בלבד, אינה חלק מה-Fingerprint.
        public System.DateTime GeneratedAt { get; set; }

        public int ScheduledCount { get; set; }
        public int UnscheduledCount { get; set; }
        public int FrozenCount { get; set; }

        // V2-2, תוספתי.
        public int MovedCount { get; set; }
        public int UnchangedCount { get; set; }

        public List<PreviewScheduledItem> ScheduledItems { get; set; } = new List<PreviewScheduledItem>();
        public List<PreviewUnscheduledItem> UnscheduledItems { get; set; } = new List<PreviewUnscheduledItem>();
        public List<PreviewFrozenItem> FrozenItems { get; set; } = new List<PreviewFrozenItem>();

        // V2-2, תוספתי. אינווריאנטה שאסור לשבור:
        //   ScheduledItems ∪ MovedItems == קבוצת-הכתיבה של Apply, במדויק.
        // UnchangedItems ו-FrozenItems לעולם אינם נכתבים. כך המזכירה רואה
        // *כל* שורה ש-Apply יזיז, והתצוגה אינה יכולה להסתיר תנועה.
        public List<PreviewMovedItem> MovedItems { get; set; } = new List<PreviewMovedItem>();
        public List<PreviewUnchangedItem> UnchangedItems { get; set; } = new List<PreviewUnchangedItem>();
    }

    // בקשה שהאלגוריתם מציע לשבץ (עדיין לא נכתבה - זו תצוגה מקדימה בלבד).
    public class PreviewScheduledItem
    {
        public int PaidTimeRequestId { get; set; }
        public int HorseId { get; set; }
        public int? CoachFederationMemberId { get; set; }

        public int AssignedCompSlotId { get; set; }
        public System.DateTime AssignedStartTime { get; set; }
        public int AssignedOrder { get; set; }
        public int EffectiveDurationMinutes { get; set; }

        public int RequestedCompSlotId { get; set; }
        public int? RiderFederationMemberId { get; set; }

        // V2-1, תוספתי: היכן שובצה הבקשה ביחס לסלוט המבוקש -
        // "Requested" / "PreviousSameDay" / "NextSameDay". נקבע במנוע בלבד.
        public string PlacementKind { get; set; } = PlacementKinds.Requested;

        // V2-2: תמיד "Auto" לשיבוץ חדש. נחשף כדי שהמזכירה תראה את אותו שדה
        // שהיא רואה על שורה שהוזזה, ולא תצטרך להסיק אותו.
        public string? AllocationOrigin { get; set; }

        // העשרת-תצוגה (שלב B) - ריק/NULL עד אז.
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string RiderName { get; set; } = string.Empty;
        public string? CoachName { get; set; }
        public string PayerName { get; set; } = string.Empty;
        public string AssignedArenaName { get; set; } = string.Empty;
    }

    // V2-2: שיבוץ קיים שיוזז. נושא גם את המצב הישן וגם את החדש, כדי שהמזכירה
    // תראה בדיוק מה משתנה. זוהי שורת-כתיבה - היא נמצאת בקבוצת-הכתיבה של Apply
    // ותייצר בדיוק שורת-ביקורת אחת ב-paidtimeassignmentchange.
    public class PreviewMovedItem
    {
        public int PaidTimeRequestId { get; set; }
        public int HorseId { get; set; }
        public int? CoachFederationMemberId { get; set; }
        public int? RiderFederationMemberId { get; set; }

        public int RequestedCompSlotId { get; set; }
        public int EffectiveDurationMinutes { get; set; }

        // מצב ישן.
        public int PreviousAssignedCompSlotId { get; set; }
        public System.DateTime PreviousAssignedStartTime { get; set; }
        public int PreviousAssignedOrder { get; set; }
        public string PreviousArenaName { get; set; } = string.Empty;

        // מצב חדש.
        public int AssignedCompSlotId { get; set; }
        public System.DateTime AssignedStartTime { get; set; }
        public int AssignedOrder { get; set; }
        public string AssignedArenaName { get; set; } = string.Empty;

        public string PlacementKind { get; set; } = PlacementKinds.Requested;

        // נשמר במדויק מהערך הקודם, כולל NULL. לעולם אינו נדרס ל-'Auto'.
        public string? AllocationOrigin { get; set; }

        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string RiderName { get; set; } = string.Empty;
        public string? CoachName { get; set; }
        public string PayerName { get; set; } = string.Empty;
    }

    // V2-2: שיבוץ קיים שניתן היה להזיז, ונשאר במקומו במכוון. אינו נכתב, אינו
    // נמחק ואינו נרשם בביקורת - מוצג כדי שהמזכירה תראה שהוא נשקל ולא נשכח.
    public class PreviewUnchangedItem
    {
        public int PaidTimeRequestId { get; set; }
        public int HorseId { get; set; }
        public int? CoachFederationMemberId { get; set; }

        public int AssignedCompSlotId { get; set; }
        public System.DateTime? AssignedStartTime { get; set; }
        public int? AssignedOrder { get; set; }
        public string? AllocationOrigin { get; set; }

        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string AssignedArenaName { get; set; } = string.Empty;
    }

    // בקשה שהאלגוריתם לא הצליח לשבץ, עם הסיבה הקריאה (Hebrew) וקוד-סיבה מובנה.
    public class PreviewUnscheduledItem
    {
        public int PaidTimeRequestId { get; set; }
        public int HorseId { get; set; }
        public int? CoachFederationMemberId { get; set; }

        public int RequestedCompSlotId { get; set; }

        public string Reason { get; set; } = string.Empty;
        public string ReasonCode { get; set; } = "Unknown";

        // V2-1, תוספתי: האם נבדקו בפועל סלוטים סמוכים באותו יום לפני הוויתור.
        // אינו משנה את Reason/ReasonCode - אלה נותרים מעוגנים בסלוט המבוקש.
        public bool AdjacentSlotsTried { get; set; }

        // V2-2, תוספתי (באותה צורה בדיוק כמו AdjacentSlotsTried): אותות מובנים
        // שאינם משנים את Reason/ReasonCode. Reason נשאר מעוגן בסלוט המבוקש -
        // זו עדיין הסיבה הנכונה והשימושית למזכירה. עצירת-תקציב מדווחת *בנוסף*,
        // ולעולם לא במקום סיבת קיבולת/מאמן/רוכב/סוס.
        public bool MovementAttempted { get; set; }
        public bool MovementSearchExhausted { get; set; }

        // העשרת-תצוגה (שלב B) - ריק/NULL עד אז.
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string RiderName { get; set; } = string.Empty;
        public string? CoachName { get; set; }
    }

    // שיבוץ קיים שנשמר במקומו (frozen) - לא נגעו בו. מובחן מהצעה חדשה בכך
    // שהוא נמצא ברשימת FrozenItems ולא ב-ScheduledItems.
    //
    // V2-2: "קפוא" פירושו כעת *אינו ניתן להזזה כלל*, להבדיל מ-UnchangedItems
    // (ניתן היה להזיז, ולא נדרש). FrozenReason מסביר איזה מהשניים.
    public class PreviewFrozenItem
    {
        public int PaidTimeRequestId { get; set; }
        public int HorseId { get; set; }
        public int? CoachFederationMemberId { get; set; }

        public int AssignedCompSlotId { get; set; }
        public System.DateTime? AssignedStartTime { get; set; }
        public int? AssignedOrder { get; set; }

        // V2-2, תוספתי: FrozenReasons (PublishedSlot / OutOfScopePlacement /
        // NoStartTime). NULL במסלול ה-bulk, שבו אין סיווג ניידות.
        public string? FrozenReason { get; set; }

        // נוחות-תצוגה: נגזר מ-FrozenReason, כדי שה-UI לא ישווה מחרוזות בעצמו.
        public bool IsPublishedSlot { get; set; }

        public string? AllocationOrigin { get; set; }

        // העשרת-תצוגה (שלב B) - ריק/NULL עד אז.
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string AssignedArenaName { get; set; } = string.Empty;
    }
}
