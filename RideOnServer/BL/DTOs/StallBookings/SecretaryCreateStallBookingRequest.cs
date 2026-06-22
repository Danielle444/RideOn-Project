namespace RideOnServer.BL.DTOs.StallBookings
{
    public class SecretaryCreateStallBookingRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public int PayerPersonId { get; set; }

        public int? HorseId { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public bool IsForTack { get; set; }

        public short ProductId { get; set; }

        public string? Notes { get; set; }
    }
}
