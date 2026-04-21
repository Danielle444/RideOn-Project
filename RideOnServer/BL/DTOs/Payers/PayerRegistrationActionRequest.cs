namespace RideOnServer.BL.DTOs.Payers
{
    public class PayerRegistrationActionRequest
    {
        public int PersonId { get; set; }
        public int RanchId { get; set; }
        public short RoleId { get; set; }
    }
}
