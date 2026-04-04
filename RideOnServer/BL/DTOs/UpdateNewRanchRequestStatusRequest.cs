namespace RideOnServer.BL.DTOs
{
    public class UpdateNewRanchRequestStatusRequest
    {
        public int RequestId { get; set; }
        public int ResolvedBySuperUserId { get; set; }
        public string NewStatus { get; set; } = string.Empty; // Approved / Rejected
    }
}