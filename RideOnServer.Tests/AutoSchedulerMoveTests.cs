using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.AutoScheduler;

namespace RideOnServer.Tests
{
    // V2-2 coverage: controlled movement of existing unpublished assignments.
    // Everything here builds an in-memory SchedulerData and calls the pure engine
    // (or the pure Apply gate) directly — no database, no writes, no harness.
    //
    // Fixture conventions:
    //   - every ride is 11 effective minutes (durationminutes + 1)
    //   - a "single-seat" slot is an 11-minute window with capacityMinutes 11
    //   - the default day is 2026-08-01, the default arena is (11, 2)
    //   - a PUBLISHED arena-3 slot spanning 06:00-23:00 ("blocker slot") is used to
    //     park frozen rows whose rider/horse blocks a specific time window. It sorts
    //     FIRST in the day (06:00) and is published, so it is skipped as a neighbour
    //     and never perturbs the arena-2 adjacency chain under test.
    public class AutoSchedulerMoveTests
    {
        private const string Day = "2026-08-01";

        private static SchedulerSlot Slot(
            int id,
            string start,
            string end,
            int capacityMinutes = 11,
            bool isPublished = false,
            int arenaId = 2,
            string date = Day)
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

        // The published arena-3 slot used to host time-blocking frozen rows.
        private static SchedulerSlot BlockerSlot(int id = 90)
        {
            return Slot(id, "06:00:00", "23:00:00", capacityMinutes: 1020,
                isPublished: true, arenaId: 3);
        }

