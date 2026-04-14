namespace RideOnServer.BL.DTOs.Competition.Invitation
{
    public class CompetitionClassInvitationItemDto
    {
        public int ClassInCompId { get; set; }
        public string? ClassName { get; set; }
        public DateTime? ClassDateTime { get; set; }
        public TimeSpan? StartTime { get; set; }
        public byte? OrderInDay { get; set; }
        public string? ArenaName { get; set; }
        public string? JudgesDisplay { get; set; }
        public decimal? OrganizerCost { get; set; }
        public decimal? FederationCost { get; set; }
        public decimal? TotalPrice { get; set; }
        public string? PrizeTypeName { get; set; }
        public decimal? PrizeAmount { get; set; }
    }
}