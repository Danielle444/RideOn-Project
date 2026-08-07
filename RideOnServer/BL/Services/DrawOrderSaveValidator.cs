using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.BL.Services
{
    // Validates a flat { entryId, drawOrder } save payload against the
    // physical-run grouping of its scope (a competition+classDate+orderInDay
    // group for UpdateGroupEntriesDrawOrder, or a single ClassInCompId for
    // UpdateClassEntriesDrawOrder). Replaces the old blanket "no two entries
    // may share a DrawOrder" rule: two entries may share a DrawOrder only when
    // they resolve to the same physical-run key.
    public static class DrawOrderSaveValidator
    {
        // scopeEntries: every entry row in the target scope (any status) --
        // used to resolve each payload EntryId to its physical run and to
        // detect invalid duplicates. payload: the entryId/drawOrder pairs the
        // caller wants to save. Throws BL.ValidationException on any violation;
        // returns normally when the payload is valid.
        public static void ValidateSave(
            List<SecretaryCompetitionEntryItem> scopeEntries,
            List<(int EntryId, short DrawOrder)> payload)
        {
            PhysicalRunGroupingResult grouping = PhysicalRunGrouper.Group(scopeEntries);

            if (grouping.Duplicates.Count > 0)
            {
                throw new ValidationException(
                    PhysicalRunGrouper.FormatDuplicateMessage(grouping.Duplicates));
            }

            Dictionary<int, PhysicalRunGroup> runByEntryId =
                new Dictionary<int, PhysicalRunGroup>();

            foreach (PhysicalRunGroup run in grouping.PhysicalRuns)
            {
                foreach (int entryId in run.EntryIds)
                {
                    runByEntryId[entryId] = run;
                }
            }

            List<int> notInScope = payload
                .Where(item => !runByEntryId.ContainsKey(item.EntryId))
                .Select(item => item.EntryId)
                .Distinct()
                .ToList();

            if (notInScope.Count > 0)
            {
                throw new ValidationException(
                    "Entries " + string.Join(", ", notInScope) +
                    " are not active members of this draw group");
            }

            foreach (IGrouping<short, (int EntryId, short DrawOrder)> byDrawOrder in
                     payload.GroupBy(item => item.DrawOrder))
            {
                List<string> runKeys = byDrawOrder
                    .Select(item => runByEntryId[item.EntryId].PhysicalRunKey)
                    .Distinct()
                    .ToList();

                if (runKeys.Count > 1)
                {
                    throw new ValidationException(
                        "DrawOrder " + byDrawOrder.Key +
                        " is shared by unrelated physical runs");
                }
            }

            foreach (IGrouping<string, (int EntryId, short DrawOrder)> byRun in
                     payload.GroupBy(item => runByEntryId[item.EntryId].PhysicalRunKey))
            {
                List<short> drawOrders = byRun
                    .Select(item => item.DrawOrder)
                    .Distinct()
                    .ToList();

                if (drawOrders.Count > 1)
                {
                    throw new ValidationException(
                        "Physical run for entry " + byRun.First().EntryId +
                        " was assigned more than one DrawOrder");
                }
            }
        }
    }
}
