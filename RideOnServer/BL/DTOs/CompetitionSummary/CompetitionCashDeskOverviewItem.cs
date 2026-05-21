namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionCashDeskOverviewItem
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public decimal ExpectedCashAmount { get; set; }

        public decimal TransferredToSafeAmount { get; set; }

        public decimal CurrentCashInDeskAmount { get; set; }

        public int? LastCountId { get; set; }

        public DateTime? LastCountedAt { get; set; }

        public string? LastCountedByName { get; set; }

        public decimal LastCountedAmount { get; set; }

        public decimal LastDifferenceAmount { get; set; }

        public string LastCountLinesJson { get; set; } = "[]";

        public DateTime? LastSafeTransferAt { get; set; }

        public bool IsCountRequired { get; set; }
    }
}