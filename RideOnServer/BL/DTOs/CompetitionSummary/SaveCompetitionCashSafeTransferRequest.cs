namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class SaveCompetitionCashSafeTransferRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public int TransferredBySystemUserId { get; set; }

        public decimal Amount { get; set; }

        public string? Notes { get; set; }
    }
}