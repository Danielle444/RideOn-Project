namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class AssignPaidTimeRequestRequest
    {
        public int RanchId { get; set; }

        public int PaidTimeRequestId { get; set; }

        public int AssignedCompSlotId { get; set; }

        public DateTime AssignedStartTime { get; set; }
    }
}