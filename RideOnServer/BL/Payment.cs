namespace RideOnServer.BL
{
    public class Payment
    {
        public int PaymentId { get; set; }

        public int BillId { get; set; }

        public int PaymentMethodId { get; set; }

        public decimal AmountPaid { get; set; }  

        public DateTime PaymentDate { get; set; }

        public string? TransactionReference { get; set; }  

        public int? EnteredBySystemUserId { get; set; }  
    }
}