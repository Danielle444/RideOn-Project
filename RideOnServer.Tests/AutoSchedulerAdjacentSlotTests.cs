using System.Text.Json;
using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.AutoScheduler;

namespace RideOnServer.Tests
{
    // V2-1 same-day adjacent-slot fallback coverage for the pure, DB-free scheduling
    // engine (AutoScheduler.Schedule). Everything here builds an in-memory
    // SchedulerData and calls the engine directly — no database, no writes, no
    // harness. Apply parity is exercised through PaidTimeRequest.BuildVerifiedApplyPlan,
    // which is the same public, DB-free recomputation the real Apply path uses.
    //
    // Fixture conventions:
    //   - "full" slot   = capacityMinutes: 0  (the capacity gate trips immediately)
    //   - every ride is 11 effective minutes (durationminutes + 1)
    //   - the default day is 2026-08-01, the default arena is (11, 2)
    public class AutoSchedulerAdjacentSlotTests
    {
        private const string CapacityOrCoachReason = "אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)";
        private const string RiderReason = "אין מקום פנוי בסלוט המבוקש (הרוכב תפוס בזמן חופף)";
        private const string HorseReason = "אין מקום פנוי בסלוט המבוקש (הסוס תפוס בזמן חופף)";
        private const string PublishedReason = "הסלוט המבוקש פורסם - שיבוץ ידני נדרש";

        private const string Day = "2026-08-01";
        private const string PrevDay = "2026-07-31";
        private const string NextDay = "2026-08-02";

