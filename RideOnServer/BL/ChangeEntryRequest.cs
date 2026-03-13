namespace RideOnServer.BL
{
    public class ChangeEntryRequest
    {
        public int ChangeEntryRequestId { get; set; }

        public int OriginalEntryId { get; set; }

        public int? NewEntryId { get; set; }

        public DateTime RequestDateTime { get; set; }

        public string? Status { get; set; }

        public bool IsCancelled { get; set; }
    }
}