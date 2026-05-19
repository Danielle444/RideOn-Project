namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class MyCompetitionPaidTimeRequestItem
    {
        public int PaidTimeRequestId { get; set; }

        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }

        public string? CoachName { get; set; }
        public string PayerName { get; set; } = string.Empty;

        public string ProductName { get; set; } = string.Empty;
        public decimal AmountToPay { get; set; }

        public bool IsPaid { get; set; }
        public bool IsAssigned { get; set; }

        public string DisplayStatus { get; set; } = string.Empty;

        public DateOnly DisplaySlotDate { get; set; }
        public TimeOnly DisplayStartTime { get; set; }
        public TimeOnly DisplayEndTime { get; set; }
        public string DisplayArenaName { get; set; } = string.Empty;

        public DateOnly RequestedSlotDate { get; set; }
        public TimeOnly RequestedStartTime { get; set; }
        public TimeOnly RequestedEndTime { get; set; }
        public string RequestedArenaName { get; set; } = string.Empty;

        public DateOnly? AssignedSlotDate { get; set; }
        public TimeOnly? AssignedSlotStartTime { get; set; }
        public TimeOnly? AssignedSlotEndTime { get; set; }
        public string? AssignedArenaName { get; set; }

        public string? Notes { get; set; }
        public string Status { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; }

        public decimal HoursUntilStart { get; set; }
        public bool CanModify { get; set; }
        public bool CanCancel { get; set; }
        public int? BatchId { get; set; }
        public int HorseId { get; set; }
        public int? CoachFederationMemberId { get; set; }
        public DateTime? AssignedStartTimeActual { get; set; }
        public int? AssignedOrder { get; set; }
        public bool AssignedSlotIsPublished { get; set; }
    }

    public class CancelPaidTimeRequestRequest
    {
        public int PaidTimeRequestId { get; set; }
        public int RanchId { get; set; }
    }

    public class UpdatePaidTimeRequestNotesRequest
    {
        public int PaidTimeRequestId { get; set; }
        public int RanchId { get; set; }
        public string? Notes { get; set; }
        public int? PriceCatalogId { get; set; }
        public int? RequestedCompSlotId { get; set; }
    }
}