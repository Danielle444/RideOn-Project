namespace RideOnServer.BL
{
    public class HorseParticipationInCompetition
    {
        public int HorseId { get; set; }

        public int CompetitionId { get; set; }

        public string? HCApprovalStatus { get; set; }

        public DateTime? HCApprovalDate { get; set; }

        public string? HCPath { get; set; }

        public DateTime? HCUploadDate { get; set; }

        public int? HCApproverSystemUserId { get; set; }
    }
}