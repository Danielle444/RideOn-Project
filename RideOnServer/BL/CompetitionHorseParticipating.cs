namespace RideOnServer.BL
{
    public class CompetitionHorseParticipating
    {
        public int CompetitionId { get; set; }

        public int HorseId { get; set; }

        public string HCPath { get; set; }

        public DateTime? UploadDate { get; set; }

        public string ApprovalStatus { get; set; }

        public int? Approver_SystemUserId { get; set; }

        public DateTime? ApprovalDate { get; set; }
    }
}