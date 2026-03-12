namespace RideOnServer.BL
{
    public class Competition
    {
        public int CompetitionId { get; set; }

        public int HostRanchId { get; set; }

        public byte FieldId { get; set; }

        public int CreatedBySystemUserId { get; set; }

        public string CompetitionName { get; set; }

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