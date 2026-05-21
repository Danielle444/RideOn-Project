namespace RideOnServer.BL.DTOs.ChangeTracking
{
    public class AnswerChangeRequestRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public int RequestId { get; set; }

        public string RequestSource { get; set; } = string.Empty;

        public string AnswerStatus { get; set; } = string.Empty;

        public int AnsweredBySystemUserId { get; set; }

        public string? Notes { get; set; }
    }
}