        private static SchedulerSlot Slot(
            int id,
            string date = Day,
            string start = "08:00:00",
            string end = "10:00:00",
            int arenaId = 2,
            bool isPublished = false,
            int capacityMinutes = 240)
        {
            return new SchedulerSlot
            {
                PaidTimeSlotInCompId = id,
                SlotDate = DateTime.Parse(date),
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
            int id, int requestedSlotId, int rider = 1, int horse = 1, int coach = 10, int durationMinutes = 11)
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
            int id, int slotId, string date = Day, string startTime = "08:00:00",
            int rider = 900, int horse = 900, int coach = 900, int order = 1, int durationMinutes = 11)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = horse,
                CoachFederationMemberId = coach,
                RiderFederationMemberId = rider,
                DurationMinutes = durationMinutes,
                RequestedCompSlotId = slotId,
                AssignedCompSlotId = slotId,
                AssignedStartTime = DateTime.Parse(date).Add(TimeSpan.Parse(startTime)),
                AssignedOrder = order,
                Status = "Assigned",
                SrequestDateTime = new DateTime(2026, 7, 18, 10, 0, 0)
            };
        }

        private static SchedulerData Data(List<SchedulerSlot> slots, List<SchedulerRequest> requests)
        {
            return new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 29, 9, 0, 0),
                Slots = slots,
                Requests = requests
            };
        }

        private static AssignmentDecision Decision(AutoScheduleResult result, int requestId)
        {
            return result.Assignments.Single(a => a.PaidTimeRequestId == requestId);
        }

        private static string UnscheduledReason(AutoScheduleResult result, int requestId)
        {
            return result.Audit.Single(a => a.Action == "unscheduled" && a.PaidTimeRequestId == requestId).Reason!;
        }

        // --- 1: requested slot has room -> placed there, PlacementKind = Requested ------------

        [Fact]
        public void RequestedSlotHasRoom_PlacedThere_AndNeighboursUntouched()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00"),
                    Slot(20, start: "10:00:00", end: "12:00:00"),
                    Slot(30, start: "12:00:00", end: "14:00:00")
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Assigned");
            d.AssignedCompSlotId.Should().Be(20);
            d.PlacementKind.Should().Be(PlacementKinds.Requested);
            d.AdjacentSlotsTried.Should().BeFalse();
            d.AssignedStartTime.Should().Be(new DateTime(2026, 8, 1, 10, 0, 0));

            result.ScheduledCount.Should().Be(1);
            result.Assignments.Should().OnlyContain(a => a.AssignedCompSlotId != 10 && a.AssignedCompSlotId != 30);
        }

        // --- 2: requested full -> immediate PREVIOUS same-day, same-arena slot ----------------

        [Fact]
        public void RequestedFull_UsesImmediatePreviousSameDaySlot()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00"),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0)
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Assigned");
            d.AssignedCompSlotId.Should().Be(10);
            d.PlacementKind.Should().Be(PlacementKinds.PreviousSameDay);
            // 14/15: the original preference is untouched; the allocation points at the fallback.
            data.Requests.Single(r => r.PaidTimeRequestId == 100).RequestedCompSlotId.Should().Be(20);
            d.AssignedStartTime.Should().Be(new DateTime(2026, 8, 1, 8, 0, 0));
            d.AssignedOrder.Should().Be(1);
            result.UnscheduledCount.Should().Be(0);
        }

        // --- 3: requested full, previous full -> immediate NEXT same-day slot ------------------

        [Fact]
        public void RequestedFull_PreviousFull_UsesImmediateNextSameDaySlot()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00", capacityMinutes: 0),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0),
                    Slot(30, start: "12:00:00", end: "14:00:00")
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.AssignedCompSlotId.Should().Be(30);
            d.PlacementKind.Should().Be(PlacementKinds.NextSameDay);
            d.AssignedStartTime.Should().Be(new DateTime(2026, 8, 1, 12, 0, 0));
        }

        // --- 4: a previous-DAY slot is never used --------------------------------------------

        [Fact]
        public void PreviousDaySlot_IsNeverUsedAsFallback()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    // Chronologically the closest slot of all, and wide open — still refused.
                    Slot(5, date: PrevDay, start: "22:00:00", end: "23:30:00"),
                    Slot(20, start: "08:00:00", end: "10:00:00", capacityMinutes: 0)
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Pending");
            d.AssignedCompSlotId.Should().BeNull();
            d.AdjacentSlotsTried.Should().BeFalse();
            UnscheduledReason(result, 100).Should().Be(CapacityOrCoachReason);
        }

        // --- 5: a next-DAY slot is never used -------------------------------------------------

        [Fact]
        public void NextDaySlot_IsNeverUsedAsFallback()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(20, start: "22:00:00", end: "23:30:00", capacityMinutes: 0),
                    Slot(40, date: NextDay, start: "00:00:00", end: "02:00:00")
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Pending");
            d.AssignedCompSlotId.Should().BeNull();
            d.AdjacentSlotsTried.Should().BeFalse();
        }

        // --- 6: first slot of a day has no previous, and never reaches the previous date ------

        [Fact]
        public void FirstSlotOfDay_HasNoPrevious_AndNeverReachesPreviousDate()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(5, date: PrevDay, start: "23:00:00", end: "23:59:00"),
                    Slot(10, start: "08:00:00", end: "10:00:00", capacityMinutes: 0),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0)
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 10) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Pending");
            d.AssignedCompSlotId.Should().BeNull();
            // The NEXT same-day slot was genuinely attempted (and was full).
            d.AdjacentSlotsTried.Should().BeTrue();
        }

        // --- 7: last slot of a day has no next, and never reaches the next date ---------------

        [Fact]
        public void LastSlotOfDay_HasNoNext_AndNeverReachesNextDate()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00", capacityMinutes: 0),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0),
                    Slot(40, date: NextDay, start: "00:00:00", end: "02:00:00")
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Pending");
            d.AssignedCompSlotId.Should().BeNull();
            d.AdjacentSlotsTried.Should().BeTrue();
        }

        // --- 8: a published neighbour is skipped, and index-2 is NOT tried instead ------------

        [Fact]
        public void PublishedNeighbour_IsSkipped_AndTwoPositionsAwayIsNotTried()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    // Wide open, but two positions away — must stay untouched.
                    Slot(10, start: "08:00:00", end: "10:00:00"),
                    Slot(20, start: "10:00:00", end: "12:00:00", isPublished: true),
                    Slot(30, start: "12:00:00", end: "14:00:00", capacityMinutes: 0)
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 30) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Pending");
            d.AssignedCompSlotId.Should().BeNull();
            // Nothing was ever attempted: the only neighbour was published.
            d.AdjacentSlotsTried.Should().BeFalse();
        }

        // --- 9: a different-arena neighbour is skipped (V2-1 is same-arena only) --------------

        [Fact]
        public void DifferentArenaNeighbour_IsSkipped()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00", arenaId: 3),
                    Slot(20, start: "10:00:00", end: "12:00:00", arenaId: 2, capacityMinutes: 0)
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Pending");
            d.AssignedCompSlotId.Should().BeNull();
            d.AdjacentSlotsTried.Should().BeFalse();
        }

        // --- 10/11/12: rider / horse / coach conflicts block an adjacent candidate ------------
        //
        // Shape: the requested slot (20) is full, its immediate previous neighbour (10) is a
        // single 11-minute window in the same arena, and an overlapping frozen ride sits in a
        // DIFFERENT arena (slot 50, ordered before slot 10 so it is never the neighbour).
        // Each case is asserted twice: once where the frozen ride shares the blocking entity
        // (=> fallback refused) and once where it does not (=> fallback taken). The contrast is
        // what proves the constraint did the blocking, rather than some unrelated gate.

        private static SchedulerData ConflictShape(int rider, int horse, int coach)
        {
            return Data(
                new List<SchedulerSlot>
                {
                    Slot(50, start: "07:55:00", end: "08:15:00", arenaId: 3),
                    Slot(10, start: "08:00:00", end: "08:11:00", arenaId: 2, capacityMinutes: 11),
                    Slot(20, start: "08:20:00", end: "10:00:00", arenaId: 2, capacityMinutes: 0)
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, slotId: 50, startTime: "08:00:00", rider: 5000, horse: 7000, coach: 9000),
                    Pending(100, requestedSlotId: 20, rider: rider, horse: horse, coach: coach)
                });
        }

        [Fact]
        public void RiderConflict_BlocksAdjacentCandidate()
        {
            AutoScheduleResult blocked = AutoScheduler.Schedule(
                ConflictShape(rider: 5000, horse: 1, coach: 10), new List<int> { 100 });
            AssignmentDecision blockedDecision = Decision(blocked, 100);
            blockedDecision.Status.Should().Be("Pending");
            blockedDecision.AdjacentSlotsTried.Should().BeTrue();

            AutoScheduleResult allowed = AutoScheduler.Schedule(
                ConflictShape(rider: 1, horse: 1, coach: 10), new List<int> { 100 });
            Decision(allowed, 100).AssignedCompSlotId.Should().Be(10);
            Decision(allowed, 100).PlacementKind.Should().Be(PlacementKinds.PreviousSameDay);
        }

        [Fact]
        public void HorseConflict_BlocksAdjacentCandidate()
        {
            AutoScheduleResult blocked = AutoScheduler.Schedule(
                ConflictShape(rider: 1, horse: 7000, coach: 10), new List<int> { 100 });
            Decision(blocked, 100).Status.Should().Be("Pending");
            Decision(blocked, 100).AdjacentSlotsTried.Should().BeTrue();

            AutoScheduleResult allowed = AutoScheduler.Schedule(
                ConflictShape(rider: 1, horse: 1, coach: 10), new List<int> { 100 });
            Decision(allowed, 100).AssignedCompSlotId.Should().Be(10);
        }

        [Fact]
        public void CoachConflict_BlocksAdjacentCandidate_IncludingCrossArenaTransition()
        {
            // The frozen ride is in arena 3 and the fallback slot is in arena 2, so the existing
            // 7-minute cross-arena transition is what fires here — unchanged V2-0 behavior,
            // applied to a fallback placement.
            AutoScheduleResult blocked = AutoScheduler.Schedule(
                ConflictShape(rider: 1, horse: 1, coach: 9000), new List<int> { 100 });
            Decision(blocked, 100).Status.Should().Be("Pending");
            Decision(blocked, 100).AdjacentSlotsTried.Should().BeTrue();

            AutoScheduleResult allowed = AutoScheduler.Schedule(
                ConflictShape(rider: 1, horse: 1, coach: 10), new List<int> { 100 });
            Decision(allowed, 100).AssignedCompSlotId.Should().Be(10);
        }

        // --- 13: an existing Assigned request is never moved by a fallback --------------------

        [Fact]
        public void ExistingAssignedRequest_IsNeverMovedByFallback()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00"),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0)
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, slotId: 10, startTime: "08:30:00", order: 4),
                    Pending(100, requestedSlotId: 20)
                });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            result.FrozenCount.Should().Be(1);
            // The frozen request gets an audit entry and NO decision — it is not a candidate.
            result.Assignments.Should().ContainSingle().Which.PaidTimeRequestId.Should().Be(100);
            AuditLogEntry frozen = result.Audit.Single(a => a.Action == "kept-frozen");
            frozen.PaidTimeRequestId.Should().Be(200);
            frozen.NewSlotId.Should().Be(10);
            frozen.NewStartTime.Should().Be(new DateTime(2026, 8, 1, 8, 30, 0));

            // The new request lands in the same slot, after the frozen occupant, order max+1.
            AssignmentDecision d = Decision(result, 100);
            d.AssignedCompSlotId.Should().Be(10);
            d.PlacementKind.Should().Be(PlacementKinds.PreviousSameDay);
            d.AssignedOrder.Should().Be(5);
            d.AssignedStartTime.Should().Be(new DateTime(2026, 8, 1, 8, 0, 0));
        }

        // --- 16: Apply recomputation selects exactly the same slot as the engine ---------------

        [Fact]
        public void ApplyRecomputation_SelectsSameFallbackSlotAsPreview()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00"),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0),
                    Slot(30, start: "12:00:00", end: "14:00:00")
                },
                new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 20),
                    Pending(101, requestedSlotId: 20, rider: 2, horse: 2, coach: 20)
                });

            List<int> candidates = new List<int> { 100, 101 };
            AutoScheduleResult engineResult = AutoScheduler.Schedule(data, candidates);

            string fingerprint = PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidates);
            AutoScheduleApplyPlan plan = PaidTimeRequest.BuildVerifiedApplyPlan(data, 41, fingerprint);

            string Shape(IEnumerable<AssignmentDecision> decisions) => string.Join(";", decisions
                .OrderBy(a => a.PaidTimeRequestId)
                .Select(a => $"{a.PaidTimeRequestId}:{a.Status}:{a.AssignedCompSlotId}:{a.AssignedStartTime:o}:{a.AssignedOrder}:{a.PlacementKind}"));

            Shape(plan.Decisions).Should().Be(Shape(engineResult.Assignments));
            // and the fallback really happened, so the parity assertion is not vacuous
            plan.Decisions.Should().Contain(a => a.PlacementKind != PlacementKinds.Requested);
        }

        // --- 17: the same snapshot run twice produces identical decisions ---------------------

        [Fact]
        public void SameSnapshot_RunTwice_ProducesIdenticalDecisions()
        {
            static SchedulerData Build() => Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00", capacityMinutes: 11),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0),
                    Slot(30, start: "12:00:00", end: "14:00:00", capacityMinutes: 11)
                },
                new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 20, rider: 1, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 20, rider: 2, horse: 2, coach: 20),
                    Pending(102, requestedSlotId: 20, rider: 3, horse: 3, coach: 30)
                });

            string first = JsonSerializer.Serialize(AutoScheduler.Schedule(Build(), new List<int> { 100, 101, 102 }));
            string second = JsonSerializer.Serialize(AutoScheduler.Schedule(Build(), new List<int> { 100, 101, 102 }));

            second.Should().Be(first);
        }

        // --- 18: the reason stays anchored to the REQUESTED slot's cause ----------------------

        [Fact]
        public void UnscheduledReason_StaysAnchoredToRequestedSlotCause()
        {
            // (a) requested slot fails on RIDER; the neighbour fails on capacity.
            //     A loop-order reason would report capacity — it must report rider.
            //     Slot 20 is a single free 11-minute window, so the rider gate is genuinely
            //     the thing that blocks it; slot 50 (arena 3) carries the conflicting ride and
            //     sorts before slot 20, so the only eligible neighbour is slot 10.
            SchedulerData riderFirst = Data(
                new List<SchedulerSlot>
                {
                    Slot(50, start: "09:55:00", end: "10:15:00", arenaId: 3),
                    Slot(20, start: "10:00:00", end: "10:11:00", arenaId: 2, capacityMinutes: 11),
                    Slot(10, start: "10:20:00", end: "12:00:00", arenaId: 2, capacityMinutes: 0)
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, slotId: 50, startTime: "10:00:00", rider: 5000, horse: 7000, coach: 9000),
                    Pending(100, requestedSlotId: 20, rider: 5000, horse: 1, coach: 10)
                });

            AutoScheduleResult riderResult = AutoScheduler.Schedule(riderFirst, new List<int> { 100 });
            Decision(riderResult, 100).Status.Should().Be("Pending");
            UnscheduledReason(riderResult, 100).Should().Be(RiderReason);
            Decision(riderResult, 100).AdjacentSlotsTried.Should().BeTrue();

            // (b) requested slot fails on CAPACITY; the neighbour fails on rider.
            //     A "deepest across all slots" reason would report rider — it must report capacity.
            SchedulerData capacityFirst = Data(
                new List<SchedulerSlot>
                {
                    Slot(50, start: "07:55:00", end: "08:15:00", arenaId: 3),
                    Slot(10, start: "08:00:00", end: "08:11:00", arenaId: 2, capacityMinutes: 11),
                    Slot(20, start: "08:20:00", end: "10:00:00", arenaId: 2, capacityMinutes: 0)
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, slotId: 50, startTime: "08:00:00", rider: 5000, horse: 7000, coach: 9000),
                    Pending(100, requestedSlotId: 20, rider: 5000, horse: 1, coach: 10)
                });

            AutoScheduleResult capacityResult = AutoScheduler.Schedule(capacityFirst, new List<int> { 100 });
            Decision(capacityResult, 100).Status.Should().Be("Pending");
            UnscheduledReason(capacityResult, 100).Should().Be(CapacityOrCoachReason);
            Decision(capacityResult, 100).AdjacentSlotsTried.Should().BeTrue();
        }

        // --- 19: the engine never places a request outside the snapshot's slot set ------------
        //
        // Honest scope note: true cross-competition isolation is enforced upstream by
        // usp_getautoschedulerdata (WHERE competitionid = ...) and downstream by
        // usp_applyautoschedule ('target slot % not in competition %'). At engine level the
        // provable property is that the engine only ever selects a slot it was handed.

        [Fact]
        public void Engine_OnlySelectsSlotsPresentInItsOwnSnapshot()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00"),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0)
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            HashSet<int> known = data.Slots.Select(s => s.PaidTimeSlotInCompId).ToHashSet();
            result.Assignments
                .Where(a => a.AssignedCompSlotId.HasValue)
                .Should().OnlyContain(a => known.Contains(a.AssignedCompSlotId!.Value));
        }

        // --- 20: a PUBLISHED requested slot yields RequestedSlotPublished and no fallback -----

        [Fact]
        public void PublishedRequestedSlot_ProducesPublishedReason_AndNoFallback()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00"),
                    Slot(20, start: "10:00:00", end: "12:00:00", isPublished: true),
                    Slot(30, start: "12:00:00", end: "14:00:00")
                },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100 });

            AssignmentDecision d = Decision(result, 100);
            d.Status.Should().Be("Pending");
            d.AssignedCompSlotId.Should().BeNull();
            d.AdjacentSlotsTried.Should().BeFalse();
            UnscheduledReason(result, 100).Should().Be(PublishedReason);
            // Both wide-open neighbours are untouched.
            result.ScheduledCount.Should().Be(0);
        }

        // --- 21: two-phase FIFO — a fallback never outranks a direct requester ----------------

        [Fact]
        public void TwoPhase_FallbackDoesNotDisplaceLaterDirectRequesterOfThatSlot()
        {
            // Slot 10 holds exactly one ride. Request 100 (earlier, FIFO first) wants the full
            // slot 20; request 101 (later) directly wants slot 10. Single-pass greedy would let
            // 100 take slot 10 in its fallback and strand 101. Two-phase must not.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(10, start: "08:00:00", end: "10:00:00", capacityMinutes: 11),
                    Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0)
                },
                new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 20, rider: 1, horse: 1, coach: 10),
                    Pending(101, requestedSlotId: 10, rider: 2, horse: 2, coach: 20)
                });

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int> { 100, 101 });

            AssignmentDecision direct = Decision(result, 101);
            direct.Status.Should().Be("Assigned");
            direct.AssignedCompSlotId.Should().Be(10);
            direct.PlacementKind.Should().Be(PlacementKinds.Requested);

            AssignmentDecision fallback = Decision(result, 100);
            fallback.Status.Should().Be("Pending");
            fallback.AdjacentSlotsTried.Should().BeTrue();
            UnscheduledReason(result, 100).Should().Be(CapacityOrCoachReason);
        }

        // --- deterministic ordering: adjacency does not depend on snapshot list order ---------

        [Fact]
        public void AdjacencyIsIndependentOfSnapshotListOrder()
        {
            List<SchedulerSlot> ordered = new List<SchedulerSlot>
            {
                Slot(10, start: "08:00:00", end: "10:00:00"),
                Slot(20, start: "10:00:00", end: "12:00:00", capacityMinutes: 0),
                Slot(30, start: "12:00:00", end: "14:00:00", capacityMinutes: 0)
            };
            List<SchedulerSlot> shuffled = new List<SchedulerSlot> { ordered[2], ordered[0], ordered[1] };

            AutoScheduleResult a = AutoScheduler.Schedule(
                Data(ordered, new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) }),
                new List<int> { 100 });
            AutoScheduleResult b = AutoScheduler.Schedule(
                Data(shuffled, new List<SchedulerRequest> { Pending(100, requestedSlotId: 20) }),
                new List<int> { 100 });

            Decision(a, 100).AssignedCompSlotId.Should().Be(10);
            Decision(b, 100).AssignedCompSlotId.Should().Be(10);
            Decision(b, 100).PlacementKind.Should().Be(PlacementKinds.PreviousSameDay);
        }
    }
}
