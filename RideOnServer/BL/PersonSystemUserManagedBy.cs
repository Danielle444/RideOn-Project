namespace RideOnServer.BL
{
    public class PersonSystemUserManagedBy
    {
        public int PersonId { get; set; }

        public int SystemUserId { get; set; }

        public DateTime? RequestDate { get; set; }

        public DateTime? UpdateDate { get; set; }

        public string ApprovalStatus { get; set; }
    }
}