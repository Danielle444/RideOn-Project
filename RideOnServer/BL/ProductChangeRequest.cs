namespace RideOnServer.BL
{
    public class ProductChangeRequest
    {
        public int ProductChangeRequestId { get; set; }

        public DateTime? RequestDate { get; set; }

        public byte? Amount { get; set; }

        public bool? IsCancelled { get; set; }

        public int PRequestId { get; set; }

        public int? AnsweredBy_SystemUserId { get; set; }
    }
}