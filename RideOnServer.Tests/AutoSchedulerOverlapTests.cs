using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.AutoScheduler;
using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;

namespace RideOnServer.Tests
{
    // V2-0 rider/horse overlap coverage for the pure, DB-free scheduling engine
    // (AutoScheduler.Schedule). These build an in-memory SchedulerData and call the
    // engine directly — no database, no writes. Coach behavior is asserted to be
    // unchanged (same-arena overlap + 7-min cross-arena transition preserved).
    public class AutoSchedulerOverlapTests
    {
        private const string RiderReason = "אין מקום פנוי בסלוט המבוקש (הרוכב תפוס בזמן חופף)";
        private const string HorseReason = "אין מקום פנוי בסלוט המבוקש (הסוס תפוס בזמן חופף)";
        private const string CapacityOrCoachReason = "אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)";

        private static SchedulerSlot Slot(
            int id,
            int arenaId = 1,
            string start = "08:00:00",
            string end = "12:00:00",
            bool isPublished = false,
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
                ArenaId = arenaId,
                ArenaName = "Arena " + arenaId,
                IsPublished = isPublished
            };
        }

        // FIFO order follows SrequestDateTime; lower id => earlier => higher priority.
        private static SchedulerRequest Pending(
            int id, int requestedSlotId, int rider, int horse, int coach, int durationMinutes = 11)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = horse,
                CoachFederationMemberId = coach,
                RiderFederationMemberId = rider,
                DurationMinutes = durationMinutes,
                RequestedCompSlotId = requestedSlotId,
                Status = "Pending",
                SrequestDateTime = new DateTime(2026, 7, 20, 10, 0, 0).AddMinutes(id)
            };
        }

        private static SchedulerRequest Assigned(
            int id, int slotId, int rider, int horse, int coach,
            string startTime = "08:00:00", int order = 1, int durationMinutes = 11)
        {
            DateTime start = new DateTime(2026, 8, 1).Add(TimeSpan.Parse(startTime));
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = horse,
                CoachFederationMemberId = coach,
                RiderFederationMemberId = rider,
                DurationMinutes = durationMinutes,
                RequestedCompSlotId = slotId,
                AssignedCompSlotId = slotId,
                AssignedStartTime = start,
                AssignedOrder = order,
                Status = "Assigned",
                SrequestDateTime = new DateTime(2026, 7, 18, 10, 0, 0)
            };
        }

        private static string UnscheduledReason(AutoScheduleResult result, int requestId)
        {
            return result.Audit.Single(a => a.Action == "unscheduled" && a.PaidTimeRequestId == requestId).Reason!;
        }

        // --- 1: same rider, overlapping time, different horses -> 2nd unscheduled -------------

        [Fact]
        public void SameRider_Overlapping_DifferentHorses_SecondUnscheduled()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 5000, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 5000, horse: 2, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(1);
            result.Assignments.Single(a => a.PaidTimeRequestId == 100).Status.Should().Be("Assigned");
            result.Assignments.Single(a => a.PaidTimeRequestId == 101).Status.Should().Be("Pending");
            UnscheduledReason(result, 101).Should().Be(RiderReason);
        }

        // --- 2: same horse, overlapping time, different riders -> 2nd unscheduled -------------

        [Fact]
        public void SameHorse_Overlapping_DifferentRiders_SecondUnscheduled()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 1, horse: 7000, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 2, horse: 7000, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(1);
            UnscheduledReason(result, 101).Should().Be(HorseReason);
        }

        // --- 3: same rider, non-overlapping times -> both scheduled ---------------------------

        [Fact]
        public void SameRider_NonOverlapping_BothScheduled()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1, start: "08:00:00"), Slot(2, start: "09:00:00") },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 5000, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 5000, horse: 2, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(2);
            result.UnscheduledCount.Should().Be(0);
        }

        // --- 4: same horse, non-overlapping times -> both scheduled ---------------------------

        [Fact]
        public void SameHorse_NonOverlapping_BothScheduled()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1, start: "08:00:00"), Slot(2, start: "09:00:00") },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 1, horse: 7000, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 2, horse: 7000, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(2);
            result.UnscheduledCount.Should().Be(0);
        }

        // --- 5: different rider AND horse, same time -> both scheduled (coach/capacity allow) --

        [Fact]
        public void DifferentRiderAndHorse_SameTime_BothScheduled()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 1, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 2, horse: 2, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(2);
            result.UnscheduledCount.Should().Be(0);
        }

        // --- 6: rider conflict across DIFFERENT arenas -> rejected ----------------------------

        [Fact]
        public void SameRider_DifferentArenas_Overlapping_Rejected()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1, arenaId: 1), Slot(2, arenaId: 2) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 5000, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 5000, horse: 2, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(1);
            UnscheduledReason(result, 101).Should().Be(RiderReason);
        }

        // --- 7: horse conflict across DIFFERENT arenas -> rejected ----------------------------

        [Fact]
        public void SameHorse_DifferentArenas_Overlapping_Rejected()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1, arenaId: 1), Slot(2, arenaId: 2) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 1, horse: 7000, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 2, horse: 7000, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(1);
            UnscheduledReason(result, 101).Should().Be(HorseReason);
        }

        // --- 8: existing frozen assignment blocks a new request with the same rider ----------

        [Fact]
        public void FrozenAssignment_BlocksNewSameRider()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2) },
                Requests = new List<SchedulerRequest>
                {
                    Assigned(200, slotId: 1, rider: 5000, horse: 900, coach: 10),
                    Pending(100, requestedSlotId: 2, rider: 5000, horse: 2, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            result.FrozenCount.Should().Be(1);
            result.ScheduledCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
            UnscheduledReason(result, 100).Should().Be(RiderReason);
        }

        // --- 9: existing frozen assignment blocks a new request with the same horse ----------

        [Fact]
        public void FrozenAssignment_BlocksNewSameHorse()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2) },
                Requests = new List<SchedulerRequest>
                {
                    Assigned(200, slotId: 1, rider: 950, horse: 7000, coach: 10),
                    Pending(100, requestedSlotId: 2, rider: 2, horse: 7000, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            result.FrozenCount.Should().Be(1);
            result.ScheduledCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
            UnscheduledReason(result, 100).Should().Be(HorseReason);
        }

        // --- 10a: coach preserved — same coach, same arena, overlap -> unscheduled ------------

        [Fact]
        public void CoachPreserved_SameArena_Overlap_Unscheduled()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1, arenaId: 1), Slot(2, arenaId: 1) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 1, horse: 1, coach: 9000),
                    Pending(101, requestedSlotId: 2, rider: 2, horse: 2, coach: 9000)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(1);
            // A coach block (not rider/horse) keeps the existing combined reason.
            UnscheduledReason(result, 101).Should().Be(CapacityOrCoachReason);
        }

        // --- 10b: coach preserved — cross-arena within 7 min -> unscheduled -------------------

        [Fact]
        public void CoachPreserved_CrossArena_WithinTransition_Unscheduled()
        {
            // slot1 arena1 08:00-08:11 (dur 11). slot2 arena2 starts 08:11 (adjacent).
            // Cross-arena expands the frozen interval by 7 min -> conflict fires. Same-arena
            // would NOT conflict (half-open adjacency), so this pins the 7-min rule.
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot>
                {
                    Slot(1, arenaId: 1, start: "08:00:00"),
                    Slot(2, arenaId: 2, start: "08:11:00")
                },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 1, horse: 1, coach: 9000),
                    Pending(101, requestedSlotId: 2, rider: 2, horse: 2, coach: 9000)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(1);
            UnscheduledReason(result, 101).Should().Be(CapacityOrCoachReason);
        }

        // --- 10c: coach preserved — cross-arena with >=7 min gap -> both scheduled ------------

        [Fact]
        public void CoachPreserved_CrossArena_WithSufficientGap_BothScheduled()
        {
            // slot1 arena1 08:00-08:11; slot2 arena2 starts 08:18 (7-min gap). The 7-min
            // cross-arena expansion ends exactly at 08:18, so half-open leaves no overlap.
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot>
                {
                    Slot(1, arenaId: 1, start: "08:00:00"),
                    Slot(2, arenaId: 2, start: "08:18:00")
                },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 1, horse: 1, coach: 9000),
                    Pending(101, requestedSlotId: 2, rider: 2, horse: 2, coach: 9000)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(2);
            result.UnscheduledCount.Should().Be(0);
        }

        // --- 11: same snapshot is deterministic ----------------------------------------------

        [Fact]
        public void SameSnapshot_ProducesDeterministicOutput()
        {
            static SchedulerData Build() => new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 5000, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 5000, horse: 2, coach: 20)
                }
            };

            AutoScheduleResult a = AutoScheduler.Schedule(Build(), new List<int> { 100, 101 });
            AutoScheduleResult b = AutoScheduler.Schedule(Build(), new List<int> { 100, 101 });

            static string Key(AutoScheduleResult r) => string.Join(";", r.Assignments
                .OrderBy(x => x.PaidTimeRequestId)
                .Select(x => $"{x.PaidTimeRequestId}:{x.Status}:{x.AssignedCompSlotId}:{x.AssignedOrder}"));
            static string Audit(AutoScheduleResult r) => string.Join(";", r.Audit
                .OrderBy(x => x.PaidTimeRequestId).ThenBy(x => x.Action)
                .Select(x => $"{x.PaidTimeRequestId}:{x.Action}:{x.Reason}"));

            Key(b).Should().Be(Key(a));
            Audit(b).Should().Be(Audit(a));
        }

        // --- 12: a capacity failure is never mislabeled as rider/horse ------------------------

        [Fact]
        public void CapacityFailure_IsNotMislabeledAsRiderOrHorse()
        {
            // slot1 holds only one 11-min ride. The second request shares the rider, but the
            // capacity gate trips first -> must report the capacity/coach reason, not rider.
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1, capacityMinutes: 11) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 5000, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 1, rider: 5000, horse: 2, coach: 20)
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            result.ScheduledCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(1);
            UnscheduledReason(result, 101).Should().Be(CapacityOrCoachReason);
        }

        // --- 13: reason codes map to RiderConflict / HorseConflict via MapPreviewResponse -----

        [Fact]
        public void MapPreviewResponse_MapsRiderAndHorseConflict_ReasonCodes()
        {
            SchedulerData riderData = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 5000, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 5000, horse: 2, coach: 20)
                }
            };
            List<int> riderCandidates = new List<int> { 100, 101 };
            AutoScheduleResult riderResult = AutoScheduler.Schedule(riderData, riderCandidates);
            AutoSchedulePreviewResponse riderPreview = PaidTimeRequest.MapPreviewResponse(
                riderResult, riderData,
                PaidTimeRequest.ComputeAutoScheduleFingerprint(riderData, riderCandidates));
            riderPreview.UnscheduledItems.Single().ReasonCode.Should().Be("RiderConflict");

            SchedulerData horseData = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, rider: 1, horse: 7000, coach: 10),
                    Pending(101, requestedSlotId: 2, rider: 2, horse: 7000, coach: 20)
                }
            };
            List<int> horseCandidates = new List<int> { 100, 101 };
            AutoScheduleResult horseResult = AutoScheduler.Schedule(horseData, horseCandidates);
            AutoSchedulePreviewResponse horsePreview = PaidTimeRequest.MapPreviewResponse(
                horseResult, horseData,
                PaidTimeRequest.ComputeAutoScheduleFingerprint(horseData, horseCandidates));
            horsePreview.UnscheduledItems.Single().ReasonCode.Should().Be("HorseConflict");
        }
    }
}
