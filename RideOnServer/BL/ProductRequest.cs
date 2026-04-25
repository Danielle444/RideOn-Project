namespace RideOnServer.BL
{
    public class ProductRequest
    {
        public int PRequestId { get; set; }

        public int CompetitionId { get; set; }

        public int OrderedBySystemUserId { get; set; }

        public int PriceCatalogId { get; set; }

        public DateTime PRequestDateTime { get; set; }

        public string? Notes { get; set; }

        public DateTime? ApprovalDate { get; set; }
    }
}