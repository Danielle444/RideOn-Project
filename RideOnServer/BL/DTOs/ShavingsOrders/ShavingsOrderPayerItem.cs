using System;

namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class ShavingsOrderPayerItem
    {
        public int ShavingsOrderId { get; set; }
        public int BillId { get; set; }
        public int PaidByPersonId { get; set; }
        public string PayerFullName { get; set; } = string.Empty;
        public decimal AmountToPay { get; set; }
        public DateTime DateOpened { get; set; }
        public DateTime? DateClosed { get; set; }
    }
}