namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    // בקשת החלה (Apply) של תצוגה מקדימה לשיבוץ אוטומטי (שלב D1).
    //
    // הלקוח שולח אך ורק את ה-Fingerprint שקיבל מה-Preview. הוא לעולם אינו שולח
    // שיבוצים, מזהי-בקשות, מזהי-סלוט, זמני-התחלה, סדר, סטטוסים או תוכנית שלמה -
    // כל אלה מחושבים מחדש בצד-השרת מתוך snapshot טרי.
    public class ApplyAutoScheduleRequest
    {
        public string Fingerprint { get; set; } = string.Empty;
    }
}
