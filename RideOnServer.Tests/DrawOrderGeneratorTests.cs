using FluentAssertions;
using RideOnServer.BL.DTOs.Competition.Entry;
using RideOnServer.BL.Services;

namespace RideOnServer.Tests
{
    // Pure, DB-free coverage of DrawOrderGenerator now that its candidate unit
    // is a physical run rather than a raw entry row. Test numbers map to the
    // "shared physical runs" spec's SMART DRAW section.
    public class DrawOrderGeneratorTests
    {
        private static SecretaryCompetitionEntryItem RawEntry(
            int entryId, int classInCompId, int riderId, string riderName,
            int horseId, string horseName, DateTime createdAt)
        {
            return new SecretaryCompetitionEntryItem
            {
                EntryId = entryId,
                ClassInCompId = classInCompId,
                CompetitionId = 78,
                ClassName = "Class " + classInCompId,
                ClassDate = new DateTime(2026, 9, 15),
                OrderInDay = 6,
                RiderFederationMemberId = riderId,
                RiderName = riderName,
                HorseId = horseId,
                HorseName = horseName,
                EntryStatus = "Active",
                CreatedAt = createdAt
            };
        }

        private static PhysicalRunGroup Run(
            int riderId, string riderName, int horseId, string horseName,
            DateTime createdAt, params SecretaryCompetitionEntryItem[] entries)
        {
            return new PhysicalRunGroup
            {
                PhysicalRunKey = $"{riderId}:{horseId}:2026-09-15:6",
                RiderFederationMemberId = riderId,
                RiderName = riderName,
                HorseId = horseId,
                HorseName = horseName,
                ClassDate = new DateTime(2026, 9, 15),
                OrderInDay = 6,
                CreatedAt = createdAt,
                MinEntryId = entries.Min(e => e.EntryId),
                Entries = entries.ToList()
            };
        }

        // Test 15: one physical run receives one position.
        [Fact]
        public void SinglePhysicalRun_ReceivesOnePosition()
        {
            SecretaryCompetitionEntryItem a = RawEntry(1, 100, 2307, "Rider", 360, "Horse", DateTime.UtcNow);
            List<PhysicalRunGroup> runs = new() { Run(2307, "Rider", 360, "Horse", DateTime.UtcNow, a) };

            var response = DrawOrderGenerator.GeneratePreview(runs, 7);

            response.Entries.Should().HaveCount(1);
            response.Entries[0].DrawOrder.Should().Be(1);
        }

        // Test 16: every linked active entry receives the same drawOrder.
        [Fact]
        public void MultiClassificationRun_EveryLinkedEntryGetsSameDrawOrder()
        {
            DateTime createdAt = DateTime.UtcNow;
            SecretaryCompetitionEntryItem e1 = RawEntry(10293, 1574, 2307, "Rider", 360, "Horse", createdAt);
            SecretaryCompetitionEntryItem e2 = RawEntry(10294, 1576, 2307, "Rider", 360, "Horse", createdAt);

            List<PhysicalRunGroup> runs = new() { Run(2307, "Rider", 360, "Horse", createdAt, e1, e2) };

            var response = DrawOrderGenerator.GeneratePreview(runs, 7);

            response.Entries.Should().HaveCount(2);
            response.Entries.Select(x => x.DrawOrder).Distinct().Should().ContainSingle();
            response.Entries.Select(x => x.EntryId).Should().BeEquivalentTo(new[] { 10293, 10294 });
        }

