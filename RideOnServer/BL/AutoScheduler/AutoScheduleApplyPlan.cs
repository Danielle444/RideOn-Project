namespace RideOnServer.BL.AutoScheduler
{
    // תוצאת האימות-והחישוב-מחדש בצד-השרת עבור Apply (שלב D1): בדיוק הארגומנטים
    // שיימסרו ל-AutoSchedulerDAL.ApplyAutoSchedule / usp_applyautoschedule.
    //
    // נבנית *רק* לאחר שה-Fingerprint אומת מול snapshot טרי. אין בה שום נתון שמקורו
    // בלקוח - כל השדות נגזרים מהאלגוריתם שרץ מחדש בשרת על אותה תמונת-מצב שממנה חושב
    // ה-Fingerprint.
    public class AutoScheduleApplyPlan
    {
        // התחרות שאליה שייכת התוכנית (נמסר ל-usp_applyautoschedule לנעילה ולאימות).
        public int CompetitionId { get; set; }

        // קבוצת המזהים המורשים לשיבוץ = המועמדים הידניים (Pending ולא-משובצים) בתמונת-המצב.
        public int[] AllowedRequestIds { get; set; } = System.Array.Empty<int>();

        // מלוא ההחלטות שהאלגוריתם ייצר (Assigned/Pending) - נמסרות כמכלול שלם ל-DAL.
        public List<AssignmentDecision> Decisions { get; set; } = new List<AssignmentDecision>();

        // תוצאת האלגוריתם המלאה (ספירות + audit) - לבניית ה-AutoSchedulerSummary לתגובה.
        public AutoScheduleResult Result { get; set; } = new AutoScheduleResult();
    }
}
