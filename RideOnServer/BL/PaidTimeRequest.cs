using RideOnServer.BL.AutoScheduler;
using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class PaidTimeRequest : ServiceRequest
    {
        public int PriceCatalogId { get; set; }
        public int RequestedCompSlotId { get; set; }
        public int? AssignedCompSlotId { get; set; }
        public DateTime? AssignedStartTime { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }

        internal static int CreatePaidTimeRequest(CreatePaidTimeRequestRequest request)
        {
            ValidateCreateRequest(request);

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.CreatePaidTimeRequest(request);
        }

        internal static List<PaidTimeAssignmentItemResponse> GetPaidTimeRequestsForAssignment(
            int competitionId,
            int[] selectedCompSlotIds,
            bool includeAllPending)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (selectedCompSlotIds == null || selectedCompSlotIds.Length == 0)
            {
                throw new Exception("At least one selected slot is required");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.GetPaidTimeRequestsForAssignment(
                competitionId,
                selectedCompSlotIds,
                includeAllPending
            );
        }

        internal static void AssignPaidTimeRequest(AssignPaidTimeRequestRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.PaidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }

            if (request.AssignedCompSlotId <= 0)
            {
                throw new Exception("Invalid AssignedCompSlotId");
            }

            if (request.AssignedOrder <= 0)
            {
                throw new Exception("Invalid AssignedOrder");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.AssignPaidTimeRequest(request);
        }

        internal static void UnassignPaidTimeRequest(UnassignPaidTimeRequestRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.PaidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.UnassignPaidTimeRequest(request);
        }

        internal static BulkCreatePaidTimeRequestsResponse BulkCreate(BulkCreatePaidTimeRequestsRequest request, int createdByPersonId)
        {
            ValidateBulkCreateRequest(request);

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();

            List<PaidTimeSlotCapacityWarning> warnings = dal.CheckSlotCapacity(request.Items);
            List<PaidTimeSlotCapacityWarning> overflows = warnings
                .Where(w => w.WouldOverflow)
                .ToList();

            if (overflows.Count > 0 && !request.ConfirmedOverflow)
            {
                return new BulkCreatePaidTimeRequestsResponse
                {
                    Created = false,
                    Warnings = overflows,
                    Message = "סלוט אחד או יותר עומדים לחרוג מהקיבולת. אשר במפורש כדי להמשיך."
                };
            }

            (List<int> createdIds, int batchId) = dal.BulkCreatePaidTimeRequests(request, createdByPersonId);

            AutoSchedulerSummary? schedulingSummary = null;
            try
            {
                AutoScheduleResult schedResult = AutoSchedulerService.RunForCompetition(request.CompetitionId);

                HashSet<int> createdIdSet = new HashSet<int>(createdIds);

                Dictionary<int, AssignmentDecision> decisionByRequestId =
                    schedResult.Assignments.ToDictionary(a => a.PaidTimeRequestId);

                List<ScheduledRequestItem> scheduledItems = schedResult.Assignments
                    .Where(a =>
                        a.Status == "Assigned"
                        && a.AssignedCompSlotId.HasValue
                        && a.AssignedStartTime.HasValue
                        && createdIdSet.Contains(a.PaidTimeRequestId))
                    .OrderBy(a => a.AssignedStartTime)
                    .Select(a => new ScheduledRequestItem
                    {
                        PaidTimeRequestId = a.PaidTimeRequestId,
                        HorseId = a.HorseId,
                        CoachFederationMemberId = a.CoachFederationMemberId,
                        AssignedCompSlotId = a.AssignedCompSlotId!.Value,
                        AssignedStartTime = a.AssignedStartTime!.Value,
                        AssignedOrder = a.AssignedOrder ?? 0
                    })
                    .ToList();

                List<UnscheduledRequestItem> unscheduledItems = schedResult.Audit
                    .Where(a => a.Action == "unscheduled" && createdIdSet.Contains(a.PaidTimeRequestId))
                    .Select(a =>
                    {
                        decisionByRequestId.TryGetValue(a.PaidTimeRequestId, out AssignmentDecision? d);
                        return new UnscheduledRequestItem
                        {
                            PaidTimeRequestId = a.PaidTimeRequestId,
                            HorseId = d?.HorseId ?? 0,
                            CoachFederationMemberId = d?.CoachFederationMemberId ?? 0,
                            Reason = a.Reason ?? "לא צוינה סיבה"
                        };
                    })
                    .ToList();

                schedulingSummary = new AutoSchedulerSummary
                {
                    ScheduledCount = scheduledItems.Count,
                    UnscheduledCount = unscheduledItems.Count,
                    FrozenCount = schedResult.FrozenCount,
                    UnscheduledItems = unscheduledItems,
                    ScheduledItems = scheduledItems
                };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"AutoScheduler failed but bulk insert succeeded: {ex.Message}");
            }

            return new BulkCreatePaidTimeRequestsResponse
            {
                Created = true,
                BatchId = batchId,
                CreatedRequestIds = createdIds,
                Warnings = overflows,
                Message = $"נוצרו {createdIds.Count} בקשות בהצלחה",
                Scheduling = schedulingSummary
            };
        }

        internal static AutoSchedulerSummary RunAutoScheduler(int competitionId)
        {
            AutoScheduleResult schedResult = AutoSchedulerService.RunForCompetition(competitionId);

            List<UnscheduledRequestItem> unscheduledItems = schedResult.Audit
                .Where(a => a.Action == "unscheduled")
                .Select(a => new UnscheduledRequestItem
                {
                    PaidTimeRequestId = a.PaidTimeRequestId,
                    Reason = a.Reason ?? "לא צוינה סיבה"
                })
                .ToList();

            return new AutoSchedulerSummary
            {
                ScheduledCount = schedResult.ScheduledCount,
                UnscheduledCount = schedResult.UnscheduledCount,
                FrozenCount = schedResult.FrozenCount,
                UnscheduledItems = unscheduledItems
            };
        }

        private static void ValidateBulkCreateRequest(BulkCreatePaidTimeRequestsRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.OrderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (request.Items == null || request.Items.Count == 0)
            {
                throw new Exception("At least one item is required");
            }

            for (int i = 0; i < request.Items.Count; i++)
            {
                BulkPaidTimeRequestItem item = request.Items[i];

                if (item.HorseId <= 0)
                {
                    throw new Exception($"Invalid HorseId at item {i + 1}");
                }
                if (item.RiderFederationMemberId <= 0)
                {
                    throw new Exception($"Invalid RiderFederationMemberId at item {i + 1}");
                }
                if (item.CoachFederationMemberId <= 0)
                {
                    throw new Exception($"Invalid CoachFederationMemberId at item {i + 1}");
                }
                if (item.PaidByPersonId <= 0)
                {
                    throw new Exception($"Invalid PaidByPersonId at item {i + 1}");
                }
                if (item.PriceCatalogId <= 0)
                {
                    throw new Exception($"Invalid PriceCatalogId at item {i + 1}");
                }
                if (item.RequestedCompSlotId <= 0)
                {
                    throw new Exception($"Invalid RequestedCompSlotId at item {i + 1}");
                }
            }
        }

        private static void ValidateCreateRequest(CreatePaidTimeRequestRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.OrderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.HorseId <= 0)
            {
                throw new Exception("Invalid HorseId");
            }

            if (request.RiderFederationMemberId <= 0)
            {
                throw new Exception("Invalid RiderFederationMemberId");
            }

            if (request.CoachFederationMemberId <= 0)
            {
                throw new Exception("Invalid CoachFederationMemberId");
            }

            if (request.PaidByPersonId <= 0)
            {
                throw new Exception("Invalid PaidByPersonId");
            }

            if (request.PriceCatalogId <= 0)
            {
                throw new Exception("Invalid PriceCatalogId");
            }

            if (request.RequestedCompSlotId <= 0)
            {
                throw new Exception("Invalid RequestedCompSlotId");
            }
        }

        internal static List<MyCompetitionPaidTimeRequestItem> GetMyPaidTimeRequestsForCompetition(
            int competitionId,
            int orderedBySystemUserId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (orderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.GetMyPaidTimeRequestsForCompetition(competitionId, orderedBySystemUserId);
        }

        internal static void CancelMyPaidTimeRequest(int paidTimeRequestId, int orderedBySystemUserId)
        {
            if (paidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }
            if (orderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.CancelPaidTimeRequest(paidTimeRequestId, orderedBySystemUserId);
        }

        internal static void UpdateMyPaidTimeRequestNotes(int paidTimeRequestId, int orderedBySystemUserId, string? notes)
        {
            if (paidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }
            if (orderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.UpdatePaidTimeRequestNotes(paidTimeRequestId, orderedBySystemUserId, notes);
        }
    }
}