using System;

namespace RideOnServer.BL.DTOs.StallBookings
{
    public class StallBookingPayerItem
    {
        public int StallBookingId { get; set; }
        public int BillId { get; set; }
        public int payerPersonId { get; set; }
        public string PayerFullName { get; set; } = string.Empty;
        public decimal AmountToPay { get; set; }
        public DateTime DateOpened { get; set; }
        public DateTime? DateClosed { get; set; }
    }
}