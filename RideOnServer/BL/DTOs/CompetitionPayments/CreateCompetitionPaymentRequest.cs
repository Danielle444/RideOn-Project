namespace RideOnServer.BL.DTOs.CompetitionPayments
{
    public class CreateCompetitionPaymentRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public int PayerPersonId { get; set; }

        public int EnteredBySystemUserId { get; set; }

        public string InvoiceNumber { get; set; } = string.Empty;

        public List<CreateCompetitionPaymentChargeItem> SelectedCharges { get; set; } =
            new List<CreateCompetitionPaymentChargeItem>();

        public List<CreateCompetitionPaymentMethodItem> PaymentMethods { get; set; } =
            new List<CreateCompetitionPaymentMethodItem>();

        public string? Notes { get; set; }
    }
}