namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class BulkCreatePaidTimeRequestsResponse
    {
        public bool Created { get; set; }

        public int? BatchId { get; set; }

        public List<int> CreatedRequestIds { get; set; } = new List<int>();

        public List<PaidTimeSlotCapacityWarning> Warnings { get; set; } = new List<PaidTimeSlotCapacityWarning>();

        public string? Message { get; set; }
    }
}
