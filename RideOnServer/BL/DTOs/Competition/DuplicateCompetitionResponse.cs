namespace RideOnServer.BL.DTOs.Competition
{
    public class DuplicateCompetitionResponse
    {
        public int NewCompetitionId { get; set; }
        public int CopiedClassesCount { get; set; }
        public int CopiedClassPrizesCount { get; set; }
        public int CopiedReiningPatternsCount { get; set; }
        public int CopiedClassJudgesCount { get; set; }
        public int CopiedPaidTimeSlotsCount { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}