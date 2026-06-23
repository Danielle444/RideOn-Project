namespace RideOnServer.BL.DTOs.Competition
{
    public class DuplicateCompetitionFromSelectionRequest
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

        public List<int> ClassJudgeIds { get; set; } = new List<int>();

        public List<DuplicateCompetitionSelectionClassItem> Classes { get; set; } =
            new List<DuplicateCompetitionSelectionClassItem>();

        public List<DuplicateCompetitionSelectionPaidTimeSlotItem> PaidTimeSlots { get; set; } =
            new List<DuplicateCompetitionSelectionPaidTimeSlotItem>();
    }
}