        private static SchedulerRequest Pending(
            int id, int requestedSlotId,
            int rider = 0, int horse = 0, int coach = 0, int durationMinutes = 11)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = horse == 0 ? 6000 + id : horse,
                CoachFederationMemberId = coach == 0 ? 7000 + id : coach,
                RiderFederationMemberId = rider == 0 ? 5000 + id : rider,
                DurationMinutes = durationMinutes,
                RequestedCompSlotId = requestedSlotId,
                Status = "Pending",
                SrequestDateTime = new DateTime(2026, 7, 20, 10, 0, 0).AddMinutes(id)
            };
        }

        private static SchedulerRequest Assigned(
            int id, int requestedSlotId, int assignedSlotId, string startTime,
            int order = 1, string? origin = null,
            int rider = 0, int horse = 0, int coach = 0,
            string date = Day, int durationMinutes = 11)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = horse == 0 ? 6000 + id : horse,
                CoachFederationMemberId = coach == 0 ? 7000 + id : coach,
                RiderFederationMemberId = rider == 0 ? 5000 + id : rider,
                DurationMinutes = durationMinutes,
                RequestedCompSlotId = requestedSlotId,
                AssignedCompSlotId = assignedSlotId,
                AssignedStartTime = DateTime.Parse(date).Add(TimeSpan.Parse(startTime)),
                AssignedOrder = order,
                AllocationOrigin = origin,
                Status = "Assigned",
                // Existing assignments are always older than the pending candidates.
                SrequestDateTime = new DateTime(2026, 7, 18, 10, 0, 0).AddMinutes(id)
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

        private static List<int> Candidates(SchedulerData data)
        {
            return data.Requests
                .Where(r => r.Status == "Pending" && r.AssignedCompSlotId == null)
                .Select(r => r.PaidTimeRequestId)
                .ToList();
        }

        private static AutoScheduleResult Run(SchedulerData data)
        {
            return AutoScheduler.Schedule(data, Candidates(data), allowMovement: true);
        }

        private static AssignmentDecision Decision(AutoScheduleResult r, int id)
        {
            return r.Assignments.Single(a => a.PaidTimeRequestId == id);
        }

        private static DateTime At(string time, string date = Day)
        {
            return DateTime.Parse(date).Add(TimeSpan.Parse(time));
        }

        // =====================================================================
        // The linear "corridor" fixture.
        //
        // A published arena-3 blocker slot (sorts first, skipped as a neighbour),
        // then N single-seat arena-2 slots one hour apart. Each existing assignment
        // sits in its OWN requested slot, so its candidate set is {current, prev,
        // next} — a strict path. The pending request R also requests S1 and is
        // blocked at S2 by a rider conflict with a frozen row, so the ONLY way to
        // schedule R is to push the whole corridor forward by one.
        // =====================================================================
        private const int BlockerId = 90;
        private const int RiderBlockedAt9 = 5555;

        private static List<SchedulerSlot> Corridor(int slotCount)
        {
            List<SchedulerSlot> slots = new List<SchedulerSlot> { BlockerSlot(BlockerId) };
            for (int i = 1; i <= slotCount; i++)
            {
                int hour = 7 + i;   // S1 -> 08:00, S2 -> 09:00, ...
                slots.Add(Slot(i, $"{hour:00}:00:00", $"{hour:00}:11:00"));
            }
            return slots;
        }

        // Frozen row parked in the published blocker slot, holding R's rider at 09:00
        // so R can never take S2 — its only alternative to S1.
        private static SchedulerRequest RiderBlockerAtNine()
        {
            return Assigned(300, requestedSlotId: BlockerId, assignedSlotId: BlockerId,
                startTime: "09:00:00", rider: RiderBlockedAt9);
        }

        // =====================================================================
        // 1. Core: an existing assignment steps aside so an extra request fits
        // =====================================================================

        [Fact]
        public void MovableAssignment_StepsAside_SoAnExtraRequestIsScheduled()
        {
            // S1 occupied by A; S2 published (so it is frozen AND ineligible as a
            // neighbour); S3 free. A requested S2, so A can legally sit in S1 (prev)
            // and can legally move to S3 (next). R requested S1 and has S1 as its
            // ONLY candidate, because its only neighbour S2 is published.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00"),
                    Assigned(300, requestedSlotId: 2, assignedSlotId: 2, startTime: "09:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.ScheduledCount.Should().Be(1);
            result.MovedCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(0);
            result.FrozenCount.Should().Be(1);      // 300, sitting in a published slot
            result.UnchangedCount.Should().Be(0);

            AssignmentDecision placed = Decision(result, 100);
            placed.Status.Should().Be("Assigned");
            placed.ChangeKind.Should().Be(ChangeKinds.NewAssignment);
            placed.AssignedCompSlotId.Should().Be(1);
            placed.AllocationOrigin.Should().Be("Auto");

            AssignmentDecision moved = Decision(result, 200);
            moved.ChangeKind.Should().Be(ChangeKinds.Moved);
            moved.PreviousAssignedCompSlotId.Should().Be(1);
            moved.PreviousAssignedStartTime.Should().Be(At("08:00:00"));
            moved.AssignedCompSlotId.Should().Be(3);
            moved.AssignedStartTime.Should().Be(At("10:00:00"));

            // The published-slot row is frozen: no decision at all, and an audit
            // entry carrying the structured reason.
            result.Assignments.Select(a => a.PaidTimeRequestId).Should().NotContain(300);
            result.Audit.Single(a => a.Action == "kept-frozen" && a.PaidTimeRequestId == 300)
                .FrozenReason.Should().Be(FrozenReasons.PublishedSlot);
        }

        // =====================================================================
        // 2. allocationorigin is preserved exactly — including NULL
        // =====================================================================

        [Fact]
        public void MovedAssignment_PreservesManualAllocationOrigin()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1,
                        startTime: "08:00:00", origin: "Manual"),
                    Pending(100, requestedSlotId: 1)
                });

            AssignmentDecision moved = Decision(Run(data), 200);

            moved.ChangeKind.Should().Be(ChangeKinds.Moved);
            moved.PreviousAllocationOrigin.Should().Be("Manual");
            // Never overwritten with "Auto": the evidence that a human placed this
            // row is the only record of it that exists.
            moved.AllocationOrigin.Should().Be("Manual");
        }

        [Fact]
        public void MovedAssignment_PreservesNullAllocationOrigin()
        {
            // NULL is the single most common origin in live data, so "preserve"
            // has to mean NULL -> NULL, not NULL -> "Auto".
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1,
                        startTime: "08:00:00", origin: null),
                    Pending(100, requestedSlotId: 1)
                });

            AssignmentDecision moved = Decision(Run(data), 200);

            moved.ChangeKind.Should().Be(ChangeKinds.Moved);
            moved.PreviousAllocationOrigin.Should().BeNull();
            moved.AllocationOrigin.Should().BeNull();
        }

        // =====================================================================
        // 3. Payment cannot influence movability — structurally
        // =====================================================================

        [Fact]
        public void SchedulerSnapshot_CarriesNoPaymentField_SoPaymentCannotAffectMovability()
        {
            // Approved business decision: payment does NOT freeze scheduling. The
            // guarantee is structural rather than conditional — the scheduler
            // snapshot has no payment field at all, so neither the movability
            // classification nor the fingerprint can consult one.
            IEnumerable<string> properties = typeof(SchedulerRequest)
                .GetProperties()
                .Select(p => p.Name.ToLowerInvariant());

            properties.Should().NotContain(n => n.Contains("payment"));
            properties.Should().NotContain(n => n.Contains("paid") && n.Contains("by"));
        }

        [Fact]
        public void ManualPaidStyleAssignment_IsStillMovable_WhenItsSlotIsUnpublished()
        {
            // The row a secretary placed by hand (allocationorigin = 'Manual') is the
            // one the live transfer proc would refuse to move if it were paid. The
            // scheduler moves it, by approved decision; only publication freezes.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1,
                        startTime: "08:00:00", origin: "Manual"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(1);
            result.FrozenCount.Should().Be(0);
        }

        // =====================================================================
        // 4. Frozen classification
        // =====================================================================

        [Fact]
        public void AssignmentInPublishedSlot_IsFrozen_AndNeverMoves()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00", isPublished: true),
                    Slot(2, "09:00:00", "09:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.FrozenCount.Should().Be(1);
            result.Audit.Single(a => a.Action == "kept-frozen")
                .FrozenReason.Should().Be(FrozenReasons.PublishedSlot);
            result.Assignments.Select(a => a.PaidTimeRequestId).Should().NotContain(200);
        }

        // =====================================================================
        // 4a. A published frozen assignment coexists with a legal movement
        //
        // The rule has two halves and both must hold: a published assignment is
        // frozen and stays exactly as it is, AND its mere presence must not block a
        // legal Apply touching other, unpublished slots. Slot 90 is published and
        // holds row 300; slots 1/2/3 carry an ordinary "step aside" chain.
        // =====================================================================
        private static SchedulerData PublishedFrozenPlusLegalChain()
        {
            return Data(
                new List<SchedulerSlot>
                {
                    Slot(90, "07:00:00", "07:11:00", isPublished: true),
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(300, requestedSlotId: 90, assignedSlotId: 90,
                        startTime: "07:00:00", order: 4, origin: "Manual"),
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });
        }

        [Fact]
        public void PublishedFrozenAssignment_DoesNotBlockALegalApplyElsewhere()
        {
            AutoScheduleResult result = Run(PublishedFrozenPlusLegalChain());

            // The whole point: the chain in the unpublished slots still runs.
            result.ScheduledCount.Should().Be(1);
            result.MovedCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(0);

            Decision(result, 100).AssignedCompSlotId.Should().Be(1);
            Decision(result, 200).AssignedCompSlotId.Should().Be(3);
        }

        [Fact]
        public void PublishedFrozenAssignment_StaysExactlyAsItIs()
        {
            SchedulerData data = PublishedFrozenPlusLegalChain();
            AutoScheduleResult result = Run(data);

            // No decision at all is emitted for it — it is not part of any plan.
            result.Assignments.Select(a => a.PaidTimeRequestId).Should().NotContain(300);

            AuditLogEntry frozen = result.Audit
                .Single(a => a.Action == "kept-frozen" && a.PaidTimeRequestId == 300);
            frozen.FrozenReason.Should().Be(FrozenReasons.PublishedSlot);
            frozen.NewSlotId.Should().Be(90);
            frozen.NewStartTime.Should().Be(At("07:00:00"));

            // Slot, start, order, status and origin all unchanged on the snapshot row.
            SchedulerRequest row = data.Requests.Single(r => r.PaidTimeRequestId == 300);
            row.AssignedCompSlotId.Should().Be(90);
            row.AssignedStartTime.Should().Be(At("07:00:00"));
            row.AssignedOrder.Should().Be(4);
            row.Status.Should().Be("Assigned");
            row.AllocationOrigin.Should().Be("Manual");
        }

        [Fact]
        public void WritePlan_NeverIncludesAPublishedFrozenRequest_AndAuditsNothingForIt()
        {
            SchedulerData data = PublishedFrozenPlusLegalChain();
            string fingerprint =
                PaidTimeRequest.ComputeAutoScheduleFingerprint(data, Candidates(data));

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.WritePlan.Items.Select(i => i.PaidTimeRequestId)
                .Should().BeEquivalentTo(new[] { 100, 200 });
            plan.WritePlan.Items.Select(i => i.PaidTimeRequestId).Should().NotContain(300);

            // The SP audits ONLY items with changeKind 'Moved'. Since 300 is not in the
            // plan at all, no audit row for it can exist — proven at the payload level.
            plan.WritePlan.Items
                .Where(i => i.ChangeKind == ChangeKinds.Moved)
                .Select(i => i.PaidTimeRequestId)
                .Should().BeEquivalentTo(new[] { 200 });
        }

        [Fact]
        public void PublishedFrozenAssignment_Alone_ProducesAnEmptyWritePlan()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot> { Slot(90, "07:00:00", "07:11:00", isPublished: true) },
                new List<SchedulerRequest>
                {
                    Assigned(300, requestedSlotId: 90, assignedSlotId: 90,
                        startTime: "07:00:00", order: 4, origin: "Manual")
                });

            string fingerprint =
                PaidTimeRequest.ComputeAutoScheduleFingerprint(data, Candidates(data));

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.WritePlan.Items.Should().BeEmpty();
            plan.WritePlan.ExpectedWriteSetCount.Should().Be(0);
            plan.Result.FrozenCount.Should().Be(1);
            plan.Result.MovedCount.Should().Be(0);
        }

        [Fact]
        public void AssignmentOutsideTheAdjacentRange_IsFrozenAsOutOfScope()
        {
            // Assigned to S4 but requested S1: S4 is neither S1 nor either of its
            // immediate neighbours, so "stay put" is not expressible inside the
            // V2-2 movement space and the row must not be touched at all.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00"),
                    Slot(3, "10:00:00", "10:11:00"),
                    Slot(4, "11:00:00", "11:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 4, startTime: "11:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.FrozenCount.Should().Be(1);
            result.MovedCount.Should().Be(0);
            result.Audit.Single(a => a.Action == "kept-frozen")
                .FrozenReason.Should().Be(FrozenReasons.OutOfScopePlacement);
        }

        // =====================================================================
        // 4b. Unsafe legacy slots
        //
        // A slot holding ANY Assigned row with a NULL assignedstarttime has an
        // unverifiable occupancy: that row seeds no timeline, so the slot's real
        // interval, capacity and bounds state is unknown. V2-2 therefore removes the
        // WHOLE slot from the automatic scope — nothing enters it, nothing leaves it,
        // nothing moves inside it. Real live shape: competition 7 slot 37 holds five
        // such rows at gapped orders 3/4/5/7/10.
        // =====================================================================

        // A legacy row: Assigned, holding an order, with no start time.
        private static SchedulerRequest LegacyNoStart(int id, int requestedSlotId, int assignedSlotId, int order)
        {
            SchedulerRequest legacy = Assigned(id, requestedSlotId, assignedSlotId,
                startTime: "08:00:00", order: order);
            legacy.AssignedStartTime = null;
            return legacy;
        }

        [Fact]
        public void AssignedWithoutStartTime_IsFrozenAsNoStartTime()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22) },
                new List<SchedulerRequest>
                {
                    LegacyNoStart(200, requestedSlotId: 1, assignedSlotId: 1, order: 3),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.Audit.Single(a => a.Action == "kept-frozen" && a.PaidTimeRequestId == 200)
                .FrozenReason.Should().Be(FrozenReasons.NoStartTime);
        }

        [Fact]
        public void PendingRequest_IsNotPlacedIntoASlotHoldingANullStartAssignedRow()
        {
            // The slot has two seats and the legacy row seeds no occupancy at all, so a
            // naive engine would happily place the request at 08:00. It must not: the
            // slot's true occupancy is unknown.
            SchedulerData data = Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22) },
                new List<SchedulerRequest>
                {
                    LegacyNoStart(200, requestedSlotId: 1, assignedSlotId: 1, order: 3),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.ScheduledCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
            Decision(result, 100).Status.Should().Be("Pending");

            // Truthful reporting: the ordinary requested-slot reason, and no claim that
            // a movement search succeeded or was even meaningful here.
            result.Audit.Single(a => a.Action == "unscheduled").Reason
                .Should().Be("אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)");
            Decision(result, 100).MovementAttempted.Should().BeFalse();
        }

        [Fact]
        public void MovedRequest_CanNeverTargetAnUnsafeLegacySlot()
        {
            // Identical to the core "step aside" fixture, except S3 — 200's only escape
            // route — now holds a legacy row. The move must not happen, so R stays
            // unscheduled rather than 200 being pushed into an unverifiable slot.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:22:00", capacityMinutes: 22)
                },
                new List<SchedulerRequest>
                {
                    LegacyNoStart(300, requestedSlotId: 3, assignedSlotId: 3, order: 5),
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.ScheduledCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
            // 200 itself is still perfectly movable in principle — it just has nowhere
            // legal to go — so it is reported as unchanged, not frozen.
            result.UnchangedCount.Should().Be(1);
        }

        [Fact]
        public void RowInAnUnsafeLegacySlot_IsFrozen_AndCannotJoinAnEjectionChain()
        {
            // 200 is a perfectly healthy assignment, but it shares slot 1 with a legacy
            // row. It must be frozen (UnsafeLegacySlot) rather than movable, so no
            // ejection chain can lift it to make room for R.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00")
                },
                new List<SchedulerRequest>
                {
                    LegacyNoStart(300, requestedSlotId: 1, assignedSlotId: 1, order: 9),
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.ScheduledCount.Should().Be(0);
            result.UnchangedCount.Should().Be(0);
            result.FrozenCount.Should().Be(2);

            result.Audit.Single(a => a.Action == "kept-frozen" && a.PaidTimeRequestId == 300)
                .FrozenReason.Should().Be(FrozenReasons.NoStartTime);
            // The healthy neighbour is frozen for the SLOT's defect, not its own —
            // reported distinctly so the Preview does not misdescribe it.
            result.Audit.Single(a => a.Action == "kept-frozen" && a.PaidTimeRequestId == 200)
                .FrozenReason.Should().Be(FrozenReasons.UnsafeLegacySlot);

            // No chain was even attempted: the slot has no movable occupant.
            Decision(result, 100).MovementAttempted.Should().BeFalse();
        }

        [Fact]
        public void PublishedSlotReasonStillWins_OverTheUnsafeLegacyReason()
        {
            // A published slot that also holds a legacy row: publication is the more
            // fundamental freeze and must remain the reported reason.
            SchedulerData data = Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22, isPublished: true) },
                new List<SchedulerRequest>
                {
                    LegacyNoStart(300, requestedSlotId: 1, assignedSlotId: 1, order: 9),
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 1, startTime: "08:00:00")
                });

            AutoScheduleResult result = Run(data);

            result.Audit.Single(a => a.Action == "kept-frozen" && a.PaidTimeRequestId == 200)
                .FrozenReason.Should().Be(FrozenReasons.PublishedSlot);
        }

        [Fact]
        public void UnrelatedSlotsInTheSameCompetition_StayFullyUsable()
        {
            // The legacy row quarantines its OWN slot only. A request whose candidates
            // are elsewhere is scheduled normally, and a movement in a clean corridor
            // still happens.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00"),
                    // The quarantined slot, far away in the ordering and in nobody's
                    // candidate set.
                    Slot(9, "20:00:00", "20:22:00", capacityMinutes: 22)
                },
                new List<SchedulerRequest>
                {
                    LegacyNoStart(300, requestedSlotId: 9, assignedSlotId: 9, order: 4),
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            // The clean corridor still works exactly as in the core test.
            result.ScheduledCount.Should().Be(1);
            result.MovedCount.Should().Be(1);
            Decision(result, 100).AssignedCompSlotId.Should().Be(1);
            Decision(result, 200).AssignedCompSlotId.Should().Be(3);

            // And the legacy row is quarantined, not silently dropped.
            result.Audit.Single(a => a.Action == "kept-frozen" && a.PaidTimeRequestId == 300)
                .FrozenReason.Should().Be(FrozenReasons.NoStartTime);
        }

        [Fact]
        public void BulkPath_IsUnaffectedByTheUnsafeLegacySlotPolicy()
        {
            // The quarantine is a V2-2 rule. The deployed bulk path keeps its exact
            // V2-1 behaviour, including placing into a slot that holds a legacy row.
            SchedulerData data = Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22) },
                new List<SchedulerRequest>
                {
                    LegacyNoStart(200, requestedSlotId: 1, assignedSlotId: 1, order: 3),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = AutoScheduler.Schedule(data, Candidates(data));

            result.ScheduledCount.Should().Be(1);
            Decision(result, 100).AssignedCompSlotId.Should().Be(1);
            // max+1 over the legacy row's order 3.
            Decision(result, 100).AssignedOrder.Should().Be(4);
        }

        // =====================================================================
        // 5. No movement without a strict gain
        // =====================================================================

        [Fact]
        public void RequestThatFitsDirectly_CausesNoMovement()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22) },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.ScheduledCount.Should().Be(1);
            result.MovedCount.Should().Be(0);
            result.UnchangedCount.Should().Be(1);
            result.Audit.Should().Contain(a => a.Action == "kept-unchanged" && a.PaidTimeRequestId == 200);
        }

        [Fact]
        public void PreferenceOnlyImprovement_IsNeverTaken()
        {
            // 200 sits in S2 as a next-same-day fallback while its REQUESTED slot S1
            // is free. Moving it back to S1 would be a pure preference improvement
            // and schedules nobody new, so V2-2 must leave it exactly where it is.
            // (Equal-count preference improvement is deferred to V2-3.)
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 2, startTime: "09:00:00")
                });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.UnchangedCount.Should().Be(1);
            result.Assignments.Should().BeEmpty();
        }

        // =====================================================================
        // 6. Swap and cascade
        // =====================================================================

        [Fact]
        public void TwoAssignments_SwapSlots_SoAnExtraRequestIsScheduled()
        {
            // SX has two seats, SY one. A(SX) requested SY; B(SY) requested SX — each
            // is already in the other's slot. The frozen blocker holds R's rider AND
            // A's horse across 08:11-08:22, so neither R nor A can use SX's second
            // seat, but B can. The only way to schedule R is a genuine 2-cycle.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    BlockerSlot(BlockerId),
                    Slot(10, "08:00:00", "08:22:00", capacityMinutes: 22),
                    Slot(20, "09:00:00", "09:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(300, requestedSlotId: BlockerId, assignedSlotId: BlockerId,
                        startTime: "08:11:00", rider: 55, horse: 66, coach: 77),
                    Assigned(200, requestedSlotId: 20, assignedSlotId: 10,
                        startTime: "08:00:00", rider: 20, horse: 66, coach: 21),
                    Assigned(201, requestedSlotId: 10, assignedSlotId: 20,
                        startTime: "09:00:00", rider: 30, horse: 31, coach: 32),
                    Pending(100, requestedSlotId: 10, rider: 55, horse: 10, coach: 11)
                });

            AutoScheduleResult result = Run(data);

            result.ScheduledCount.Should().Be(1);
            result.MovedCount.Should().Be(2);
            result.UnscheduledCount.Should().Be(0);

            Decision(result, 100).AssignedCompSlotId.Should().Be(10);
            Decision(result, 100).AssignedStartTime.Should().Be(At("08:00:00"));

            AssignmentDecision a = Decision(result, 200);
            a.ChangeKind.Should().Be(ChangeKinds.Moved);
            a.PreviousAssignedCompSlotId.Should().Be(10);
            a.AssignedCompSlotId.Should().Be(20);

            AssignmentDecision b = Decision(result, 201);
            b.ChangeKind.Should().Be(ChangeKinds.Moved);
            b.PreviousAssignedCompSlotId.Should().Be(20);
            b.AssignedCompSlotId.Should().Be(10);
        }

        [Fact]
        public void ThreeAssignments_CascadeForward_SoAnExtraRequestIsScheduled()
        {
            // Corridor S1..S4 with S4 free. R is blocked at S2 by the rider blocker,
            // so R must take S1, pushing A->S2, B->S3, C->S4: three displaced rows,
            // exactly MAX_CHAIN_DEPTH.
            List<SchedulerSlot> slots = Corridor(4);

            SchedulerData data = Data(slots, new List<SchedulerRequest>
            {
                RiderBlockerAtNine(),
                Assigned(200, requestedSlotId: 1, assignedSlotId: 1, startTime: "08:00:00"),
                Assigned(201, requestedSlotId: 2, assignedSlotId: 2, startTime: "09:00:00"),
                Assigned(202, requestedSlotId: 3, assignedSlotId: 3, startTime: "10:00:00"),
                Pending(100, requestedSlotId: 1, rider: RiderBlockedAt9)
            });

            AutoScheduleResult result = Run(data);

            result.ScheduledCount.Should().Be(1);
            result.MovedCount.Should().Be(3);
            result.UnscheduledCount.Should().Be(0);

            Decision(result, 100).AssignedCompSlotId.Should().Be(1);
            Decision(result, 200).AssignedCompSlotId.Should().Be(2);
            Decision(result, 201).AssignedCompSlotId.Should().Be(3);
            Decision(result, 202).AssignedCompSlotId.Should().Be(4);
        }

        // =====================================================================
        // 7. The bounded-search limitation, made explicit and testable
        // =====================================================================

        [Fact]
        public void LegalSolutionBeyondMaxChainDepth_IsIntentionallyNotFound()
        {
            // Corridor S1..S5 with S5 free. A legal plan EXISTS and is unique:
            //   R -> S1, 200 -> S2, 201 -> S3, 202 -> S4, 203 -> S5
            // It displaces FOUR existing assignments. MAX_CHAIN_DEPTH is 3, so the
            // engine deliberately stops one step short and leaves R unscheduled.
            //
            // This is the documented product limitation of the bounded best-effort
            // search: it never claims a global maximum. The corridor is a strict
            // path (each row sits in its own requested slot, so its only forward
            // option is `next` and its `prev` is always occupied), which is what
            // makes the depth-4 requirement airtight rather than routed around.
            List<SchedulerSlot> slots = Corridor(5);

            SchedulerData data = Data(slots, new List<SchedulerRequest>
            {
                RiderBlockerAtNine(),
                Assigned(200, requestedSlotId: 1, assignedSlotId: 1, startTime: "08:00:00"),
                Assigned(201, requestedSlotId: 2, assignedSlotId: 2, startTime: "09:00:00"),
                Assigned(202, requestedSlotId: 3, assignedSlotId: 3, startTime: "10:00:00"),
                Assigned(203, requestedSlotId: 4, assignedSlotId: 4, startTime: "11:00:00"),
                Pending(100, requestedSlotId: 1, rider: RiderBlockedAt9)
            });

            AutoScheduleResult result = Run(data);

            result.ScheduledCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);

            // Nothing moved: a chain that fails rolls back completely.
            result.MovedCount.Should().Be(0);
            result.UnchangedCount.Should().Be(4);

            AssignmentDecision r = Decision(result, 100);
            r.Status.Should().Be("Pending");
            r.MovementAttempted.Should().BeTrue();
            r.MovementSearchExhausted.Should().BeTrue();
        }

        [Fact]
        public void BudgetExhaustion_IsAdditive_AndNeverReplacesTheRequestedSlotReason()
        {
            List<SchedulerSlot> slots = Corridor(5);

            SchedulerData data = Data(slots, new List<SchedulerRequest>
            {
                RiderBlockerAtNine(),
                Assigned(200, requestedSlotId: 1, assignedSlotId: 1, startTime: "08:00:00"),
                Assigned(201, requestedSlotId: 2, assignedSlotId: 2, startTime: "09:00:00"),
                Assigned(202, requestedSlotId: 3, assignedSlotId: 3, startTime: "10:00:00"),
                Assigned(203, requestedSlotId: 4, assignedSlotId: 4, startTime: "11:00:00"),
                Pending(100, requestedSlotId: 1, rider: RiderBlockedAt9)
            });

            AutoScheduleResult result = Run(data);

            // The reason still describes the REQUESTED slot — the true, actionable
            // fact. Exhaustion is reported alongside it, never instead of it.
            result.Audit.Single(a => a.Action == "unscheduled").Reason
                .Should().Be("אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)");
            Decision(result, 100).MovementSearchExhausted.Should().BeTrue();
        }

        [Fact]
        public void NoMovableOccupant_MeansMovementIsNotEvenAttempted()
        {
            // The only occupant of R's candidate slots is frozen (published), so
            // there is nothing to displace and no search runs at all.
            SchedulerData data = Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:11:00", isPublished: true) },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AssignmentDecision r = Decision(Run(data), 100);

            r.MovementAttempted.Should().BeFalse();
            r.MovementSearchExhausted.Should().BeFalse();
        }

        // =====================================================================
        // 8. Hard constraints still block an otherwise useful move
        // =====================================================================

        // The "blocked escape" fixture.
        //
        // S1 (single seat) holds the movable row 200, which requested the PUBLISHED
        // S2 — so 200 legally sits in S2's prev (S1) and its only escape is S2's next
        // (S3, free and empty). R requested S1 and has S1 as its only candidate,
        // because both of S1's neighbours are published/ineligible.
        //
        // Without any conflict this schedules R and moves 200 into S3. Each test below
        // adds exactly ONE conflicting frozen booking that makes S3 unusable for 200,
        // and nothing else — so a zero MovedCount isolates that single constraint.
        // S3 stays a SINGLE seat: a two-seat S3 would let 200 slide into the free
        // second seat and the conflict would never be exercised.
        private static SchedulerData BlockedEscapeFixture(SchedulerRequest conflicting,
            List<SchedulerSlot>? extraSlots = null, int movableRider = 51, int movableHorse = 52,
            int movableCoach = 53)
        {
            List<SchedulerSlot> slots = new List<SchedulerSlot>
            {
                BlockerSlot(BlockerId),
                Slot(1, "08:00:00", "08:11:00"),
                Slot(2, "09:00:00", "09:11:00", isPublished: true),
                Slot(3, "10:00:00", "10:11:00")
            };
            if (extraSlots != null)
            {
                slots.AddRange(extraSlots);
            }

            return Data(slots, new List<SchedulerRequest>
            {
                conflicting,
                Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00",
                    rider: movableRider, horse: movableHorse, coach: movableCoach),
                Pending(100, requestedSlotId: 1)
            });
        }

        [Fact]
        public void MovableRowWithAClearEscape_IsTheControlCase()
        {
            // Control: no conflicting booking at all. Proves the fixture really does
            // schedule R by moving 200 into S3, so the three conflict tests below are
            // isolating the constraint and not a broken fixture.
            SchedulerData data = BlockedEscapeFixture(
                Assigned(300, requestedSlotId: BlockerId, assignedSlotId: BlockerId,
                    startTime: "14:00:00", rider: 41, horse: 42, coach: 43));

            AutoScheduleResult result = Run(data);

            result.ScheduledCount.Should().Be(1);
            result.MovedCount.Should().Be(1);
            Decision(result, 200).AssignedCompSlotId.Should().Be(3);
        }

        [Fact]
        public void RiderConflict_PreventsAnOtherwiseUsefulMove()
        {
            // Same rider as 200, occupying S3's exact window from another slot.
            SchedulerData data = BlockedEscapeFixture(
                Assigned(300, requestedSlotId: BlockerId, assignedSlotId: BlockerId,
                    startTime: "10:00:00", rider: 51, horse: 42, coach: 43));

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.ScheduledCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
        }

        [Fact]
        public void HorseConflict_PreventsAnOtherwiseUsefulMove()
        {
            SchedulerData data = BlockedEscapeFixture(
                Assigned(300, requestedSlotId: BlockerId, assignedSlotId: BlockerId,
                    startTime: "10:00:00", rider: 41, horse: 52, coach: 43));

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
        }

        [Fact]
        public void CoachConflict_PreventsAnOtherwiseUsefulMove()
        {
            // Same coach as 200, in the SAME arena (slot 4 sits alongside slot 3), so
            // no transition margin applies and this is a plain overlap.
            SchedulerData data = BlockedEscapeFixture(
                Assigned(300, requestedSlotId: 1, assignedSlotId: 4, startTime: "10:00:00",
                    rider: 41, horse: 42, coach: 53),
                extraSlots: new List<SchedulerSlot> { Slot(4, "10:00:00", "10:11:00") });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
        }

        [Fact]
        public void CrossArenaCoachTransition_IsStillEnforcedAgainstFrozenBookings()
        {
            // The frozen booking is in a DIFFERENT arena and runs 10:11-10:22, so it
            // does NOT plainly overlap S3's 10:00-10:11 window. Only the 7-minute
            // cross-arena transition (expanding it to 10:04-10:29) blocks the move.
            // A plain overlap check would have let this move through.
            SchedulerData data = BlockedEscapeFixture(
                Assigned(300, requestedSlotId: BlockerId, assignedSlotId: BlockerId,
                    startTime: "10:11:00", rider: 41, horse: 42, coach: 53));

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
        }

        // =====================================================================
        // 9. The movement space stays closed: no cross-day, no cross-arena
        // =====================================================================

        [Fact]
        public void MovementNeverCrossesADayBoundary()
        {
            // A free single-seat slot exists on the NEXT day at the same clock time.
            // It is not a positional neighbour (neighbours are built per SlotDate),
            // so it can never be a move target.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00", date: "2026-08-02")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
        }

        [Fact]
        public void MovementNeverCrossesAnArenaBoundary()
        {
            // Same day, free slot, but a different arena than the requested slot.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00", arenaId: 5)
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(0);
            result.UnscheduledCount.Should().Be(1);
        }

        // =====================================================================
        // 10. Order allocation: gaps are preserved and reused, never renumbered
        // =====================================================================

        // A two-seat slot whose only occupant holds a GAPPED order (7), so orders
        // 1-6 are free. The two paths must allocate differently on this fixture.
        private static SchedulerData GappedOrderScenario()
        {
            return Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22, isPublished: true),
                    Slot(2, "09:00:00", "09:22:00", capacityMinutes: 22)
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 2,
                        startTime: "09:00:00", order: 7),
                    Pending(100, requestedSlotId: 2)
                });
        }

        [Fact]
        public void MovementPath_ReusesTheLowestFreeOrder_AndNeverRenumbersOthers()
        {
            // allowMovement = true: the new row takes order 1 (the lowest free), NOT 8.
            // The existing row keeps order 7 — no unrelated row is renumbered for
            // cosmetic contiguity, and existing gaps stay legal.
            AutoScheduleResult result = Run(GappedOrderScenario());

            Decision(result, 100).AssignedOrder.Should().Be(1);
            result.MovedCount.Should().Be(0);
            result.UnchangedCount.Should().Be(1);
        }

        [Fact]
        public void BulkPath_KeepsMaxPlusOneOrderAllocation_Exactly()
        {
            // allowMovement = false (the deployed SP 129 path): V2-1's max+1 is
            // preserved unchanged. The occupant holds 7, so the new row gets 8 —
            // NOT the lowest free 1. V2-2 must not alter a separately deployed flow.
            SchedulerData data = GappedOrderScenario();

            AutoScheduleResult result = AutoScheduler.Schedule(data, Candidates(data));

            Decision(result, 100).AssignedOrder.Should().Be(8);
            result.MovedCount.Should().Be(0);
            result.UnchangedCount.Should().Be(0);
            result.FrozenCount.Should().Be(1);
        }

        [Fact]
        public void TheTwoPaths_AllocateDifferentOrders_OnTheSameSnapshot()
        {
            // Pins the split itself: identical input, deliberately different rule.
            int bulkOrder = AutoScheduler
                .Schedule(GappedOrderScenario(), new List<int> { 100 })
                .Assignments.Single(a => a.PaidTimeRequestId == 100).AssignedOrder!.Value;

            int movementOrder = AutoScheduler
                .Schedule(GappedOrderScenario(), new List<int> { 100 }, allowMovement: true)
                .Assignments.Single(a => a.PaidTimeRequestId == 100).AssignedOrder!.Value;

            bulkOrder.Should().Be(8);
            movementOrder.Should().Be(1);
        }

        [Fact]
        public void PreviewAndApplyRecomputation_UseTheSameOrderRule()
        {
            // Both go through PreviewForCompetition (allowMovement = true), so Apply
            // can never write an order the Preview did not show.
            SchedulerData data = GappedOrderScenario();
            string fingerprint =
                PaidTimeRequest.ComputeAutoScheduleFingerprint(data, Candidates(data));

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.WritePlan.Items.Single(i => i.PaidTimeRequestId == 100)
                .NewAssignedOrder.Should().Be(1);
            Decision(Run(GappedOrderScenario()), 100).AssignedOrder.Should().Be(1);
        }

        [Fact]
        public void BothPaths_StartAtOrderOne_InAnEmptySlot()
        {
            // The two rules only diverge where a gap exists; an empty slot must give
            // the same answer either way, so the split cannot drift on ordinary data.
            SchedulerData empty() => Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22) },
                new List<SchedulerRequest> { Pending(100, requestedSlotId: 1) });

            AutoScheduler.Schedule(empty(), new List<int> { 100 })
                .Assignments.Single().AssignedOrder.Should().Be(1);
            AutoScheduler.Schedule(empty(), new List<int> { 100 }, allowMovement: true)
                .Assignments.Single().AssignedOrder.Should().Be(1);
        }

        // =====================================================================
        // 11. Determinism and Preview/Apply parity
        // =====================================================================

        private static SchedulerData SwapScenario()
        {
            return Data(
                new List<SchedulerSlot>
                {
                    BlockerSlot(BlockerId),
                    Slot(10, "08:00:00", "08:22:00", capacityMinutes: 22),
                    Slot(20, "09:00:00", "09:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(300, requestedSlotId: BlockerId, assignedSlotId: BlockerId,
                        startTime: "08:11:00", rider: 55, horse: 66, coach: 77),
                    Assigned(200, requestedSlotId: 20, assignedSlotId: 10,
                        startTime: "08:00:00", rider: 20, horse: 66, coach: 21),
                    Assigned(201, requestedSlotId: 10, assignedSlotId: 20,
                        startTime: "09:00:00", rider: 30, horse: 31, coach: 32),
                    Pending(100, requestedSlotId: 10, rider: 55, horse: 10, coach: 11)
                });
        }

        private static string PlanKey(IEnumerable<AssignmentDecision> decisions)
        {
            return string.Join(";", decisions
                .OrderBy(a => a.PaidTimeRequestId)
                .Select(a => $"{a.PaidTimeRequestId}:{a.ChangeKind}:{a.Status}:" +
                             $"{a.AssignedCompSlotId}:{a.AssignedStartTime:o}:{a.AssignedOrder}:" +
                             $"{a.PreviousAssignedCompSlotId}:{a.AllocationOrigin}"));
        }

        [Fact]
        public void SameSnapshotTwice_ProducesAnIdenticalMovementPlan()
        {
            PlanKey(Run(SwapScenario()).Assignments)
                .Should().Be(PlanKey(Run(SwapScenario()).Assignments));
        }

        [Fact]
        public void PreviewAndApplyRecomputation_ProduceTheIdenticalMovementPlan()
        {
            SchedulerData data = SwapScenario();
            string fingerprint =
                PaidTimeRequest.ComputeAutoScheduleFingerprint(data, Candidates(data));

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            PlanKey(plan.Decisions).Should().Be(PlanKey(Run(SwapScenario()).Assignments));
        }

        // =====================================================================
        // 12. The write plan contains exactly the rows that change
        // =====================================================================

        [Fact]
        public void WritePlan_ContainsOnlyNewAndMovedRows_WithCompleteExpectedOldState()
        {
            SchedulerData data = SwapScenario();
            string fingerprint =
                PaidTimeRequest.ComputeAutoScheduleFingerprint(data, Candidates(data));

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.WritePlan.ExpectedWriteSetCount.Should().Be(plan.WritePlan.Items.Count);
            plan.WritePlan.Items.Select(i => i.PaidTimeRequestId)
                .Should().BeEquivalentTo(new[] { 100, 200, 201 });

            // The frozen blocker (300) is never a write-set member.
            plan.WritePlan.Items.Select(i => i.PaidTimeRequestId).Should().NotContain(300);

            AutoScheduleWritePlanItem newRow = plan.WritePlan.Items.Single(i => i.PaidTimeRequestId == 100);
            newRow.ChangeKind.Should().Be(ChangeKinds.NewAssignment);
            newRow.ExpectedStatus.Should().Be("Pending");
            newRow.ExpectedAssignedCompSlotId.Should().BeNull();
            newRow.ExpectedAssignedStartTime.Should().BeNull();
            newRow.ExpectedAssignedOrder.Should().BeNull();
            newRow.NewAllocationOrigin.Should().Be("Auto");

            AutoScheduleWritePlanItem movedRow = plan.WritePlan.Items.Single(i => i.PaidTimeRequestId == 200);
            movedRow.ChangeKind.Should().Be(ChangeKinds.Moved);
            movedRow.ExpectedStatus.Should().Be("Assigned");
            movedRow.ExpectedAssignedCompSlotId.Should().Be(10);
            movedRow.ExpectedAssignedStartTime.Should().Be(At("08:00:00"));
            movedRow.ExpectedAssignedOrder.Should().Be(1);
            movedRow.NewAssignedCompSlotId.Should().Be(20);
        }

        [Fact]
        public void WritePlan_ExcludesUnchangedAndFrozenRows()
        {
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true)
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 1, startTime: "08:00:00"),
                    Assigned(300, requestedSlotId: 2, assignedSlotId: 2, startTime: "09:00:00")
                });

            string fingerprint =
                PaidTimeRequest.ComputeAutoScheduleFingerprint(data, Candidates(data));

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.WritePlan.Items.Should().BeEmpty();
            plan.Result.UnchangedCount.Should().Be(1);
            plan.Result.FrozenCount.Should().Be(1);
        }

        // =====================================================================
        // 13. requestedcompslotid is never touched
        // =====================================================================

        [Fact]
        public void MovedAssignment_LeavesRequestedCompSlotIdUnchanged()
        {
            SchedulerData data = SwapScenario();
            AutoScheduleResult result = Run(data);

            result.MovedCount.Should().Be(2);

            // The engine emits no requested-slot field on a decision at all, and the
            // snapshot rows keep the value they came in with.
            data.Requests.Single(r => r.PaidTimeRequestId == 200).RequestedCompSlotId.Should().Be(20);
            data.Requests.Single(r => r.PaidTimeRequestId == 201).RequestedCompSlotId.Should().Be(10);
        }

        // =====================================================================
        // 14. The bulk path (SP 129) never moves anything
        // =====================================================================

        [Fact]
        public void BulkPath_WithMovementDisabled_KeepsExactV21Behaviour()
        {
            // Same fixture as the core movement test, run through the two-argument
            // overload used by RunForCompetition. Every Assigned row is frozen, the
            // extra request stays unscheduled, and nothing is moved — so SP 129,
            // which only accepts brand-new assignments, keeps working unchanged.
            SchedulerData data = Data(
                new List<SchedulerSlot>
                {
                    Slot(1, "08:00:00", "08:11:00"),
                    Slot(2, "09:00:00", "09:11:00", isPublished: true),
                    Slot(3, "10:00:00", "10:11:00")
                },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 2, assignedSlotId: 1, startTime: "08:00:00"),
                    Pending(100, requestedSlotId: 1)
                });

            AutoScheduleResult result = AutoScheduler.Schedule(data, Candidates(data));

            result.MovedCount.Should().Be(0);
            result.UnchangedCount.Should().Be(0);
            result.FrozenCount.Should().Be(1);
            result.UnscheduledCount.Should().Be(1);
            result.Assignments.Should().ContainSingle()
                .Which.PaidTimeRequestId.Should().Be(100);
        }

        // =====================================================================
        // 15. Fingerprint covers allocationorigin (and still ignores server time)
        // =====================================================================

        [Fact]
        public void Fingerprint_ChangesWhenAllocationOriginChanges()
        {
            SchedulerData a = Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22) },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 1,
                        startTime: "08:00:00", origin: null)
                });

            SchedulerData b = Data(
                new List<SchedulerSlot> { Slot(1, "08:00:00", "08:22:00", capacityMinutes: 22) },
                new List<SchedulerRequest>
                {
                    Assigned(200, requestedSlotId: 1, assignedSlotId: 1,
                        startTime: "08:00:00", origin: "Manual")
                });

            PaidTimeRequest.ComputeAutoScheduleFingerprint(a, Candidates(a))
                .Should().NotBe(PaidTimeRequest.ComputeAutoScheduleFingerprint(b, Candidates(b)));
        }
    }
}
