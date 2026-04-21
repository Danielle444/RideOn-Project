namespace RideOnServer.BL.DTOs.Competition.Invitation
{
    public class CompetitionSummaryDto
    {
        public int CompetitionId { get; set; }
        public int HostRanchId { get; set; }
        public string? HostRanchName { get; set; }
        public byte FieldId { get; set; }
        public string? FieldName { get; set; }
        public string CompetitionName { get; set; } = string.Empty;
        public DateTime CompetitionStartDate { get; set; }
        public DateTime CompetitionEndDate { get; set; }
        public DateTime? RegistrationOpenDate { get; set; }
        public DateTime? RegistrationEndDate { get; set; }
        public DateTime? PaidTimeRegistrationDate { get; set; }
        public DateTime? PaidTimePublicationDate { get; set; }
        public string? CompetitionStatus { get; set; }
        public string? Notes { get; set; }
        public string? StallMapUrl { get; set; }
    }
}