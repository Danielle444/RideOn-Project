namespace RideOnServer.BL.DTOs.Competition
{
    public class DuplicateCompetitionRequest
    {
        public int SourceCompetitionId { get; set; }
        public int HostRanchId { get; set; }

        public string NewCompetitionName { get; set; } = string.Empty;
        public DateTime NewCompetitionStartDate { get; set; }
        public DateTime NewCompetitionEndDate { get; set; }

        public DateTime? RegistrationOpenDate { get; set; }
        public DateTime? RegistrationEndDate { get; set; }
        public DateTime? PaidTimeRegistrationDate { get; set; }
        public DateTime? PaidTimePublicationDate { get; set; }

        public string? Notes { get; set; }

        public bool CopyClasses { get; set; } = true;
        public bool CopyClassPrices { get; set; } = true;
        public bool CopyClassPrizes { get; set; } = true;
        public bool CopyReiningPatterns { get; set; } = false;

        public List<int> ClassJudgeIds { get; set; } = new List<int>();

        public bool CopyPaidTimeSlots { get; set; } = true;
    }
}