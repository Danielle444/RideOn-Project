namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class CreateCompetitionPaymentResponse
    {
        public int PaymentBatchId { get; set; }

        public string Message { get; set; } = string.Empty;
    }
}