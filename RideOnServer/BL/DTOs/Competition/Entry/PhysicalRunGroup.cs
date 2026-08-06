namespace RideOnServer.BL.DTOs.Competition.Entry
{
    // A physical run is one rider+horse arena pass that may cover several
    // classifications (ClassInCompId values) entered together. Grouping key:
    // RiderFederationMemberId + HorseId + ClassDate (date part) + OrderInDay.
    // Only Active entries are ever grouped -- see PhysicalRunGrouper.
    public class PhysicalRunGroup
    {
        public string PhysicalRunKey { get; set; } = string.Empty;

        public int RiderFederationMemberId { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public int HorseId { get; set; }

        public string HorseName { get; set; } = string.Empty;

        public DateTime ClassDate { get; set; }

        public short OrderInDay { get; set; }

        // Earliest CreatedAt among the run's linked entries -- mirrors the
        // stable ordering DrawOrderGenerator already used per-entry
        // (CreatedAt then EntryId), now applied per-run.
        public DateTime CreatedAt { get; set; }

        public int MinEntryId { get; set; }

        // The underlying Active, non-duplicate entry rows linked to this run
        // (one per classification). Never includes Cancelled/CancelledAfterStart
        // rows or rows flagged as invalid same-class duplicates.
        public List<SecretaryCompetitionEntryItem> Entries { get; set; } =
            new List<SecretaryCompetitionEntryItem>();

        public List<int> EntryIds =>
            Entries.Select(e => e.EntryId).ToList();

        public List<int> ClassInCompIds =>
            Entries.Select(e => e.ClassInCompId).Distinct().ToList();

        public List<string> ClassLabels =>
            Entries.Select(e => e.ClassName).Distinct().ToList();
    }

    // Multiple Active entries for the same rider+horse+ClassInCompId+competition
    // -- an invalid duplicate registration, never a legitimate second physical
    // run. Callers must block the draw operation and surface these entry ids.
    public class DuplicateEntryGroup
    {
        public int RiderFederationMemberId { get; set; }

        public string RiderName { get; set; } = string.Empty;

        public int HorseId { get; set; }

        public string HorseName { get; set; } = string.Empty;

        public int ClassInCompId { get; set; }

        public string ClassName { get; set; } = string.Empty;

        public int CompetitionId { get; set; }

        public List<int> EntryIds { get; set; } = new List<int>();
    }

    public class PhysicalRunGroupingResult
    {
        public List<PhysicalRunGroup> PhysicalRuns { get; set; } =
            new List<PhysicalRunGroup>();

        public List<DuplicateEntryGroup> Duplicates { get; set; } =
            new List<DuplicateEntryGroup>();
    }
}
