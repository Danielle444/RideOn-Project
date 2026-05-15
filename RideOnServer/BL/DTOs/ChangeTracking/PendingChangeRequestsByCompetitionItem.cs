namespace RideOnServer.BL.DTOs.ChangeTracking
{
    public class PendingChangeRequestsByCompetitionItem
    {
        public int CompetitionId { get; set; }

        public string CompetitionName { get; set; } = string.Empty;

        public int PendingCount { get; set; }
    }
}