namespace RideOnServer.BL
{
    public class ProductRequest
    {
        public int PRequestId { get; set; }

        public DateTime? PRequestDateTime { get; set; }

        public string Status { get; set; }

        public string Notes { get; set; }

        public DateTime? ApprovalDate { get; set; }

        public int CompetitionId { get; set; }

        public int OrderedBy_SystemUserId { get; set; }

        public int RequestedCatalogItemId { get; set; }

        public int? ActualCatalogItemId { get; set; }
    }
}