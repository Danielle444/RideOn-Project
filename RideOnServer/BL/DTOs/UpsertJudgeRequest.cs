namespace RideOnServer.BL.DTOs
{
    public class UpsertJudgeRequest
    {
        public int JudgeId { get; set; }
        public string FirstNameHebrew { get; set; } = string.Empty;
        public string LastNameHebrew { get; set; } = string.Empty;
        public string FirstNameEnglish { get; set; } = string.Empty;
        public string LastNameEnglish { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string FieldIdsCsv { get; set; } = string.Empty;
    }
}