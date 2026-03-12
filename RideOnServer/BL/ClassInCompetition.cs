namespace RideOnServer.BL
{
    public class ClassInCompetition
    {
        public int ClassInCompId { get; set; }

        public int CompetitionId { get; set; }

        public short ClassTypeId { get; set; }

        public int ArenaRanchId { get; set; }

        public byte ArenaId { get; set; }

        public DateTime? ClassDateTime { get; set; }

        public decimal? OrganizerCost { get; set; }

        public decimal? FederationCost { get; set; }

        public string? ClassNotes { get; set; }

        public TimeSpan? StartTime { get; set; }

        public byte? OrderInDay { get; set; }
    }
}