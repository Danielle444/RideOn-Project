namespace RideOnServer.BL.DTOs.Competition.PaidTimeSlotInCompetition
{
    public class UpdatePaidTimeSlotInCompetitionRequest
    {
        public int CompSlotId { get; set; }
        public int CompetitionId { get; set; }
        public int HostRanchId { get; set; }

        public int PaidTimeSlotId { get; set; }
        public int ArenaRanchId { get; set; }
        public byte ArenaId { get; set; }

        public DateTime SlotDate { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }

        public string? SlotStatus { get; set; }
        public string? SlotNotes { get; set; }
    }
}