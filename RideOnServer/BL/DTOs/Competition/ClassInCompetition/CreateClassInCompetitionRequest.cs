namespace RideOnServer.BL.DTOs.Competition.ClassInCompetition
{
    public class CreateClassInCompetitionRequest
    {
        public int CompetitionId { get; set; }
        public int HostRanchId { get; set; }

        public short ClassTypeId { get; set; }

        public int ArenaRanchId { get; set; }
        public byte ArenaId { get; set; }

        public DateTime? ClassDateTime { get; set; }
        public TimeSpan? StartTime { get; set; }
        public byte? OrderInDay { get; set; }

        public decimal? OrganizerCost { get; set; }
        public decimal? FederationCost { get; set; }

        public string? ClassNotes { get; set; }

        public List<int> JudgeIds { get; set; } = new List<int>();
        public byte? PrizeTypeId { get; set; }
        public decimal? PrizeAmount { get; set; }

        public short? PatternNumber { get; set; }
    }
}