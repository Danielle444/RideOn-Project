namespace RideOnServer.BL
{
    public class PaidTimeRequest : ServiceRequest
    {
        public int CatalogItemId { get; set; }

        public int RequestedCompSlotId { get; set; }

        public int? AssignedCompSlotId { get; set; }

        public DateTime? AssignedStartTime { get; set; }

        public string? Status { get; set; }

        public string? Notes { get; set; }
    }
}