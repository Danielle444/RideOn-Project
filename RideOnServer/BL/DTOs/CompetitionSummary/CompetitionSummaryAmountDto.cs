namespace RideOnServer.BL.DTOs.CompetitionSummary
{
    public class CompetitionSummaryAmountDto
    {
        public decimal ExpectedAmount { get; set; }

        public decimal PaidAmount { get; set; }

        public decimal UnpaidAmount { get; set; }
    }
}