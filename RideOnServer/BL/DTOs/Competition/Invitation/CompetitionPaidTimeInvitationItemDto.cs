namespace RideOnServer.BL.DTOs.Competition.Invitation
{
    public class CompetitionPaidTimeInvitationItemDto
    {
        public int CompSlotId { get; set; }
        public DateTime SlotDate { get; set; }
        public string? TimeOfDay { get; set; }
        public TimeSpan StartTime { get; set; }
        public TimeSpan EndTime { get; set; }
        public string? ArenaName { get; set; }
    }
}