namespace RideOnServer.BL.DTOs
{
    // שלב 2: שיוך משתמש קיים לחווה ותפקיד
    public class AssignRoleRequest
    {
        public int PersonId { get; set; }
        public int RanchId { get; set; }
        public byte RoleId { get; set; }
    }
}
