namespace RideOnServer.BL.DTOs.StallBookings
{
    public class HorsePayerOptionItem
    {
        public int HorseId { get; set; }
        public int PaidByPersonId { get; set; }
        public string PayerFullName { get; set; } = string.Empty;
        public int BillId { get; set; }
    }
}