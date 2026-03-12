namespace RideOnServer.BL
{
    public class ProductChangeRequest
    {
        public int ProductChangeRequestId { get; set; }

        public int OriginalPRequestId { get; set; }

        public int? NewPRequestId { get; set; }

        public int? AnsweredBySystemUserId { get; set; }

        public string? Status { get; set; }

        public DateTime RequestDate { get; set; }

        public bool IsCancelled { get; set; }
    }
}