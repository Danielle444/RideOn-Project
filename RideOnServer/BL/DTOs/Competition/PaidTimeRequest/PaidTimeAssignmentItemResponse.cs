namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class PaidTimeAssignmentItemResponse
    {
        public int PaidTimeRequestId { get; set; }
        public int RequestedCompSlotId { get; set; }
        public int? AssignedCompSlotId { get; set; }
        public DateTime? AssignedStartTime { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }

        public int HorseId { get; set; }
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public int RanchId { get; set; }

        public int RiderFederationMemberId { get; set; }
        public string RiderName { get; set; } = string.Empty;

        public int? CoachFederationMemberId { get; set; }
        public string? CoachName { get; set; }

        public int PaidByPersonId { get; set; }
        public string PayerName { get; set; } = string.Empty;

        public short ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public int EffectiveDurationMinutes { get; set; }

        public DateOnly RequestedSlotDate { get; set; }
        public TimeOnly RequestedStartTime { get; set; }
        public TimeOnly RequestedEndTime { get; set; }
        public string RequestedArenaName { get; set; } = string.Empty;

        public DateOnly? AssignedSlotDate { get; set; }
        public TimeOnly? AssignedSlotStartTime { get; set; }
        public TimeOnly? AssignedSlotEndTime { get; set; }
        public string? AssignedArenaName { get; set; }
    }
}