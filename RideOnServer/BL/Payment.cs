namespace RideOnServer.BL
{
    public class Payment
    {
        public int PaymentId { get; set; }

        public int BillId { get; set; }

        public int PaymentMethodId { get; set; }

        public decimal PaymentAmount { get; set; }

        public DateTime PaymentDate { get; set; }

        public string? Notes { get; set; }
    }
}