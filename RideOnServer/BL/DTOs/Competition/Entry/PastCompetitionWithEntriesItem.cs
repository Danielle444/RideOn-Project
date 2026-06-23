namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class PastCompetitionWithEntriesItem
    {
        public int CompetitionId { get; set; }

        public string CompetitionName { get; set; } = string.Empty;

        public DateTime CompetitionStartDate { get; set; }

        public DateTime CompetitionEndDate { get; set; }

        public string HostRanchName { get; set; } = string.Empty;

        public int EntryCount { get; set; }
    }
}
