namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class CreatePaidTimeRequestRequest
    {
        public int OrderedBySystemUserId { get; set; }

        public int RanchId { get; set; }

        public int HorseId { get; set; }

        public int RiderFederationMemberId { get; set; }

        public int CoachFederationMemberId { get; set; }

        public int PaidByPersonId { get; set; }

        public int PriceCatalogId { get; set; }

        public int RequestedCompSlotId { get; set; }

        public string? Notes { get; set; }
    }
}