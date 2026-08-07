using FluentAssertions;
using RideOnServer.BL.DTOs.Competition.Entry;
using RideOnServer.BL.Services;

namespace RideOnServer.Tests
{
    // Pure, DB-free coverage of PhysicalRunGrouper -- the shared server-side
    // helper that turns a flat entry-row list into physical runs (one rider+
    // horse arena pass that may cover several classifications) and detects
    // invalid same-class duplicates. Test numbers in comments map to the
    // "shared physical runs" spec's TEST CASES section.
    public class PhysicalRunGrouperTests
    {
        private const int Rider = 2307;
        private const int OtherRider = 4001;
        private const int Horse = 360;
        private const int OtherHorse = 999;
        private static readonly DateTime Date = new DateTime(2026, 9, 15);
        private static readonly DateTime OtherDate = new DateTime(2026, 9, 16);
        private const short OrderInDay = 6;
        private const short OtherOrderInDay = 7;

        private static SecretaryCompetitionEntryItem Entry(
            int entryId,
            int classInCompId,
            int riderId = Rider,
            int horseId = Horse,
            DateTime? classDate = null,
            short orderInDay = OrderInDay,
            string status = "Active",
            int competitionId = 78,
            string className = "")
        {
            return new SecretaryCompetitionEntryItem
            {
                EntryId = entryId,
                ClassInCompId = classInCompId,
                CompetitionId = competitionId,
                ClassName = string.IsNullOrEmpty(className) ? "Class " + classInCompId : className,
                ClassDate = classDate ?? Date,
                OrderInDay = orderInDay,
                RiderFederationMemberId = riderId,
                RiderName = "Rider " + riderId,
                HorseId = horseId,
                HorseName = "Horse " + horseId,
                EntryStatus = status,
                CreatedAt = new DateTime(2026, 1, 1).AddMinutes(entryId)
            };
        }

        // Test 1: same rider/horse/date/orderInDay, two different classes -> one run.
        [Fact]
        public void SameRiderHorseDateOrder_TwoClasses_OnePhysicalRun()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(10293, 1574),
                Entry(10294, 1576)
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.Duplicates.Should().BeEmpty();
            result.PhysicalRuns.Should().HaveCount(1);
            result.PhysicalRuns[0].EntryIds.Should().BeEquivalentTo(new[] { 10293, 10294 });
            result.PhysicalRuns[0].ClassInCompIds.Should().BeEquivalentTo(new[] { 1574, 1576 });
        }

