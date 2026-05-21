namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class SaveCompetitionCashCountRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public int CountedBySystemUserId { get; set; }

        public List<SaveCompetitionCashCountLineItem> Lines { get; set; } =
            new List<SaveCompetitionCashCountLineItem>();

        public string? Notes { get; set; }
    }
}