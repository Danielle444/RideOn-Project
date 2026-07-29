using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.AutoScheduler;
using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;

namespace RideOnServer.Tests
{
    // DB-free coverage of the NEW Stage A Preview logic: the deterministic
    // fingerprint (PaidTimeRequest.ComputeAutoScheduleFingerprint) and the
    // result -> DTO mapping (PaidTimeRequest.MapPreviewResponse). These build an
    // in-memory SchedulerData and call the pure methods directly — no database,
    // no controller, no writes.
    public class AutoSchedulePreviewMappingTests
    {
        // ===== V2-2: moved / unchanged / frozen-reason mapping =====
        //
        // Built on the same "step aside" fixture the engine tests use: 200 sits in
        // S1 having requested the PUBLISHED S2, so it can legally move to S3; 300
        // sits inside the published S2 and is frozen; 100 can only be scheduled by
        // moving 200 out of the way.
        private static SchedulerData MovementScenario()
        {
            return new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 29, 9, 0, 0),
                Slots = new List<SchedulerSlot>
                {
                    MoveSlot(1, "08:00:00", "08:11:00"),
                    MoveSlot(2, "09:00:00", "09:11:00", isPublished: true),
                    MoveSlot(3, "10:00:00", "10:11:00")
                },
                Requests = new List<SchedulerRequest>
                {
                    MoveAssigned(200, requestedSlotId: 2, assignedSlotId: 1,
                        start: "08:00:00", order: 4, origin: "Manual", horseName: "Rocket"),
                    MoveAssigned(300, requestedSlotId: 2, assignedSlotId: 2,
                        start: "09:00:00", order: 1, origin: null, horseName: "Thunder"),
                    new SchedulerRequest
                    {
                        PaidTimeRequestId = 100,
                        HorseId = 6100,
                        RiderFederationMemberId = 5100,
                        CoachFederationMemberId = 7100,
                        DurationMinutes = 11,
                        RequestedCompSlotId = 1,
                        Status = "Pending",
                        SrequestDateTime = new DateTime(2026, 7, 20, 10, 0, 0),
                        HorseName = "Comet"
                    }
                }
            };
        }

        private static SchedulerSlot MoveSlot(int id, string start, string end, bool isPublished = false)
        {
            return new SchedulerSlot
            {
                PaidTimeSlotInCompId = id,
                SlotDate = new DateTime(2026, 8, 1),
                StartTimeRaw = start,
                EndTimeRaw = end,
                TotalCapacityMinutes = 11,
                ArenaRanchId = 11,
                ArenaId = 2,
                ArenaName = "Arena " + id,
                IsPublished = isPublished
            };
        }

        private static SchedulerRequest MoveAssigned(int id, int requestedSlotId, int assignedSlotId,
            string start, int order, string? origin, string horseName)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = 6000 + id,
                RiderFederationMemberId = 5000 + id,
                CoachFederationMemberId = 7000 + id,
                DurationMinutes = 11,
                RequestedCompSlotId = requestedSlotId,
                AssignedCompSlotId = assignedSlotId,
                AssignedStartTime = new DateTime(2026, 8, 1).Add(TimeSpan.Parse(start)),
                AssignedOrder = order,
                AllocationOrigin = origin,
                Status = "Assigned",
                SrequestDateTime = new DateTime(2026, 7, 18, 10, 0, 0),
                HorseName = horseName
            };
        }

        private static AutoSchedulePreviewResponse MapMovementScenario()
        {
            SchedulerData data = MovementScenario();
            List<int> candidates = data.Requests
                .Where(r => r.Status == "Pending" && r.AssignedCompSlotId == null)
                .Select(r => r.PaidTimeRequestId)
                .ToList();

            AutoScheduleResult result = AutoScheduler.Schedule(data, candidates, allowMovement: true);
            return PaidTimeRequest.MapPreviewResponse(result, data, "FP");
        }

        [Fact]
        public void MapPreviewResponse_MovedRow_CarriesBothOldAndNewState()
        {
            AutoSchedulePreviewResponse response = MapMovementScenario();

            response.MovedCount.Should().Be(1);
            PreviewMovedItem moved = response.MovedItems.Single();

            moved.PaidTimeRequestId.Should().Be(200);
            moved.PreviousAssignedCompSlotId.Should().Be(1);
            moved.PreviousAssignedStartTime.Should().Be(new DateTime(2026, 8, 1, 8, 0, 0));
            moved.PreviousAssignedOrder.Should().Be(4);
            moved.PreviousArenaName.Should().Be("Arena 1");

            moved.AssignedCompSlotId.Should().Be(3);
            moved.AssignedStartTime.Should().Be(new DateTime(2026, 8, 1, 10, 0, 0));
            moved.AssignedArenaName.Should().Be("Arena 3");
            moved.HorseName.Should().Be("Rocket");

            // Preserved verbatim, never rewritten to "Auto".
            moved.AllocationOrigin.Should().Be("Manual");
        }

        [Fact]
        public void MapPreviewResponse_ScheduledAndMoved_AreExactlyTheWriteSet()
        {
            AutoSchedulePreviewResponse response = MapMovementScenario();

            // The documented invariant: ScheduledItems united with MovedItems is
            // precisely what Apply will write. Frozen rows are in neither.
            response.ScheduledItems.Select(i => i.PaidTimeRequestId)
                .Concat(response.MovedItems.Select(i => i.PaidTimeRequestId))
                .Should().BeEquivalentTo(new[] { 100, 200 });

            response.ScheduledItems.Single().AllocationOrigin.Should().Be("Auto");
        }

        [Fact]
        public void MapPreviewResponse_FrozenRow_CarriesItsStructuredReason()
        {
            AutoSchedulePreviewResponse response = MapMovementScenario();

            PreviewFrozenItem frozen = response.FrozenItems.Single();
            frozen.PaidTimeRequestId.Should().Be(300);
            frozen.FrozenReason.Should().Be(FrozenReasons.PublishedSlot);
            frozen.IsPublishedSlot.Should().BeTrue();
            frozen.HorseName.Should().Be("Thunder");
        }

        [Fact]
        public void MapPreviewResponse_UnchangedRow_IsSeparateFromFrozen_AndNotAWriteSetMember()
        {
            // Two-seat slot, nothing to make room for: 200 is movable but left alone.
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 29, 9, 0, 0),
                Slots = new List<SchedulerSlot>
                {
                    new SchedulerSlot
                    {
                        PaidTimeSlotInCompId = 1,
                        SlotDate = new DateTime(2026, 8, 1),
                        StartTimeRaw = "08:00:00",
                        EndTimeRaw = "08:22:00",
                        TotalCapacityMinutes = 22,
                        ArenaRanchId = 11,
                        ArenaId = 2,
                        ArenaName = "Arena 1"
                    }
                },
                Requests = new List<SchedulerRequest>
                {
                    MoveAssigned(200, requestedSlotId: 1, assignedSlotId: 1,
                        start: "08:00:00", order: 1, origin: null, horseName: "Willow")
                }
            };

            AutoScheduleResult result = AutoScheduler.Schedule(data, new List<int>(), allowMovement: true);
            AutoSchedulePreviewResponse response = PaidTimeRequest.MapPreviewResponse(result, data, "FP");

            response.UnchangedCount.Should().Be(1);
            response.UnchangedItems.Single().PaidTimeRequestId.Should().Be(200);
            response.FrozenItems.Should().BeEmpty();
            response.MovedItems.Should().BeEmpty();
            response.ScheduledItems.Should().BeEmpty();
        }

        private static SchedulerSlot Slot(
            int id,
            bool isPublished = false,
            string start = "08:00:00",
            string end = "12:00:00")
        {
            return new SchedulerSlot
            {
                PaidTimeSlotInCompId = id,
                SlotDate = new DateTime(2026, 8, 1),
                StartTimeRaw = start,
                EndTimeRaw = end,
                TotalCapacityMinutes = 240,
                ArenaRanchId = 11,
                ArenaId = id,
                ArenaName = "Arena " + id,
                IsPublished = isPublished
            };
        }

        private static SchedulerRequest Pending(
            int id,
            int requestedSlotId,
            int horseId,
            int riderId,
            int coachId,
            string? horseName = null,
            string? barnName = null,
            string? riderName = null,
            string? coachName = null,
            string? payerName = null)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = horseId,
                RiderFederationMemberId = riderId,
                CoachFederationMemberId = coachId,
                DurationMinutes = 11,
                RequestedCompSlotId = requestedSlotId,
                Status = "Pending",
                SrequestDateTime = new DateTime(2026, 7, 20, 10, 0, 0).AddMinutes(id),
                HorseName = horseName,
                BarnName = barnName,
                RiderName = riderName,
                CoachName = coachName,
                PayerName = payerName
            };
        }

        // Baseline snapshot: one non-published slot + one fitting pending request.
        private static SchedulerData BaselineData(DateTime now)
        {
            return new SchedulerData
            {
                CompetitionId = 41,
                Now = now,
                Slots = new List<SchedulerSlot> { Slot(1) },
                Requests = new List<SchedulerRequest> { Pending(100, 1, horseId: 555, riderId: 900, coachId: 7) }
            };
        }

        private static List<int> Candidates(SchedulerData data)
        {
            return data.Requests
                .Where(r => r.Status == "Pending" && r.AssignedCompSlotId == null)
                .Select(r => r.PaidTimeRequestId)
                .ToList();
        }

        // --- Fingerprint ---------------------------------------------------------------------

        [Fact]
        public void Fingerprint_IsStable_WhenOnlyNowDiffers()
        {
            SchedulerData a = BaselineData(new DateTime(2026, 7, 23, 9, 0, 0));
            SchedulerData b = BaselineData(new DateTime(2026, 7, 24, 18, 30, 0)); // different Now only

            string fa = PaidTimeRequest.ComputeAutoScheduleFingerprint(a, Candidates(a));
            string fb = PaidTimeRequest.ComputeAutoScheduleFingerprint(b, Candidates(b));

            fb.Should().Be(fa);
        }

        [Fact]
        public void Fingerprint_Changes_WhenSchedulingInputChanges()
        {
            SchedulerData a = BaselineData(new DateTime(2026, 7, 23, 9, 0, 0));
            SchedulerData b = BaselineData(new DateTime(2026, 7, 23, 9, 0, 0));
            b.Slots[0].StartTimeRaw = "09:00:00"; // slot origin changed -> placement can change

            string fa = PaidTimeRequest.ComputeAutoScheduleFingerprint(a, Candidates(a));
            string fb = PaidTimeRequest.ComputeAutoScheduleFingerprint(b, Candidates(b));

            fb.Should().NotBe(fa);
        }

        [Fact]
        public void Fingerprint_Changes_WhenHorseIdChanges()
        {
            // Same assigned time would result, but the proposal now refers to a
            // different horse -> the approved preview must be treated as stale.
            SchedulerData a = BaselineData(new DateTime(2026, 7, 23, 9, 0, 0));
            SchedulerData b = BaselineData(new DateTime(2026, 7, 23, 9, 0, 0));
            b.Requests[0].HorseId = a.Requests[0].HorseId + 1;

            string fa = PaidTimeRequest.ComputeAutoScheduleFingerprint(a, Candidates(a));
            string fb = PaidTimeRequest.ComputeAutoScheduleFingerprint(b, Candidates(b));

            fb.Should().NotBe(fa);
        }

        [Fact]
        public void Fingerprint_Changes_WhenRiderFederationMemberIdChanges()
        {
            SchedulerData a = BaselineData(new DateTime(2026, 7, 23, 9, 0, 0));
            SchedulerData b = BaselineData(new DateTime(2026, 7, 23, 9, 0, 0));
            b.Requests[0].RiderFederationMemberId = a.Requests[0].RiderFederationMemberId + 1;

            string fa = PaidTimeRequest.ComputeAutoScheduleFingerprint(a, Candidates(a));
            string fb = PaidTimeRequest.ComputeAutoScheduleFingerprint(b, Candidates(b));

            fb.Should().NotBe(fa);
        }

        // --- Mapping -------------------------------------------------------------------------

        [Fact]
        public void MapPreviewResponse_MapsScheduledUnscheduledAndFrozen_IntoCorrectLists()
        {
            // slot 1 open; slot 2 published. Frozen request 200 occupies slot 1 at order 1.
            SchedulerRequest frozen = new SchedulerRequest
            {
                PaidTimeRequestId = 200,
                HorseId = 700,
                RiderFederationMemberId = 970,
                CoachFederationMemberId = 7,
                DurationMinutes = 11,
                RequestedCompSlotId = 1,
                AssignedCompSlotId = 1,
                AssignedStartTime = new DateTime(2026, 8, 1, 8, 0, 0),
                AssignedOrder = 1,
                Status = "Assigned",
                SrequestDateTime = new DateTime(2026, 7, 18, 10, 0, 0)
            };

            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2, isPublished: true) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, horseId: 501, riderId: 901, coachId: 8), // -> scheduled
                    Pending(101, requestedSlotId: 2, horseId: 502, riderId: 902, coachId: 9), // -> unscheduled (published slot)
                    frozen                                                                    // -> frozen
                }
            };

            List<int> candidateIds = new List<int> { 100, 101 };

            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateIds);
            string fingerprint = PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidateIds);

            AutoSchedulePreviewResponse response = PaidTimeRequest.MapPreviewResponse(result, data, fingerprint);

            response.Fingerprint.Should().Be(fingerprint);
            response.GeneratedAt.Should().Be(data.Now);

            response.ScheduledCount.Should().Be(1);
            response.UnscheduledCount.Should().Be(1);
            response.FrozenCount.Should().Be(1);

            response.ScheduledItems.Should().HaveCount(1);
            response.UnscheduledItems.Should().HaveCount(1);
            response.FrozenItems.Should().HaveCount(1);

            PreviewScheduledItem scheduled = response.ScheduledItems.Single();
            scheduled.PaidTimeRequestId.Should().Be(100);
            scheduled.AssignedCompSlotId.Should().Be(1);
            scheduled.RiderFederationMemberId.Should().Be(901);
            scheduled.EffectiveDurationMinutes.Should().Be(11);

            PreviewUnscheduledItem unscheduled = response.UnscheduledItems.Single();
            unscheduled.PaidTimeRequestId.Should().Be(101);
            unscheduled.HorseId.Should().Be(502);
            unscheduled.ReasonCode.Should().Be("RequestedSlotPublished");
            unscheduled.Reason.Should().Be("הסלוט המבוקש פורסם - שיבוץ ידני נדרש");

            PreviewFrozenItem frozenItem = response.FrozenItems.Single();
            frozenItem.PaidTimeRequestId.Should().Be(200);
            frozenItem.AssignedCompSlotId.Should().Be(1);
            frozenItem.AssignedOrder.Should().Be(1);
        }

        // --- Stage B: display-name enrichment ------------------------------------------------

        // Builds the scheduled/unscheduled/frozen mix used by the enrichment tests,
        // with human-readable names populated on every request.
        private static SchedulerData EnrichedMixData()
        {
            SchedulerRequest frozen = new SchedulerRequest
            {
                PaidTimeRequestId = 200,
                HorseId = 700,
                RiderFederationMemberId = 970,
                CoachFederationMemberId = 7,
                DurationMinutes = 11,
                RequestedCompSlotId = 1,
                AssignedCompSlotId = 1,
                AssignedStartTime = new DateTime(2026, 8, 1, 8, 0, 0),
                AssignedOrder = 1,
                Status = "Assigned",
                SrequestDateTime = new DateTime(2026, 7, 18, 10, 0, 0),
                HorseName = "Thunder",
                BarnName = "North Barn",
                RiderName = "Frozen Rider",
                CoachName = "Frozen Coach",
                PayerName = "Frozen Payer"
            };

            return new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2, isPublished: true) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, horseId: 501, riderId: 901, coachId: 8,
                        horseName: "Comet", barnName: "South Barn", riderName: "Alice Rider",
                        coachName: "Bob Coach", payerName: "Carol Payer"),        // -> scheduled (slot 1)
                    Pending(101, requestedSlotId: 2, horseId: 502, riderId: 902, coachId: 9,
                        horseName: "Blaze", barnName: "East Barn", riderName: "Dave Rider",
                        coachName: "Eve Coach", payerName: "Frank Payer"),         // -> unscheduled (published slot 2)
                    frozen                                                          // -> frozen (slot 1)
                }
            };
        }

        [Fact]
        public void MapPreviewResponse_PopulatesDisplayNames_OnEachPreviewItem()
        {
            SchedulerData data = EnrichedMixData();
            List<int> candidateIds = new List<int> { 100, 101 };

            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateIds);
            string fingerprint = PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidateIds);

            AutoSchedulePreviewResponse response = PaidTimeRequest.MapPreviewResponse(result, data, fingerprint);

            PreviewScheduledItem scheduled = response.ScheduledItems.Single();
            scheduled.PaidTimeRequestId.Should().Be(100);
            scheduled.HorseName.Should().Be("Comet");
            scheduled.BarnName.Should().Be("South Barn");
            scheduled.RiderName.Should().Be("Alice Rider");
            scheduled.CoachName.Should().Be("Bob Coach");
            scheduled.PayerName.Should().Be("Carol Payer");
            // Assigned arena name comes from the slots data (slot 1 -> "Arena 1").
            scheduled.AssignedArenaName.Should().Be("Arena 1");

            PreviewUnscheduledItem unscheduled = response.UnscheduledItems.Single();
            unscheduled.PaidTimeRequestId.Should().Be(101);
            unscheduled.HorseName.Should().Be("Blaze");
            unscheduled.BarnName.Should().Be("East Barn");
            unscheduled.RiderName.Should().Be("Dave Rider");
            unscheduled.CoachName.Should().Be("Eve Coach");

            PreviewFrozenItem frozenItem = response.FrozenItems.Single();
            frozenItem.PaidTimeRequestId.Should().Be(200);
            frozenItem.HorseName.Should().Be("Thunder");
            frozenItem.BarnName.Should().Be("North Barn");
            // Frozen item is assigned to slot 1 -> arena name resolved from slots.
            frozenItem.AssignedArenaName.Should().Be("Arena 1");
        }

        [Fact]
        public void MapPreviewResponse_ResolvesAssignedArenaName_FromSlotsData()
        {
            // Slot 3 lives in a differently-named arena; the scheduled item must
            // pick up that arena name purely from data.Slots (no SQL/name field).
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(3) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(300, requestedSlotId: 3, horseId: 555, riderId: 900, coachId: 7)
                }
            };
            List<int> candidateIds = new List<int> { 300 };

            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateIds);
            string fingerprint = PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidateIds);

            AutoSchedulePreviewResponse response = PaidTimeRequest.MapPreviewResponse(result, data, fingerprint);

            response.ScheduledItems.Single().AssignedArenaName.Should().Be("Arena 3");
        }

        [Fact]
        public void MapPreviewResponse_WithNullDisplayNames_DoesNotThrow_AndNormalizesNonNullableFields()
        {
            // All name fields left null (missing display data). Mapping must still
            // succeed; non-nullable DTO strings become "", nullable ones stay null,
            // and the assigned arena name is still resolved from slots.
            SchedulerData data = BaselineData(new DateTime(2026, 7, 23, 9, 0, 0)); // names all null
            List<int> candidateIds = Candidates(data);

            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateIds);
            string fingerprint = PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidateIds);

            AutoSchedulePreviewResponse response = PaidTimeRequest.MapPreviewResponse(result, data, fingerprint);

            PreviewScheduledItem scheduled = response.ScheduledItems.Single();
            scheduled.HorseName.Should().Be(string.Empty);
            scheduled.RiderName.Should().Be(string.Empty);
            scheduled.PayerName.Should().Be(string.Empty);
            scheduled.BarnName.Should().BeNull();
            scheduled.CoachName.Should().BeNull();
            scheduled.AssignedArenaName.Should().Be("Arena 1");
        }

        [Fact]
        public void Enrichment_ChangingOnlyDisplayNames_DoesNotAlterDecisionsOrFingerprint()
        {
            // Same scheduling snapshot, twice: identical placement inputs, but the
            // second run has completely different display names. The scheduler's
            // scheduled/unscheduled/frozen decisions, reason codes, and the
            // fingerprint must all be byte-for-byte identical.
            SchedulerData bare = EnrichedMixDataWithoutNames();
            SchedulerData named = EnrichedMixDataWithoutNames();
            foreach (SchedulerRequest r in named.Requests)
            {
                r.HorseName = "X-" + r.PaidTimeRequestId;
                r.BarnName = "B-" + r.PaidTimeRequestId;
                r.RiderName = "R-" + r.PaidTimeRequestId;
                r.CoachName = "C-" + r.PaidTimeRequestId;
                r.PayerName = "P-" + r.PaidTimeRequestId;
            }

            List<int> candidateIds = new List<int> { 100, 101 };

            AutoScheduleResult bareResult = AutoScheduler.Schedule(bare, candidateIds);
            AutoScheduleResult namedResult = AutoScheduler.Schedule(named, candidateIds);

            // Decision counts identical.
            namedResult.ScheduledCount.Should().Be(bareResult.ScheduledCount);
            namedResult.UnscheduledCount.Should().Be(bareResult.UnscheduledCount);
            namedResult.FrozenCount.Should().Be(bareResult.FrozenCount);

            // Assignment decisions (id -> slot/status/order) identical.
            string BareAssign(AutoScheduleResult r) => string.Join(";", r.Assignments
                .OrderBy(a => a.PaidTimeRequestId)
                .Select(a => $"{a.PaidTimeRequestId}:{a.Status}:{a.AssignedCompSlotId}:{a.AssignedOrder}"));
            BareAssign(namedResult).Should().Be(BareAssign(bareResult));

            // Audit actions + reasons (unscheduled reason codes, frozen) identical.
            string Audit(AutoScheduleResult r) => string.Join(";", r.Audit
                .OrderBy(a => a.PaidTimeRequestId).ThenBy(a => a.Action)
                .Select(a => $"{a.PaidTimeRequestId}:{a.Action}:{a.Reason}"));
            Audit(namedResult).Should().Be(Audit(bareResult));

            // Fingerprint unaffected by display names.
            string fpBare = PaidTimeRequest.ComputeAutoScheduleFingerprint(bare, candidateIds);
            string fpNamed = PaidTimeRequest.ComputeAutoScheduleFingerprint(named, candidateIds);
            fpNamed.Should().Be(fpBare);
        }

        // Same mix as EnrichedMixData but with no names set (placement inputs only).
        private static SchedulerData EnrichedMixDataWithoutNames()
        {
            SchedulerRequest frozen = new SchedulerRequest
            {
                PaidTimeRequestId = 200,
                HorseId = 700,
                RiderFederationMemberId = 970,
                CoachFederationMemberId = 7,
                DurationMinutes = 11,
                RequestedCompSlotId = 1,
                AssignedCompSlotId = 1,
                AssignedStartTime = new DateTime(2026, 8, 1, 8, 0, 0),
                AssignedOrder = 1,
                Status = "Assigned",
                SrequestDateTime = new DateTime(2026, 7, 18, 10, 0, 0)
            };

            return new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2, isPublished: true) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1, horseId: 501, riderId: 901, coachId: 8),
                    Pending(101, requestedSlotId: 2, horseId: 502, riderId: 902, coachId: 9),
                    frozen
                }
            };
        }

        // --- V2-1: PlacementKind / AdjacentSlotsTried reach the Preview DTO -------------------
        //
        // Note the Slot() helper above deliberately gives every slot its own ArenaId, which
        // makes adjacent fallback impossible under the same-arena rule. These two cases build
        // their own same-arena, same-day slots so the fallback path is actually exercised.

        private static SchedulerSlot SameArenaSlot(
            int id, string start, string end, int capacityMinutes = 240)
        {
            return new SchedulerSlot
            {
                PaidTimeSlotInCompId = id,
                SlotDate = new DateTime(2026, 8, 1),
                StartTimeRaw = start,
                EndTimeRaw = end,
                TotalCapacityMinutes = capacityMinutes,
                ArenaRanchId = 11,
                ArenaId = 2,
                ArenaName = "Arena 2",
                IsPublished = false
            };
        }

        [Fact]
        public void MapPreviewResponse_CarriesPlacementKind_ForAFallbackAssignment()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 29, 9, 0, 0),
                Slots = new List<SchedulerSlot>
                {
                    SameArenaSlot(1, "08:00:00", "10:00:00"),
                    SameArenaSlot(2, "10:00:00", "12:00:00", capacityMinutes: 0)
                },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 2, horseId: 501, riderId: 901, coachId: 8)
                }
            };

            List<int> candidateIds = Candidates(data);
            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateIds);
            AutoSchedulePreviewResponse preview = PaidTimeRequest.MapPreviewResponse(
                result, data, PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidateIds));

            PreviewScheduledItem item = preview.ScheduledItems.Single();
            item.PlacementKind.Should().Be(PlacementKinds.PreviousSameDay);
            // The user's original preference is reported unchanged alongside the fallback.
            item.RequestedCompSlotId.Should().Be(2);
            item.AssignedCompSlotId.Should().Be(1);
            item.AssignedArenaName.Should().Be("Arena 2");
        }

        [Fact]
        public void MapPreviewResponse_DefaultsPlacementKindToRequested_ForANormalAssignment()
        {
            SchedulerData data = BaselineData(new DateTime(2026, 7, 29, 9, 0, 0));
            List<int> candidateIds = Candidates(data);

            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateIds);
            AutoSchedulePreviewResponse preview = PaidTimeRequest.MapPreviewResponse(
                result, data, PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidateIds));

            preview.ScheduledItems.Single().PlacementKind.Should().Be(PlacementKinds.Requested);
        }

        [Fact]
        public void MapPreviewResponse_CarriesAdjacentSlotsTried_AndKeepsTheV20ReasonCode()
        {
            // Requested slot full, neighbour full -> the neighbour WAS tried, and the reason
            // stays the approved V2-0 capacity/coach string and code.
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 29, 9, 0, 0),
                Slots = new List<SchedulerSlot>
                {
                    SameArenaSlot(1, "08:00:00", "10:00:00", capacityMinutes: 0),
                    SameArenaSlot(2, "10:00:00", "12:00:00", capacityMinutes: 0)
                },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 2, horseId: 501, riderId: 901, coachId: 8)
                }
            };

            List<int> candidateIds = Candidates(data);
            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateIds);
            AutoSchedulePreviewResponse preview = PaidTimeRequest.MapPreviewResponse(
                result, data, PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidateIds));

            PreviewUnscheduledItem item = preview.UnscheduledItems.Single();
            item.AdjacentSlotsTried.Should().BeTrue();
            item.ReasonCode.Should().Be("NoFreeCapacityOrCoachBusy");
            item.Reason.Should().Be("אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)");
            item.RequestedCompSlotId.Should().Be(2);
        }

        [Fact]
        public void MapPreviewResponse_AdjacentSlotsTriedIsFalse_WhenNoNeighbourWasEligible()
        {
            // The only same-day neighbour is published -> skipped without an attempt.
            SchedulerSlot published = SameArenaSlot(1, "08:00:00", "10:00:00");
            published.IsPublished = true;

            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 29, 9, 0, 0),
                Slots = new List<SchedulerSlot>
                {
                    published,
                    SameArenaSlot(2, "10:00:00", "12:00:00", capacityMinutes: 0)
                },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 2, horseId: 501, riderId: 901, coachId: 8)
                }
            };

            List<int> candidateIds = Candidates(data);
            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateIds);
            AutoSchedulePreviewResponse preview = PaidTimeRequest.MapPreviewResponse(
                result, data, PaidTimeRequest.ComputeAutoScheduleFingerprint(data, candidateIds));

            preview.UnscheduledItems.Single().AdjacentSlotsTried.Should().BeFalse();
        }
    }
}
