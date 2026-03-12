namespace RideOnServer.BL
{
    public class ChangeClassRequest
    {
        public int ChangeClassRequestId { get; set; }

        public int EntryId { get; set; }

        public int ClassInCompId { get; set; }

        public DateTime RequestDateTime { get; set; }

        public string? Status { get; set; }
    }
}