namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class BulkCreatePaidTimeRequestsResponse
    {
        public bool Created { get; set; }

        public int? BatchId { get; set; }

        public List<int> CreatedRequestIds { get; set; } = new List<int>();

        public List<PaidTimeSlotCapacityWarning> Warnings { get; set; } = new List<PaidTimeSlotCapacityWarning>();

        public string? Message { get; set; }

        public AutoSchedulerSummary? Scheduling { get; set; }
    }

    public class AutoSchedulerSummary
    {
        public int ScheduledCount { get; set; }

        public int UnscheduledCount { get; set; }

        public int FrozenCount { get; set; }

        public List<UnscheduledRequestItem> UnscheduledItems { get; set; } = new List<UnscheduledRequestItem>();

        public List<ScheduledRequestItem> ScheduledItems { get; set; } = new List<ScheduledRequestItem>();
    }

    public class UnscheduledRequestItem
    {
        public int PaidTimeRequestId { get; set; }

        public int HorseId { get; set; }

        public int CoachFederationMemberId { get; set; }

        public string Reason { get; set; } = string.Empty;
    }

    public class ScheduledRequestItem
    {
        public int PaidTimeRequestId { get; set; }

        public int HorseId { get; set; }

        public int CoachFederationMemberId { get; set; }

        public int AssignedCompSlotId { get; set; }

        public DateTime AssignedStartTime { get; set; }

        public int AssignedOrder { get; set; }
    }
}
