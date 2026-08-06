using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition.Entry;
using RideOnServer.BL.Services;

namespace RideOnServer.Tests
{
    // Pure, DB-free coverage of DrawOrderSaveValidator -- the replacement for
    // the old blanket "no two entries may share a DrawOrder" rule. A shared
    // DrawOrder is valid only when every entry sharing it resolves to the same
    // physical run. Test numbers map to the spec's SAVE VALIDATION concerns.
    public class DrawOrderSaveValidatorTests
    {
        private static SecretaryCompetitionEntryItem Entry(
            int entryId, int classInCompId, int riderId = 2307, int horseId = 360,
            DateTime? classDate = null, short orderInDay = 6, string status = "Active")
        {
            return new SecretaryCompetitionEntryItem
            {
                EntryId = entryId,
                ClassInCompId = classInCompId,
                CompetitionId = 78,
                ClassName = "Class " + classInCompId,
                ClassDate = classDate ?? new DateTime(2026, 9, 15),
                OrderInDay = orderInDay,
                RiderFederationMemberId = riderId,
                RiderName = "Rider " + riderId,
                HorseId = horseId,
                HorseName = "Horse " + horseId,
                EntryStatus = status,
                CreatedAt = new DateTime(2026, 1, 1).AddMinutes(entryId)
            };
        }

        [Fact]
        public void SameDrawOrder_ForSamePhysicalRun_IsAllowed()
        {
            List<SecretaryCompetitionEntryItem> scope = new()
            {
                Entry(10293, 1574),
                Entry(10294, 1576)
            };

            List<(int EntryId, short DrawOrder)> payload = new()
            {
                (10293, 7),
                (10294, 7)
            };

            Action act = () => DrawOrderSaveValidator.ValidateSave(scope, payload);

            act.Should().NotThrow();
        }

        // Reject: unrelated physical runs share one drawOrder.
        [Fact]
        public void SameDrawOrder_ForUnrelatedRuns_IsRejected()
        {
            List<SecretaryCompetitionEntryItem> scope = new()
            {
                Entry(1, 100, riderId: 2307, horseId: 360),
                Entry(2, 101, riderId: 4001, horseId: 999)
            };

            List<(int EntryId, short DrawOrder)> payload = new()
            {
                (1, 5),
                (2, 5)
            };

            Action act = () => DrawOrderSaveValidator.ValidateSave(scope, payload);

            act.Should().Throw<ValidationException>()
                .WithMessage("*unrelated physical runs*");
        }

        // Reject: one physical run assigned several different drawOrder values.
        [Fact]
        public void OnePhysicalRun_SplitAcrossMultipleDrawOrders_IsRejected()
        {
            List<SecretaryCompetitionEntryItem> scope = new()
            {
                Entry(10293, 1574),
                Entry(10294, 1576)
            };

            List<(int EntryId, short DrawOrder)> payload = new()
            {
                (10293, 7),
                (10294, 8)
            };

            Action act = () => DrawOrderSaveValidator.ValidateSave(scope, payload);

            act.Should().Throw<ValidationException>()
                .WithMessage("*more than one DrawOrder*");
        }

        // Reject: invalid same-class duplicate present in scope blocks the save.
        [Fact]
        public void InvalidDuplicateInScope_BlocksSave()
        {
            List<SecretaryCompetitionEntryItem> scope = new()
            {
                Entry(1, 100),
                Entry(2, 100) // same rider/horse/class as entry 1 -- invalid duplicate
            };

            List<(int EntryId, short DrawOrder)> payload = new()
            {
                (1, 1)
            };

            Action act = () => DrawOrderSaveValidator.ValidateSave(scope, payload);

            act.Should().Throw<ValidationException>()
                .WithMessage("*Duplicate active entries*");
        }

        // Reject: payload entry ids that do not belong to the requested scope
        // (covers inactive/cancelled and foreign entries alike, since both are
        // simply absent from the grouper's active run map).
        [Fact]
        public void PayloadEntryNotInScope_IsRejected()
        {
            List<SecretaryCompetitionEntryItem> scope = new()
            {
                Entry(1, 100)
            };

            List<(int EntryId, short DrawOrder)> payload = new()
            {
                (1, 1),
                (999, 1)
            };

            Action act = () => DrawOrderSaveValidator.ValidateSave(scope, payload);

            act.Should().Throw<ValidationException>()
                .WithMessage("*999*");
        }

        [Fact]
        public void CancelledEntryInPayload_IsRejected()
        {
            List<SecretaryCompetitionEntryItem> scope = new()
            {
                Entry(1, 100, status: "Cancelled")
            };

            List<(int EntryId, short DrawOrder)> payload = new()
            {
                (1, 1)
            };

            Action act = () => DrawOrderSaveValidator.ValidateSave(scope, payload);

            act.Should().Throw<ValidationException>()
                .WithMessage("*not active members*");
        }
    }
}
