namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class SlotScheduleItem
    {
        public int PaidTimeRequestId { get; set; }
        public int HorseId { get; set; }
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string? CoachName { get; set; }
        public string RiderName { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
        public DateTime? AssignedStartTime { get; set; }
        public int? AssignedOrder { get; set; }
        public DateOnly SlotDate { get; set; }
        public TimeOnly SlotStartTime { get; set; }
        public TimeOnly SlotEndTime { get; set; }
        public string ArenaName { get; set; } = string.Empty;
        public bool IsPublished { get; set; }
        public bool IsMine { get; set; }
    }

    public class PublishedSlotItem
    {
        public int PaidTimeSlotInCompId { get; set; }
        public DateOnly SlotDate { get; set; }
        public TimeOnly StartTime { get; set; }
        public TimeOnly EndTime { get; set; }
        public string ArenaName { get; set; } = string.Empty;
        public string? SlotStatus { get; set; }
        public int AssignedCount { get; set; }
        public int MyAssignedCount { get; set; }
    }
}
