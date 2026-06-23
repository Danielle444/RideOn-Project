namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class DuplicatableEntryItem
    {
        public int SourceEntryId { get; set; }

        public int SourceClassInCompId { get; set; }

        public string SourceClassName { get; set; } = string.Empty;

        public DateTime? SourceClassDate { get; set; }

        public int? TargetClassInCompId { get; set; }

        public string? TargetClassName { get; set; }

        public DateTime? TargetClassDate { get; set; }

        public int HorseId { get; set; }

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public int RiderFederationMemberId { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public int? CoachFederationMemberId { get; set; }

        public string? CoachName { get; set; }

        public int PaidByPersonId { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public string? PrizeRecipientName { get; set; }

        public bool AlreadyExists { get; set; }
    }
}
