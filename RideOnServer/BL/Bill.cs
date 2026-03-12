namespace RideOnServer.BL
{
    public class Bill
    {
        public int BillId { get; set; }

        public int PaidByPersonId { get; set; }

        public decimal AmountToPay { get; set; }

        public DateTime DateOpened { get; set; }

        public DateTime? DateClosed { get; set; }
    }
}