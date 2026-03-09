namespace RideOnServer.BL
{
    public class Competition
    {
        public int CompetitionId { get; set; }

        public string CompetitionName { get; set; }

        public DateTime? CompetitionStartDate { get; set; }

        public DateTime? CompetitionEndDate { get; set; }

        public DateTime? RegistrationOpenDate { get; set; }

        public DateTime? RegistrationEndDate { get; set; }

        public DateTime? PaidTimeRegistrationDate { get; set; }

        public DateTime? PaidTimePublicationDate { get; set; }

        public string CompetitionStatus { get; set; }

        public string Notes { get; set; }

        public int RanchId { get; set; }

        public short FieldId { get; set; }

        public int SystemUserId { get; set; }

        public string StallMapUrl { get; set; }
    }
}