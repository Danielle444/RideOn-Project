namespace RideOnServer.BL
{
    // נזרקת כאשר ה-Fingerprint שנשלח ב-Apply אינו תואם לתמונת-המצב הטרייה של השרת -
    // כלומר ההצעה (Preview) שהמזכירה אישרה כבר אינה עדכנית. שונה מ-ValidationException
    // (קלט שגוי) ומ-UnauthorizedAccessException (הרשאה): זוהי התנגשות מצב, והבקר ממפה
    // אותה ל-HTTP 409 Conflict. בעת זריקתה לא בוצעה שום כתיבה.
    public class StalePreviewException : Exception
    {
        // מזהה יציב וקריא-מכונה עבור הלקוח, בלתי-תלוי בטקסט ההודעה.
        public const string Code = "STALE_PREVIEW";

        public StalePreviewException(string message) : base(message)
        {
        }
    }
}
