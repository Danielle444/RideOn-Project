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
            bool schedulingAttempted = false;
            bool? schedulingSucceeded = null;
            string? schedulingMessage = null;

            // ניסיון שיבוץ אוטומטי הוא תוצאה נפרדת מיצירת הבקשות. יצירת הבקשות
            // כבר הושלמה (committed); כשל שיבוץ אינו הופך את היצירה לכושלת.
            if (createdIds.Count > 0)
            {
                schedulingAttempted = true;
                try
                {
                    // מועמדים = בדיוק ה-createdIds שהוחזרו מההוספה בשרת (לא מהלקוח).
                    AutoScheduleResult schedResult = AutoSchedulerService.RunForCompetition(request.CompetitionId, createdIds);

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

                    schedulingSucceeded = true;
                }
                catch (Exception ex)
                {
                    // מתעדים את פרטי החריגה בצד-שרת בלבד; ללא חשיפת טקסט גולמי ללקוח.
                    Console.WriteLine($"AutoScheduler failed but bulk insert succeeded: {ex.Message}");
                    schedulingSucceeded = false;
                    schedulingSummary = null;
                    schedulingMessage = "הבקשות נוצרו בהצלחה, אך השיבוץ האוטומטי נכשל. ניתן לשבץ ידנית.";
                }
            }

            return new BulkCreatePaidTimeRequestsResponse
            {
                Created = true,
                BatchId = batchId,
                CreatedRequestIds = createdIds,
                Warnings = overflows,
                Message = $"נוצרו {createdIds.Count} בקשות בהצלחה",
                Scheduling = schedulingSummary,
                SchedulingAttempted = schedulingAttempted,
                SchedulingSucceeded = schedulingSucceeded,
                SchedulingMessage = schedulingMessage
            };
        }

        internal static AutoSchedulerSummary RunAutoScheduler(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            // טוענים snapshot אחד, וממנו גם גוזרים את המועמדים וגם משבצים
            // (מונע טעינה כפולה של נתוני-השיבוץ).
            AutoSchedulerDAL dal = new AutoSchedulerDAL();
            SchedulerData data = dal.GetAutoSchedulerData(competitionId);

            // מועמדים ידניים = כל הבקשות במצב Pending ולא-משובצות באותו snapshot.
            List<int> candidateIds = data.Requests
                .Where(r => r.Status == "Pending" && r.AssignedCompSlotId == null)
                .Select(r => r.PaidTimeRequestId)
                .ToList();

            AutoScheduleResult schedResult = AutoSchedulerService.RunForCompetition(data, competitionId, candidateIds);

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

        internal static List<SlotScheduleItem> GetSlotScheduleForViewing(int slotId, int competitionId, int ranchId)
        {
            if (slotId <= 0 || competitionId <= 0 || ranchId <= 0)
            {
                throw new Exception("Invalid request");
            }
            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.GetSlotScheduleForViewing(slotId, competitionId, ranchId);
        }

        internal static List<PublishedSlotItem> GetPublishedSlotsForCompetition(int competitionId, int ranchId)
        {
            if (competitionId <= 0 || ranchId <= 0)
            {
                throw new Exception("Invalid request");
            }
            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.GetPublishedSlotsForCompetition(competitionId, ranchId);
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

        internal static void CancelByPayer(int paidTimeRequestId, int payerPersonId)
        {
            if (paidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }
            if (payerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.CancelPaidTimeRequestByPayer(paidTimeRequestId, payerPersonId);
        }

        internal static void UpdateNotesByPayer(int paidTimeRequestId, int payerPersonId, string? notes)
        {
            if (paidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }
            if (payerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.UpdatePaidTimeNotesByPayer(paidTimeRequestId, payerPersonId, notes);
        }

        internal static void UpdateMyPaidTimeRequest(UpdatePaidTimeRequestNotesRequest request, int orderedBySystemUserId)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }
            if (request.PaidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }
            if (orderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            bool notesProvided = request.Notes != null;
            int? pcId = request.PriceCatalogId.HasValue && request.PriceCatalogId.Value > 0
                ? request.PriceCatalogId
                : null;
            int? slotId = request.RequestedCompSlotId.HasValue && request.RequestedCompSlotId.Value > 0
                ? request.RequestedCompSlotId
                : null;

            if (!notesProvided && !pcId.HasValue && !slotId.HasValue)
            {
                throw new Exception("No fields to update");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.UpdatePaidTimeRequest(
                request.PaidTimeRequestId,
                orderedBySystemUserId,
                request.Notes,
                notesProvided,
                pcId,
                slotId
            );
        }

        internal static List<DTOs.Competition.PaidTimeRequests.PaidTimeSlotRegistrationItem>
            GetPaidTimeSlotRegistrations(int slotInCompId, int secretarySystemUserId)
        {
            if (slotInCompId <= 0)
            {
                throw new Exception("Invalid SlotInCompId");
            }

            if (secretarySystemUserId <= 0)
            {
                throw new Exception("Invalid SecretarySystemUserId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.GetPaidTimeSlotRegistrations(slotInCompId, secretarySystemUserId);
        }

        internal static void TransferPaidTimeRequestToSlot(
            int paidTimeRequestId,
            int? newSlotInCompId,
            int secretarySystemUserId)
        {
            if (paidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }

            if (secretarySystemUserId <= 0)
            {
                throw new Exception("Invalid SecretarySystemUserId");
            }

            if (newSlotInCompId.HasValue && newSlotInCompId.Value <= 0)
            {
                throw new Exception("Invalid NewSlotInCompId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.TransferPaidTimeRequestToSlot(paidTimeRequestId, newSlotInCompId, secretarySystemUserId);
        }
    }
}