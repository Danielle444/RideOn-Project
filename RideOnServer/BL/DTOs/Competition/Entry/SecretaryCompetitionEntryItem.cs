namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class SecretaryCompetitionEntryItem
    {
        public int EntryId { get; set; }

        public int ClassInCompId { get; set; }

        public int CompetitionId { get; set; }

        public string ClassName { get; set; } = string.Empty;

        public DateTime? ClassDate { get; set; }

        public TimeSpan? StartTime { get; set; }

        public short? OrderInDay { get; set; }

        public short? DrawOrder { get; set; }

        public int HorseId { get; set; }

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public int HorseRanchId { get; set; }

        public int RiderFederationMemberId { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public int? CoachFederationMemberId { get; set; }

        public string? CoachName { get; set; }

        public int PaidByPersonId { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public string? PrizeRecipientName { get; set; }

        public decimal OrganizerCost { get; set; }

        public decimal FederationCost { get; set; }

        public decimal FineAmount { get; set; }

        public decimal AmountToPay { get; set; }

        public bool IsPaid { get; set; }

        public DateTime CreatedAt { get; set; }

        public int OrderedBySystemUserId { get; set; }

        public int BillId { get; set; }

        public string EntryStatus { get; set; } = "Active";

        public bool IsCancelledAfterStart { get; set; }
    }
}