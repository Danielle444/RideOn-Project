namespace RideOnServer.BL.DTOs.Auth.SuperUser
{
    public class SuperUserListItem
    {
        public int SuperUserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public bool MustChangePassword { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? LastLoginDate { get; set; }
    }
}