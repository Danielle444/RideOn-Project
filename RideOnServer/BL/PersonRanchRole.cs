namespace RideOnServer.BL
{
    public class PersonRanchRole
    {
        public int PersonId { get; set; }

        public int RanchId { get; set; }

        public byte RoleId { get; set; }

        public string? RoleStatus { get; set; }
    }
}