namespace RideOnServer.BL.DTOs.Competition
{
    public class RescheduleCompetitionRequest
    {
        public int CompetitionId { get; set; }
        public int HostRanchId { get; set; }
        public int OffsetDays { get; set; }
    }
}
