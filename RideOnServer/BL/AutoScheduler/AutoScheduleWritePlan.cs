namespace RideOnServer.BL.AutoScheduler
{
    // קבוצת-הכתיבה של Apply (V2-2): *אך ורק* השורות שמצבן ב-DB ישתנה.
    //
    // חברוּת בקבוצה:
    //   NewAssignment - בקשה Pending שתשובץ.
    //   Moved         - שיבוץ קיים לא-מפורסם שהסלוט/השעה/הסדר שלו משתנים.
    //
    // מחוץ לקבוצה במפורש: שורות ללא שינוי, שורות קפואות ובקשות שלא שובצו.
    // הן אינן ננקות, אינן מתעדכנות ואינן נרשמות בביקורת - אך הן עדיין מגבילות
    // את התוצאה, כי אימות-המצב-הסופי בפרוצדורה רץ על *כל* שורות ה-Assigned
    // של התחרות ולא רק על חברי התוכנית.
    public class AutoScheduleWritePlan
    {
        // מספר הפריטים שהמנוע הכריז עליהם. הפרוצדורה משווה אותו לאורך המערך
        // בפועל, וכך קטיעה של המטען בדרך נתפסת - זהו כשל שה-Fingerprint,
        // שמחושב לפני הסריאליזציה, אינו יכול לראות.
        public int ExpectedWriteSetCount { get; set; }

        public List<AutoScheduleWritePlanItem> Items { get; set; } = new List<AutoScheduleWritePlanItem>();
    }

    public class AutoScheduleWritePlanItem
    {
        public int PaidTimeRequestId { get; set; }

        // NewAssignment | Moved
        public string ChangeKind { get; set; } = ChangeKinds.NewAssignment;

        // ===== מצב-ישן צפוי =====
        // נבדק בפרוצדורה שורה-שורה לפני כל שינוי, ומחליף את השומר הישן
        // ("status='Pending' AND assignedcompslotid IS NULL") בשומר שיודע לתאר
        // גם שיבוץ קיים. אי-התאמה => תוכנית מיושנת => rollback מלא.
        public string ExpectedStatus { get; set; } = "Pending";
        public int? ExpectedAssignedCompSlotId { get; set; }
        public DateTime? ExpectedAssignedStartTime { get; set; }
        public int? ExpectedAssignedOrder { get; set; }
        public string? ExpectedAllocationOrigin { get; set; }

        // ===== מצב סופי =====
        public int NewAssignedCompSlotId { get; set; }
        public DateTime NewAssignedStartTime { get; set; }
        public int NewAssignedOrder { get; set; }
        public string NewStatus { get; set; } = "Assigned";

        // 'Auto' בשיבוץ חדש; הערך הקודם *כמות-שהוא* (כולל NULL) בהזזה.
        public string? NewAllocationOrigin { get; set; }
    }
}
