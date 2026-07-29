namespace RideOnServer.BL.AutoScheduler
{
    // תוצאת האימות-והחישוב-מחדש בצד-השרת עבור Apply (שלב D1, הורחב ב-V2-2):
    // בדיוק הארגומנטים שיימסרו ל-AutoSchedulerDAL.ApplyAutoScheduleV2 /
    // usp_ApplyAutoScheduleV2.
    //
    // נבנית *רק* לאחר שה-Fingerprint אומת מול snapshot טרי. אין בה שום נתון שמקורו
    // בלקוח - כל השדות נגזרים מהאלגוריתם שרץ מחדש בשרת על אותה תמונת-מצב שממנה חושב
    // ה-Fingerprint. גם זהות המבצע אינה חלק מכאן: היא נמסרת בנפרד ל-DAL ואינה
    // קלט לאלגוריתם ואינה חלק מה-Fingerprint.
    public class AutoScheduleApplyPlan
    {
        // התחרות שאליה שייכת התוכנית (נמסר לפרוצדורה לנעילה ולאימות).
        public int CompetitionId { get; set; }

        // קבוצת-הכתיבה: שיבוצים חדשים + שיבוצים קיימים שהוזזו, ורק הם.
        // מחליף את AllowedRequestIds של V2-1, שהניח שכל מועמד הוא שורת-כתיבה.
        public AutoScheduleWritePlan WritePlan { get; set; } = new AutoScheduleWritePlan();

        // מלוא ההחלטות שהאלגוריתם ייצר (Assigned/Moved/Pending) - לבניית התצוגה.
        public List<AssignmentDecision> Decisions { get; set; } = new List<AssignmentDecision>();

        // תוצאת האלגוריתם המלאה (ספירות + audit) - לבניית ה-AutoSchedulerSummary לתגובה.
        public AutoScheduleResult Result { get; set; } = new AutoScheduleResult();
    }
}
