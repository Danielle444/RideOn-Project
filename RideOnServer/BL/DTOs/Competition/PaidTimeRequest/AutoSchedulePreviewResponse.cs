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

        public List<PreviewScheduledItem> ScheduledItems { get; set; } = new List<PreviewScheduledItem>();
        public List<PreviewUnscheduledItem> UnscheduledItems { get; set; } = new List<PreviewUnscheduledItem>();
        public List<PreviewFrozenItem> FrozenItems { get; set; } = new List<PreviewFrozenItem>();
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

        // העשרת-תצוגה (שלב B) - ריק/NULL עד אז.
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string RiderName { get; set; } = string.Empty;
        public string? CoachName { get; set; }
        public string PayerName { get; set; } = string.Empty;
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

        // העשרת-תצוגה (שלב B) - ריק/NULL עד אז.
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string RiderName { get; set; } = string.Empty;
        public string? CoachName { get; set; }
    }

    // שיבוץ קיים שנשמר במקומו (frozen) - לא נגעו בו. מובחן מהצעה חדשה בכך
    // שהוא נמצא ברשימת FrozenItems ולא ב-ScheduledItems.
    public class PreviewFrozenItem
    {
        public int PaidTimeRequestId { get; set; }
        public int HorseId { get; set; }
        public int? CoachFederationMemberId { get; set; }

        public int AssignedCompSlotId { get; set; }
        public System.DateTime? AssignedStartTime { get; set; }
        public int? AssignedOrder { get; set; }

        // העשרת-תצוגה (שלב B) - ריק/NULL עד אז.
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string AssignedArenaName { get; set; } = string.Empty;
    }
}
