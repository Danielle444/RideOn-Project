namespace RideOnServer.BL.DTOs.ChangeEntryRequest
{
    public class ApproveChangeEntryRequestDTO
    {
        public int ChangeEntryRequestId { get; set; }

        public bool IsApproved { get; set; }
    }
}