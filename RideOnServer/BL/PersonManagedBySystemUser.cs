namespace RideOnServer.BL
{
    public class PersonManagedBySystemUser
    {
        public int SystemUserId { get; set; }

        public int PersonId { get; set; }

        public DateTime? RequestDate { get; set; }

        public DateTime? UpdateDate { get; set; }

        public string? ApprovalStatus { get; set; }
    }
}