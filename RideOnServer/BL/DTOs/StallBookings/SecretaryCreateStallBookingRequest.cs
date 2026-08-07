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

        // Ranch-model fix (Phase 2, 2026-08-05): required only when IsForTack
        // is true (no horse to derive a requesting ranch from server-side).
        // Ignored for non-tack, where usp_secretarycreatestallbookingforpayer
        // derives it itself from HorseId.
        public int? RequestingRanchId { get; set; }

        public short ProductId { get; set; }

        public string? Notes { get; set; }
    }
}
