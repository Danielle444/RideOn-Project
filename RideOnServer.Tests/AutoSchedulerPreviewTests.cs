using FluentAssertions;
using RideOnServer.BL.AutoScheduler;

namespace RideOnServer.Tests
{
    // Pin the pure, DB-free scheduling CALCULATION that the read-only Preview
    // (Stage A) reuses verbatim. These tests construct an in-memory SchedulerData
    // and call AutoScheduler.Schedule directly — no database, no writes.
    //
    // Scope note: these cover only the reused algorithm. Coverage of the NEW
    // Preview code introduced in Stage A — the fingerprint and the result→DTO
    // mapping — lives in AutoSchedulePreviewMappingTests, not here.
    public class AutoSchedulerPreviewTests
    {
        private static SchedulerSlot Slot(
            int id,
            bool isPublished = false,
            string start = "08:00:00",
            string end = "12:00:00",
            int capacityMinutes = 240)
        {
            return new SchedulerSlot
            {
                PaidTimeSlotInCompId = id,
                SlotDate = new DateTime(2026, 8, 1),
                StartTimeRaw = start,
                EndTimeRaw = end,
                TotalCapacityMinutes = capacityMinutes,
                ArenaRanchId = 11,
                ArenaId = 1,
                ArenaName = "Arena 1",
                IsPublished = isPublished
            };
        }

        private static SchedulerRequest PendingRequest(
            int id,
            int requestedSlotId,
            int durationMinutes = 11,
            int coachId = 7)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = 500 + id,
                CoachFederationMemberId = coachId,
                RiderFederationMemberId = 900 + id,
                DurationMinutes = durationMinutes,
                RequestedCompSlotId = requestedSlotId,
                Status = "Pending",
                SrequestDateTime = new DateTime(2026, 7, 20, 10, 0, 0).AddMinutes(id)
            };
        }

        [Fact]
        public void Schedule_FittingPendingCandidate_ProducesAssignedDecisionAtSlotStart()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1) },
                Requests = new List<SchedulerRequest> { PendingRequest(100, requestedSlotId: 1) }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            result.ScheduledCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(0);
            result.FrozenCount.Should().Be(0);

            result.Assignments.Should().HaveCount(1);
            AssignmentDecision decision = result.Assignments[0];
            decision.PaidTimeRequestId.Should().Be(100);
            decision.Status.Should().Be("Assigned");
            decision.AssignedCompSlotId.Should().Be(1);
            decision.AssignedOrder.Should().Be(1);
            decision.AssignedStartTime.Should().Be(new DateTime(2026, 8, 1, 8, 0, 0));
        }

        [Fact]
        public void Schedule_PublishedRequestedSlot_ProducesUnscheduledWithPublishedReason()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1, isPublished: true) },
                Requests = new List<SchedulerRequest> { PendingRequest(100, requestedSlotId: 1) }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            result.ScheduledCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);

            result.Assignments.Should().HaveCount(1);
            result.Assignments[0].Status.Should().Be("Pending");

            AuditLogEntry unscheduled = result.Audit.Single(a => a.Action == "unscheduled");
            unscheduled.PaidTimeRequestId.Should().Be(100);
            unscheduled.Reason.Should().Be("הסלוט המבוקש פורסם - שיבוץ ידני נדרש");
        }

        [Fact]
        public void Schedule_ExistingAssignedRequest_IsFrozen_EvenWithNoCandidates()
        {
            SchedulerRequest assigned = new SchedulerRequest
            {
                PaidTimeRequestId = 200,
                HorseId = 700,
                CoachFederationMemberId = 7,
                RiderFederationMemberId = 950,
                DurationMinutes = 11,
                RequestedCompSlotId = 1,
                AssignedCompSlotId = 1,
                AssignedStartTime = new DateTime(2026, 8, 1, 8, 0, 0),
                AssignedOrder = 1,
                Status = "Assigned",
                SrequestDateTime = new DateTime(2026, 7, 19, 10, 0, 0)
            };

            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1) },
                Requests = new List<SchedulerRequest> { assigned }
            };

            // Empty candidate set: nothing to schedule, but the existing assignment
            // must still surface as frozen (this is why Preview does not short-circuit
            // on an empty candidate set).
            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int>());

            result.FrozenCount.Should().Be(1);
            result.ScheduledCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(0);
            result.Assignments.Should().BeEmpty();

            AuditLogEntry frozen = result.Audit.Single(a => a.Action == "kept-frozen");
            frozen.PaidTimeRequestId.Should().Be(200);
        }
    }
}
