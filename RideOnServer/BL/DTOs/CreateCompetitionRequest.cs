namespace RideOnServer.BL.DTOs
{
    public class CreateCompetitionRequest
    {
        public int HostRanchId { get; set; }
        public byte FieldId { get; set; }
        public string CompetitionName { get; set; } = string.Empty;
        public DateTime CompetitionStartDate { get; set; }
        public DateTime CompetitionEndDate { get; set; }
        public DateTime? RegistrationOpenDate { get; set; }
        public DateTime? RegistrationEndDate { get; set; }
        public DateTime? PaidTimeRegistrationDate { get; set; }
        public DateTime? PaidTimePublicationDate { get; set; }
        public string? CompetitionStatus { get; set; }
        public string? Notes { get; set; }
    }
}