using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.AutoScheduler;

namespace RideOnServer.Tests
{
    // DB-free coverage of the NEW Stage D1 Apply gate:
    // PaidTimeRequest.BuildVerifiedApplyPlan — the pure fingerprint verification +
    // server-side recomputation that decides EXACTLY what is handed to the DAL /
    // usp_applyautoschedule. These build an in-memory SchedulerData and call the
    // pure method directly — no database, no controller, no writes.
    //
    // The gate throws BEFORE producing any plan on a stale/invalid fingerprint, so
    // "mismatch performs no DAL Apply call" is proven structurally: the outer
    // PaidTimeRequest.ApplyAutoSchedule only reaches dal.ApplyAutoSchedule after the
    // gate returns a plan.
    public class AutoScheduleApplyTests
    {
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

        private static SchedulerRequest Pending(int id, int requestedSlotId, int coachId = 7)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = 500 + id,
                CoachFederationMemberId = coachId,
                RiderFederationMemberId = 900 + id,
                DurationMinutes = 11,
                RequestedCompSlotId = requestedSlotId,
                Status = "Pending",
                SrequestDateTime = new DateTime(2026, 7, 20, 10, 0, 0).AddMinutes(id)
            };
        }

        private static SchedulerRequest Assigned(int id, int slotId, int order = 1)
        {
            return new SchedulerRequest
            {
                PaidTimeRequestId = id,
                HorseId = 700 + id,
                CoachFederationMemberId = 7,
                RiderFederationMemberId = 950 + id,
                DurationMinutes = 11,
                RequestedCompSlotId = slotId,
                AssignedCompSlotId = slotId,
                AssignedStartTime = new DateTime(2026, 8, 1, 8, 0, 0),
                AssignedOrder = order,
                Status = "Assigned",
                SrequestDateTime = new DateTime(2026, 7, 18, 10, 0, 0)
            };
        }

        private static List<int> Candidates(SchedulerData data)
        {
            return data.Requests
                .Where(r => r.Status == "Pending" && r.AssignedCompSlotId == null)
                .Select(r => r.PaidTimeRequestId)
                .ToList();
        }

        // The fingerprint the client would have received from Preview for this snapshot.
        private static string PreviewFingerprint(SchedulerData data)
        {
            return PaidTimeRequest.ComputeAutoScheduleFingerprint(data, Candidates(data));
        }

        private static SchedulerData OneFittingPending()
        {
            return new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1) },
                Requests = new List<SchedulerRequest> { Pending(100, requestedSlotId: 1) }
            };
        }

        // Canonical "id:status:slot:order" projection of a decision set, for comparing
        // the plan's decisions against a direct algorithm run.
        private static string DecisionKey(IEnumerable<AssignmentDecision> decisions)
        {
            return string.Join(";", decisions
                .OrderBy(a => a.PaidTimeRequestId)
                .Select(a => $"{a.PaidTimeRequestId}:{a.Status}:{a.AssignedCompSlotId}:{a.AssignedOrder}"));
        }

        // --- 1: matching fingerprint applies the freshly recomputed proposal ------------------

        [Fact]
        public void BuildVerifiedApplyPlan_MatchingFingerprint_ProducesServerRecomputedAssignedPlan()
        {
            SchedulerData data = OneFittingPending();
            string fingerprint = PreviewFingerprint(data);

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.CompetitionId.Should().Be(41);
            plan.Decisions.Should().HaveCount(1);

            AssignmentDecision decision = plan.Decisions.Single();
            decision.PaidTimeRequestId.Should().Be(100);
            decision.Status.Should().Be("Assigned");
            decision.AssignedCompSlotId.Should().Be(1);
            decision.AssignedOrder.Should().Be(1);
        }

        // --- 2 & 3: mismatched fingerprint throws stale, before any plan/DAL ------------------

        [Fact]
        public void BuildVerifiedApplyPlan_MismatchedFingerprint_ThrowsStalePreview_AndProducesNoPlan()
        {
            SchedulerData data = OneFittingPending();

            // Any well-formed but non-matching fingerprint (64 hex chars, all zeros).
            string stale = new string('0', 64);

            Action act = () => PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, stale);

            // Throws before returning a plan -> the outer ApplyAutoSchedule never reaches
            // dal.ApplyAutoSchedule (no write).
            act.Should().Throw<StalePreviewException>();
        }

        [Fact]
        public void BuildVerifiedApplyPlan_FingerprintDriftAfterInputChange_IsDetectedAsStale()
        {
            // Client previews snapshot A, then the world changes to A' before Apply.
            SchedulerData original = OneFittingPending();
            string previewFingerprint = PreviewFingerprint(original);

            SchedulerData changed = OneFittingPending();
            changed.Slots[0].StartTimeRaw = "09:00:00"; // a real scheduling input changed

            Action act = () =>
                PaidTimeRequest.BuildVerifiedApplyPlan(changed, changed.CompetitionId, previewFingerprint);

            act.Should().Throw<StalePreviewException>();
        }

        // --- 4: uses server-generated decisions, never client assignments ---------------------

        [Fact]
        public void BuildVerifiedApplyPlan_Decisions_EqualDirectServerAlgorithmRun()
        {
            // The method accepts NO client assignments; its decisions must be byte-for-byte
            // the output of the server algorithm over the same snapshot + candidates.
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2, isPublished: true) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1), // -> scheduled
                    Pending(101, requestedSlotId: 2), // -> unscheduled (published slot)
                }
            };
            string fingerprint = PreviewFingerprint(data);

            AutoScheduleResult direct = AutoScheduler.Schedule(data, Candidates(data));

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            DecisionKey(plan.Decisions).Should().Be(DecisionKey(direct.Assignments));
        }

        // --- 5: empty / whitespace fingerprint is rejected (validation, not stale) -------------

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void BuildVerifiedApplyPlan_EmptyOrWhitespaceFingerprint_ThrowsValidation(string fingerprint)
        {
            SchedulerData data = OneFittingPending();

            Action act = () => PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            act.Should().Throw<ValidationException>();
        }

        // --- 6: empty candidate set is handled safely with zero assigned ----------------------

        [Fact]
        public void BuildVerifiedApplyPlan_NoPendingCandidates_MatchingFingerprint_ProducesEmptyApplyPlan()
        {
            // Only a frozen assignment exists; no pending candidates.
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1) },
                Requests = new List<SchedulerRequest> { Assigned(200, slotId: 1) }
            };
            string fingerprint = PreviewFingerprint(data); // computed over an empty candidate set

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.AllowedRequestIds.Should().BeEmpty();
            plan.Decisions.Should().BeEmpty();
            plan.Result.ScheduledCount.Should().Be(0);
            plan.Result.FrozenCount.Should().Be(1); // the existing assignment still surfaces as frozen
            // NOTE: the outer ApplyAutoSchedule hands these empty args to the DAL, which
            // short-circuits (returns 0) without invoking usp_applyautoschedule.
        }

        // --- 7: frozen assignments are never in the mutable candidate set ---------------------

        [Fact]
        public void BuildVerifiedApplyPlan_FrozenAssignment_IsExcludedFromAllowedRequestIds()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1) },
                Requests = new List<SchedulerRequest>
                {
                    Assigned(200, slotId: 1, order: 1), // frozen
                    Pending(100, requestedSlotId: 1)    // candidate
                }
            };
            string fingerprint = PreviewFingerprint(data);

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.AllowedRequestIds.Should().Contain(100);
            plan.AllowedRequestIds.Should().NotContain(200);
            plan.Result.FrozenCount.Should().Be(1);
            plan.Decisions.Select(d => d.PaidTimeRequestId).Should().NotContain(200);
        }

        // --- 8: unscheduled candidates remain Pending decisions -------------------------------

        [Fact]
        public void BuildVerifiedApplyPlan_UnschedulableCandidate_StaysPendingWithNoAllocation()
        {
            // Requested slot is published -> the candidate cannot be auto-scheduled.
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 41,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1, isPublished: true) },
                Requests = new List<SchedulerRequest> { Pending(100, requestedSlotId: 1) }
            };
            string fingerprint = PreviewFingerprint(data);

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            // Still in the allowed set (a decision is required for it), but Pending & unallocated.
            plan.AllowedRequestIds.Should().Contain(100);
            AssignmentDecision decision = plan.Decisions.Single(d => d.PaidTimeRequestId == 100);
            decision.Status.Should().Be("Pending");
            decision.AssignedCompSlotId.Should().BeNull();
            decision.AssignedStartTime.Should().BeNull();
            decision.AssignedOrder.Should().BeNull();
        }

        // --- 9: the plan carries the exact competitionId, allowed set, and complete decisions -

        [Fact]
        public void BuildVerifiedApplyPlan_PlanArguments_MatchCandidateSet_Completely()
        {
            SchedulerData data = new SchedulerData
            {
                CompetitionId = 77,
                Now = new DateTime(2026, 7, 23, 9, 0, 0),
                Slots = new List<SchedulerSlot> { Slot(1), Slot(2, isPublished: true) },
                Requests = new List<SchedulerRequest>
                {
                    Pending(100, requestedSlotId: 1),
                    Pending(101, requestedSlotId: 2),
                    Assigned(200, slotId: 1) // frozen, excluded
                }
            };
            List<int> candidateIds = Candidates(data);
            string fingerprint = PreviewFingerprint(data);

            AutoScheduleApplyPlan plan =
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            plan.CompetitionId.Should().Be(77);
            plan.AllowedRequestIds.Should().BeEquivalentTo(candidateIds);

            // Completeness: exactly one decision per allowed request (matches SP's contract).
            plan.Decisions.Select(d => d.PaidTimeRequestId)
                .Should().BeEquivalentTo(candidateIds);
        }

        // --- 10: Apply reuses Preview's exact fingerprint function (Preview unchanged) --------

        [Fact]
        public void BuildVerifiedApplyPlan_AcceptsExactlyThePreviewFingerprint()
        {
            SchedulerData data = OneFittingPending();

            // The fingerprint produced by the Preview path's function is accepted verbatim.
            string previewFingerprint =
                PaidTimeRequest.ComputeAutoScheduleFingerprint(data, Candidates(data));

            Action act = () =>
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, previewFingerprint);

            act.Should().NotThrow();
        }

        [Fact]
        public void BuildVerifiedApplyPlan_FingerprintComparison_IsCaseInsensitive()
        {
            SchedulerData data = OneFittingPending();
            string fingerprint = PreviewFingerprint(data).ToLowerInvariant();

            Action act = () =>
                PaidTimeRequest.BuildVerifiedApplyPlan(data, data.CompetitionId, fingerprint);

            act.Should().NotThrow();
        }

        // --- machine-readable stale contract --------------------------------------------------

        [Fact]
        public void StalePreviewException_ExposesStableMachineReadableCode()
        {
            StalePreviewException.Code.Should().Be("STALE_PREVIEW");
            new StalePreviewException("x").Should().BeAssignableTo<Exception>();
        }
    }
}
