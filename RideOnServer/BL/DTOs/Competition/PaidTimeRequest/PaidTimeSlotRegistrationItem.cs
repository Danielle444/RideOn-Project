namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class PaidTimeSlotRegistrationItem
    {
        public int PaidTimeRequestId { get; set; }

        public string RequestStatus { get; set; } = "Pending";

        public bool IsAssignedToThisSlot { get; set; }

        public bool IsRequestedForThisSlot { get; set; }

        public DateTime? AssignedStartTime { get; set; }

        public int? AssignedOrder { get; set; }

        public string? ProductName { get; set; }

        public int? DurationMinutes { get; set; }

        public int HorseId { get; set; }

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public int RiderFederationMemberId { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public int? CoachFederationMemberId { get; set; }

        public string? CoachName { get; set; }

        public int PaidByPersonId { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public string? Notes { get; set; }
    }
}
