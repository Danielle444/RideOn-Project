namespace RideOnServer.BL.DTOs.Auth.SuperUser
{
    public class UpdateNewRanchRequestStatusRequest
    {
        public int RequestId { get; set; }
        public int ResolvedBySuperUserId { get; set; }
        public string NewStatus { get; set; } = string.Empty; // Approved / Rejected
    }
}