        // Test 17: rider/horse spacing evaluates physical runs, not
        // classifications -- a 2-classification run must not trigger a
        // self-inflicted gap warning, and the index-distance for a later run
        // by the same rider must count the multi-classification run as ONE
        // slot, not two.
        [Fact]
        public void Spacing_EvaluatesPhysicalRuns_NotClassifications()
        {
            DateTime t0 = new DateTime(2026, 1, 1, 0, 0, 0);

            // Run 1: rider 2307, two classifications -- occupies exactly one slot.
            SecretaryCompetitionEntryItem run1A = RawEntry(1, 100, 2307, "Rider A", 360, "Horse A", t0);
            SecretaryCompetitionEntryItem run1B = RawEntry(2, 101, 2307, "Rider A", 360, "Horse A", t0);
            PhysicalRunGroup run1 = Run(2307, "Rider A", 360, "Horse A", t0, run1A, run1B);

            // Run 2: a different rider/horse -- fills slot 2, no violation vs run1.
            SecretaryCompetitionEntryItem run2A = RawEntry(3, 102, 5000, "Rider B", 700, "Horse B", t0.AddMinutes(1));
            PhysicalRunGroup run2 = Run(5000, "Rider B", 700, "Horse B", t0.AddMinutes(1), run2A);

            // Run 3: rider 2307 again -- index distance from run1 must be 2
            // (one slot for run1's whole pair, one slot for run2), not 3.
            SecretaryCompetitionEntryItem run3A = RawEntry(4, 103, 2307, "Rider A", 360, "Horse A", t0.AddMinutes(2));
            PhysicalRunGroup run3 = Run(2307, "Rider A", 360, "Horse A", t0.AddMinutes(2), run3A);

            List<PhysicalRunGroup> runs = new() { run1, run2, run3 };

            var response = DrawOrderGenerator.GeneratePreview(runs, 2);

            // No warning attached to run1's own two rows (a run is never
            // scored against itself).
            response.Entries.Where(e => e.EntryId == 1 || e.EntryId == 2)
                .Should().OnlyContain(e => !e.HasRiderGapWarning && !e.HasHorseGapWarning);

            // Run3's gap from run1 is 2 slots (>= minimumGap of 2) -- no warning.
            var run3Row = response.Entries.Single(e => e.EntryId == 4);
            run3Row.RiderGapFromPrevious.Should().Be(2);
            run3Row.HasRiderGapWarning.Should().BeFalse();
        }

        [Fact]
        public void Spacing_WarnsWhenGapBetweenRunsIsTooSmall()
        {
            DateTime t0 = new DateTime(2026, 1, 1, 0, 0, 0);

            SecretaryCompetitionEntryItem run1A = RawEntry(1, 100, 2307, "Rider A", 360, "Horse A", t0);
            PhysicalRunGroup run1 = Run(2307, "Rider A", 360, "Horse A", t0, run1A);

            SecretaryCompetitionEntryItem run2A = RawEntry(2, 101, 2307, "Rider A", 360, "Horse A", t0.AddMinutes(1));
            PhysicalRunGroup run2 = Run(2307, "Rider A", 360, "Horse A", t0.AddMinutes(1), run2A);

            var response = DrawOrderGenerator.GeneratePreview(new List<PhysicalRunGroup> { run1, run2 }, 7);

            response.Warnings.Should().Contain(w => w.WarningType == "Rider" && w.EntityId == 2307);
        }

        // Test 18 (generator side): the algorithm never assigns two different
        // physical runs to the same DrawOrder -- each run occupies exactly one
        // sequential position by construction.
        [Fact]
        public void DistinctRuns_NeverShareADrawOrder()
        {
            DateTime t0 = DateTime.UtcNow;
            List<PhysicalRunGroup> runs = new()
            {
                Run(1, "R1", 1, "H1", t0, RawEntry(1, 100, 1, "R1", 1, "H1", t0)),
                Run(2, "R2", 2, "H2", t0.AddMinutes(1), RawEntry(2, 101, 2, "R2", 2, "H2", t0.AddMinutes(1))),
                Run(3, "R3", 3, "H3", t0.AddMinutes(2), RawEntry(3, 102, 3, "R3", 3, "H3", t0.AddMinutes(2)))
            };

            var response = DrawOrderGenerator.GeneratePreview(runs, 7);

            response.Entries.Select(e => e.DrawOrder).Should().OnlyHaveUniqueItems();
        }
    }
}
