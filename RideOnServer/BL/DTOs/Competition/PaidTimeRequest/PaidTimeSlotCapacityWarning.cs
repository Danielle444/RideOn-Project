namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class PaidTimeSlotCapacityWarning
    {
        public int RequestedCompSlotId { get; set; }

        public int TotalCapacityMinutes { get; set; }

        public int UsedCapacityMinutes { get; set; }

        public int NewRequestMinutes { get; set; }

        public bool WouldOverflow { get; set; }
    }
}
