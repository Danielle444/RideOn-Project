namespace RideOnServer.BL
{
    public class ClassInCompetition
    {
        public int ClassInCompId { get; set; }

        public DateTime? ClassDateTime { get; set; }

        public short? OrganizerCost { get; set; }

        public short? FederationCost { get; set; }

        public string ClassNotes { get; set; }

        public TimeSpan? StartTime { get; set; }

        public byte? OrderInDay { get; set; }

        public short ClassTypeId { get; set; }

        public short? ArenaId { get; set; }

        public int CompetitionId { get; set; }
    }
}