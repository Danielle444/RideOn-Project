namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class GroupDrawOrderPreviewResponse
    {
        public short MinimumGap { get; set; }

        public int EntryCount { get; set; }

        public bool HasPerfectSolution { get; set; }

        public string SummaryMessage { get; set; } = string.Empty;

        public List<GroupDrawOrderPreviewEntryItem> Entries { get; set; } =
            new List<GroupDrawOrderPreviewEntryItem>();

        public List<GroupDrawOrderWarningItem> Warnings { get; set; } =
            new List<GroupDrawOrderWarningItem>();
    }

    public class GroupDrawOrderPreviewEntryItem
    {
        public int EntryId { get; set; }

        public int ClassInCompId { get; set; }

        public string ClassName { get; set; } = string.Empty;

        public DateTime? ClassDate { get; set; }

        public short? OrderInDay { get; set; }

        public short DrawOrder { get; set; }

        public int HorseId { get; set; }

        public string HorseName { get; set; } = string.Empty;

        public string? BarnName { get; set; }

        public int RiderFederationMemberId { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public int? CoachFederationMemberId { get; set; }

        public string? CoachName { get; set; }

        public string PayerName { get; set; } = string.Empty;

        public string? PrizeRecipientName { get; set; }

        public bool IsPaid { get; set; }

        public DateTime CreatedAt { get; set; }

        public int RiderGapFromPrevious { get; set; }

        public int HorseGapFromPrevious { get; set; }

        public bool HasRiderGapWarning { get; set; }

        public bool HasHorseGapWarning { get; set; }
    }

    public class GroupDrawOrderWarningItem
    {
        public string WarningType { get; set; } = string.Empty;

        public string EntityName { get; set; } = string.Empty;

        public int EntityId { get; set; }

        public short FirstDrawOrder { get; set; }

        public short SecondDrawOrder { get; set; }

        public int ActualGap { get; set; }

        public int RequiredGap { get; set; }

        public string Message { get; set; } = string.Empty;
    }
}