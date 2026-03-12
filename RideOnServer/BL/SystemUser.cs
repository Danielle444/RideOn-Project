namespace RideOnServer.BL
{
    public class SystemUser : Person
    {
        public string Username { get; set; }

        public string? PasswordHash { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}