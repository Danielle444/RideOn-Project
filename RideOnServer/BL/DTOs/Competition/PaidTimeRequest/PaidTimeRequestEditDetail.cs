namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class PaidTimeRequestEditDetail
    {
        public int PaidTimeRequestId { get; set; }
        public int RequestedCompSlotId { get; set; }
        public int PriceCatalogId { get; set; }
        public int HorseId { get; set; }
        public int RiderFederationMemberId { get; set; }
        public int? CoachFederationMemberId { get; set; }
        public int PaidByPersonId { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = string.Empty;
        public decimal HoursUntilStart { get; set; }
        public bool CanModify { get; set; }
        public bool CanCancel { get; set; }
    }
}
