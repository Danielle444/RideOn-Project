using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.BL.Services
{
    // Pure grouping helper: turns a flat list of entry rows (as returned by
    // usp_getsecretarycompetitionentries) into physical runs -- one rider+horse
    // arena pass that may cover several classifications entered together.
    //
    // Locked business rule (never change without a business decision): two
    // entries belong to the same physical run when RiderFederationMemberId,
    // HorseId, ClassDate (date part) and OrderInDay are all equal. BillId,
    // creation timestamp, coach, orderedBySystemUserId and pattern number are
    // NOT part of the key.
    //
    // Invalid duplicates: multiple Active entries sharing RiderFederationMemberId
    // + HorseId + ClassInCompId + CompetitionId are never a legitimate second
    // physical run. They are detected and excluded from grouping entirely --
    // callers MUST check Duplicates and block the draw operation rather than
    // silently assigning the group a draw position.
    //
    // Cancelled/CancelledAfterStart entries are filtered out before grouping
    // (CAP-9's existing guarantee, extended here): a run with one cancelled and
    // one active classification keeps only the active one; a run with every
    // classification cancelled produces no run at all.
    public static class PhysicalRunGrouper
    {
        public static PhysicalRunGroupingResult Group(
            IEnumerable<SecretaryCompetitionEntryItem> entries)
        {
            List<SecretaryCompetitionEntryItem> active = (entries ?? Enumerable.Empty<SecretaryCompetitionEntryItem>())
                .Where(e => (e.EntryStatus ?? "Active") == "Active")
                .ToList();

            List<DuplicateEntryGroup> duplicates = active
                .GroupBy(e => new { e.RiderFederationMemberId, e.HorseId, e.ClassInCompId, e.CompetitionId })
                .Where(g => g.Count() > 1)
                .Select(g => new DuplicateEntryGroup
                {
                    RiderFederationMemberId = g.Key.RiderFederationMemberId,
                    RiderName = g.First().RiderName,
                    HorseId = g.Key.HorseId,
                    HorseName = g.First().HorseName,
                    ClassInCompId = g.Key.ClassInCompId,
                    ClassName = g.First().ClassName,
                    CompetitionId = g.Key.CompetitionId,
                    EntryIds = g.Select(e => e.EntryId).OrderBy(id => id).ToList()
                })
                .ToList();

            HashSet<int> duplicateEntryIds = duplicates
                .SelectMany(d => d.EntryIds)
                .ToHashSet();

            // Entries caught in an invalid duplicate must never receive a draw
            // position, silently or otherwise -- exclude them from grouping.
            // Callers are required to check Duplicates and block before using
            // PhysicalRuns for anything.
            List<SecretaryCompetitionEntryItem> groupable = active
                .Where(e => !duplicateEntryIds.Contains(e.EntryId))
                .ToList();

            List<PhysicalRunGroup> runs = groupable
                .GroupBy(BuildRunKey)
                .Select(BuildRun)
                .ToList();

            return new PhysicalRunGroupingResult
            {
                PhysicalRuns = runs,
                Duplicates = duplicates
            };
        }

        // Human-readable, English (matches this feature area's existing RN001/
        // ValidationException convention -- see usp_admincreateentry/
        // usp_admineditentry). Hebrew user-facing copy for the web/mobile layer
        // is a separate, explicitly-approved concern -- not decided here.
        public static string FormatDuplicateMessage(List<DuplicateEntryGroup> duplicates)
        {
            IEnumerable<string> parts = duplicates.Select(d =>
                $"rider {d.RiderName} ({d.RiderFederationMemberId}), horse {d.HorseName} ({d.HorseId}), " +
                $"class {d.ClassName} ({d.ClassInCompId}): entry ids {string.Join(", ", d.EntryIds)}");

            return "Duplicate active entries detected -- " + string.Join("; ", parts);
        }

        // Entries missing ClassDate or OrderInDay cannot be grouped by the
        // locked key -- fall back to a per-entry key so they are never merged
        // with an unrelated row. This only matters for callers that scope by
        // ClassInCompId alone (a class with no ClassDateTime/OrderInDay set);
        // callers scoped by ClassDate+OrderInDay already guarantee both are set
        // on everything that survives their own filter.
        private static string BuildRunKey(SecretaryCompetitionEntryItem entry)
        {
            if (!entry.ClassDate.HasValue || !entry.OrderInDay.HasValue)
            {
                return $"entry:{entry.EntryId}";
            }

            return $"{entry.RiderFederationMemberId}:{entry.HorseId}:" +
                   $"{entry.ClassDate.Value:yyyy-MM-dd}:{entry.OrderInDay.Value}";
        }

        private static PhysicalRunGroup BuildRun(IGrouping<string, SecretaryCompetitionEntryItem> group)
        {
            List<SecretaryCompetitionEntryItem> entries = group
                .OrderBy(e => e.EntryId)
                .ToList();

            SecretaryCompetitionEntryItem first = entries[0];

            short? existingDrawOrder = entries
                .Select(e => e.DrawOrder)
                .FirstOrDefault(d => d.HasValue);

            return new PhysicalRunGroup
            {
                PhysicalRunKey = group.Key,
                RiderFederationMemberId = first.RiderFederationMemberId,
                RiderName = first.RiderName,
                HorseId = first.HorseId,
                HorseName = first.HorseName,
                ClassDate = first.ClassDate ?? default,
                OrderInDay = first.OrderInDay ?? 0,
                CreatedAt = entries.Min(e => e.CreatedAt),
                MinEntryId = entries.Min(e => e.EntryId),
                Entries = entries
            };
        }
    }
}