        // Test 2: same key, three different classes -> one run.
        [Fact]
        public void SameRiderHorseDateOrder_ThreeClasses_OnePhysicalRun()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(1, 100),
                Entry(2, 101),
                Entry(3, 102)
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.PhysicalRuns.Should().HaveCount(1);
            result.PhysicalRuns[0].EntryIds.Should().HaveCount(3);
            result.PhysicalRuns[0].ClassInCompIds.Should().HaveCount(3);
        }

        // Test 3: different rider -> separate run.
        [Fact]
        public void DifferentRider_SeparateRuns()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(1, 100, riderId: Rider),
                Entry(2, 101, riderId: OtherRider)
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.PhysicalRuns.Should().HaveCount(2);
        }

        // Test 4: different horse -> separate run.
        [Fact]
        public void DifferentHorse_SeparateRuns()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(1, 100, horseId: Horse),
                Entry(2, 101, horseId: OtherHorse)
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.PhysicalRuns.Should().HaveCount(2);
        }

        // Test 5: different date -> separate run.
        [Fact]
        public void DifferentDate_SeparateRuns()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(1, 100, classDate: Date),
                Entry(2, 101, classDate: OtherDate)
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.PhysicalRuns.Should().HaveCount(2);
        }

        // Test 6: different orderInDay -> separate run.
        [Fact]
        public void DifferentOrderInDay_SeparateRuns()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(1, 100, orderInDay: OrderInDay),
                Entry(2, 101, orderInDay: OtherOrderInDay)
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.PhysicalRuns.Should().HaveCount(2);
        }

        // Test 7: one linked classification cancelled -> run remains with only
        // the active classification.
        [Fact]
        public void OneClassificationCancelled_RunRemainsWithActiveOnly()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(1, 100, status: "Active"),
                Entry(2, 101, status: "Cancelled")
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.PhysicalRuns.Should().HaveCount(1);
            result.PhysicalRuns[0].EntryIds.Should().BeEquivalentTo(new[] { 1 });
            result.PhysicalRuns[0].ClassInCompIds.Should().BeEquivalentTo(new[] { 100 });
        }

        // Test 8: all linked classifications cancelled -> no run.
        [Fact]
        public void AllClassificationsCancelled_NoRun()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(1, 100, status: "Cancelled"),
                Entry(2, 101, status: "CancelledAfterStart")
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.PhysicalRuns.Should().BeEmpty();
            result.Duplicates.Should().BeEmpty();
        }

        // Test 9 + 10: same rider/horse/ClassInCompId duplicated -> invalid
        // duplicate detected, exact entry ids returned.
        [Fact]
        public void SameRiderHorseClassInCompId_Duplicated_IsDetectedWithEntryIds()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(10487, 1480),
                Entry(10488, 1480),
                Entry(10489, 1480)
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.Duplicates.Should().HaveCount(1);
            result.Duplicates[0].EntryIds.Should().BeEquivalentTo(new[] { 10487, 10488, 10489 });
            result.Duplicates[0].ClassInCompId.Should().Be(1480);

            // Duplicated entries must never silently receive a draw position.
            result.PhysicalRuns.Should().BeEmpty();
        }

        [Fact]
        public void CancelledDuplicate_IsNotFlagged_OnlyActiveDuplicatesCount()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(1, 100, status: "Active"),
                Entry(2, 100, status: "Cancelled")
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.Duplicates.Should().BeEmpty();
            result.PhysicalRuns.Should().HaveCount(1);
            result.PhysicalRuns[0].EntryIds.Should().BeEquivalentTo(new[] { 1 });
        }

        // Test 28: fixture-equivalent entries (competition 78, entries
        // 10293/10294) resolve to one physical run.
        [Fact]
        public void FixtureEquivalentEntries_ResolveToOnePhysicalRun()
        {
            List<SecretaryCompetitionEntryItem> entries = new()
            {
                Entry(10293, 1574, riderId: 2307, horseId: 360, classDate: new DateTime(2026, 9, 15), orderInDay: 6,
                    className: "Open NRHA"),
                Entry(10294, 1576, riderId: 2307, horseId: 360, classDate: new DateTime(2026, 9, 15), orderInDay: 6,
                    className: "Novice Horse Open Level 1 NRHA")
            };

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(entries);

            result.PhysicalRuns.Should().HaveCount(1);
            PhysicalRunGroup run = result.PhysicalRuns[0];
            run.EntryIds.Should().BeEquivalentTo(new[] { 10293, 10294 });
            run.ClassLabels.Should().BeEquivalentTo(new[] { "Open NRHA", "Novice Horse Open Level 1 NRHA" });
            run.RiderFederationMemberId.Should().Be(2307);
            run.HorseId.Should().Be(360);
        }

        [Fact]
        public void EntryMissingClassDateOrOrderInDay_NeverMergesWithAnotherRow()
        {
            SecretaryCompetitionEntryItem noDate = Entry(1, 100);
            noDate.ClassDate = null;

            SecretaryCompetitionEntryItem noOrder = Entry(2, 101);
            noOrder.OrderInDay = null;

            PhysicalRunGroupingResult result = PhysicalRunGrouper.Group(new List<SecretaryCompetitionEntryItem> { noDate, noOrder });

            result.PhysicalRuns.Should().HaveCount(2);
        }
    }
}
