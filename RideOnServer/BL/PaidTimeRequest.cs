using System.Globalization;
using System.Security.Cryptography;
using System.Text;
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

        // תצוגה מקדימה (שלב A): קורא snapshot אחד (read-only), גוזר את המועמדים
        // הידניים (Pending ולא-משובצים), מריץ את *אותו* אלגוריתם ללא כתיבה, מחשב
        // Fingerprint דטרמיניסטי, וממפה לתוצאת-תצוגה. אין כאן שום מסלול כתיבה.
        internal static AutoSchedulePreviewResponse PreviewAutoSchedule(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            // טעינת snapshot יחיד (פרוצדורה 128 - קריאה בלבד). ממנו גוזרים גם
            // מועמדים, גם את תוצאת האלגוריתם וגם את ה-Fingerprint.
            AutoSchedulerDAL dal = new AutoSchedulerDAL();
            SchedulerData data = dal.GetAutoSchedulerData(competitionId);

            // מועמדים ידניים = כל הבקשות במצב Pending ולא-משובצות (זהה למסלול הידני).
            List<int> candidateIds = data.Requests
                .Where(r => r.Status == "Pending" && r.AssignedCompSlotId == null)
                .Select(r => r.PaidTimeRequestId)
                .ToList();

            AutoScheduleResult result =
                AutoSchedulerService.PreviewForCompetition(data, competitionId, candidateIds);

            string fingerprint = ComputeAutoScheduleFingerprint(data, candidateIds);

            return MapPreviewResponse(result, data, fingerprint);
        }

        // ממפה את תוצאת האלגוריתם לתגובת התצוגה המקדימה. שדות התצוגה (שמות)
        // נשארים ריקים/NULL בשלב A וימולאו בשלב B מ-snapshot מועשר.
        //
        // public (ולא private) לצורך בדיקות-יחידה טהורות ללא DB, לפי מוסכמת הפרויקט
        // (כמו PredictionService.ComputePrediction) - במקום InternalsVisibleTo.
        public static AutoSchedulePreviewResponse MapPreviewResponse(
            AutoScheduleResult result,
            SchedulerData data,
            string fingerprint)
        {
            Dictionary<int, SchedulerRequest> requestById = new Dictionary<int, SchedulerRequest>();
            foreach (SchedulerRequest r in data.Requests)
            {
                requestById[r.PaidTimeRequestId] = r;
            }

            // חיפוש מגרש לפי מזהה-סלוט: שם-המגרש המשובץ נגזר מרשימת הסלוטים
            // הקיימת (data.Slots), שכבר נושאת arenaName. אין צורך בשדה SQL נוסף.
            Dictionary<int, SchedulerSlot> slotById = new Dictionary<int, SchedulerSlot>();
            foreach (SchedulerSlot s in data.Slots)
            {
                slotById[s.PaidTimeSlotInCompId] = s;
            }

            Dictionary<int, AssignmentDecision> decisionByRequestId =
                result.Assignments.ToDictionary(a => a.PaidTimeRequestId);

            List<PreviewScheduledItem> scheduledItems = result.Assignments
                .Where(a =>
                    a.Status == "Assigned"
                    && a.AssignedCompSlotId.HasValue
                    && a.AssignedStartTime.HasValue)
                .OrderBy(a => a.AssignedStartTime)
                .Select(a =>
                {
                    requestById.TryGetValue(a.PaidTimeRequestId, out SchedulerRequest? req);
                    return new PreviewScheduledItem
                    {
                        PaidTimeRequestId = a.PaidTimeRequestId,
                        HorseId = a.HorseId,
                        CoachFederationMemberId = a.CoachFederationMemberId,
                        AssignedCompSlotId = a.AssignedCompSlotId!.Value,
                        AssignedStartTime = a.AssignedStartTime!.Value,
                        AssignedOrder = a.AssignedOrder ?? 0,
                        EffectiveDurationMinutes = req?.DurationMinutes ?? 0,
                        RequestedCompSlotId = req?.RequestedCompSlotId ?? 0,
                        RiderFederationMemberId = req?.RiderFederationMemberId,
                        HorseName = req?.HorseName ?? string.Empty,
                        BarnName = req?.BarnName,
                        RiderName = req?.RiderName ?? string.Empty,
                        CoachName = req?.CoachName,
                        PayerName = req?.PayerName ?? string.Empty,
                        AssignedArenaName = ResolveArenaName(slotById, a.AssignedCompSlotId!.Value)
                    };
                })
                .ToList();

            List<PreviewUnscheduledItem> unscheduledItems = result.Audit
                .Where(x => x.Action == "unscheduled")
                .Select(x =>
                {
                    decisionByRequestId.TryGetValue(x.PaidTimeRequestId, out AssignmentDecision? d);
                    requestById.TryGetValue(x.PaidTimeRequestId, out SchedulerRequest? req);
                    return new PreviewUnscheduledItem
                    {
                        PaidTimeRequestId = x.PaidTimeRequestId,
                        HorseId = d?.HorseId ?? req?.HorseId ?? 0,
                        CoachFederationMemberId = d?.CoachFederationMemberId ?? req?.CoachFederationMemberId,
                        RequestedCompSlotId = req?.RequestedCompSlotId ?? 0,
                        Reason = x.Reason ?? "לא צוינה סיבה",
                        ReasonCode = MapUnscheduledReasonCode(x.Reason),
                        HorseName = req?.HorseName ?? string.Empty,
                        BarnName = req?.BarnName,
                        RiderName = req?.RiderName ?? string.Empty,
                        CoachName = req?.CoachName
                    };
                })
                .ToList();

            List<PreviewFrozenItem> frozenItems = result.Audit
                .Where(x => x.Action == "kept-frozen")
                .Select(x =>
                {
                    requestById.TryGetValue(x.PaidTimeRequestId, out SchedulerRequest? req);
                    return new PreviewFrozenItem
                    {
                        PaidTimeRequestId = x.PaidTimeRequestId,
                        HorseId = req?.HorseId ?? 0,
                        CoachFederationMemberId = req?.CoachFederationMemberId,
                        AssignedCompSlotId = req?.AssignedCompSlotId ?? x.NewSlotId ?? 0,
                        AssignedStartTime = req?.AssignedStartTime ?? x.NewStartTime,
                        AssignedOrder = req?.AssignedOrder,
                        HorseName = req?.HorseName ?? string.Empty,
                        BarnName = req?.BarnName,
                        AssignedArenaName = ResolveArenaName(slotById, req?.AssignedCompSlotId ?? x.NewSlotId ?? 0)
                    };
                })
                .ToList();

            return new AutoSchedulePreviewResponse
            {
                Fingerprint = fingerprint,
                GeneratedAt = data.Now,
                ScheduledCount = result.ScheduledCount,
                UnscheduledCount = result.UnscheduledCount,
                FrozenCount = result.FrozenCount,
                ScheduledItems = scheduledItems,
                UnscheduledItems = unscheduledItems,
                FrozenItems = frozenItems
            };
        }

        // ממפה את מחרוזת-הסיבה של האלגוריתם לקוד-סיבה מובנה. ההתאמה היא מול
        // המחרוזות המדויקות שב-AutoScheduler; שינוי טקסט שם יפיל לקוד "Unknown"
        // (לא לשגיאה). שלב עתידי יכול להעביר את הקודים לתוך האלגוריתם עצמו.
        // שם-המגרש המשובץ (שלב B, תצוגה בלבד) נגזר מרשימת הסלוטים שכבר בתמונת-המצב.
        // סלוט לא-נמצא -> מחרוזת ריקה (לא NULL, לעקביות עם חוזה ה-DTO).
        private static string ResolveArenaName(Dictionary<int, SchedulerSlot> slotById, int slotId)
        {
            return slotById.TryGetValue(slotId, out SchedulerSlot? slot) ? slot.ArenaName : string.Empty;
        }

        private static string MapUnscheduledReasonCode(string? reason)
        {
            switch (reason)
            {
                case "הסלוט המבוקש לא נמצא":
                    return "RequestedSlotMissing";
                case "הסלוט המבוקש פורסם - שיבוץ ידני נדרש":
                    return "RequestedSlotPublished";
                case "אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)":
                    return "NoFreeCapacityOrCoachBusy";
                default:
                    return "Unknown";
            }
        }

        // Fingerprint דטרמיניסטי ששומר על *המשמעות* של ההצעה שהמזכירה אישרה, לא רק
        // על תקֵפות המיקום. הוא כולל:
        //   1) קלטי-שיבוץ שיכולים לשנות את התוכנית (סלוטים, סטטוס/שיבוץ/משך/מאמן/
        //      סלוט-מבוקש/זמן-קליטה של בקשות, וקבוצת-המועמדים);
        //   2) זהות הישויות שהוצגו בהצעה - HorseId ו-RiderFederationMemberId. אם
        //      בקשה תפנה מאוחר יותר לסוס/רוכב אחר, גם אם הזמן המשובץ לא היה משתנה,
        //      ההצעה שהמזכירה אישרה כבר אינה נכונה ולכן חייבת להיחשב מיושנת.
        // אין אילוץ-DB או מסלול-עדכון אכיף המונע שינוי של horseid/riderfederationmemberid
        // ב-servicerequest, ולכן אסור להסתמך על "אי-שינוי בפועל" ואלה נכללים במפורש.
        // *מוחרג במכוון:* data.Now - אינו משפיע על השיבוץ ואינו חלק ממשמעות ההצעה;
        // הכללתו הייתה משנה כל fingerprint בכל קריאה ושוברת את התאמת Apply.
        // מיון יציב לפי מזהה מבטיח קלט קנוני. SHA-256 -> hex.
        //
        // public (ולא private) לצורך בדיקות-יחידה טהורות ללא DB, לפי מוסכמת הפרויקט
        // (כמו PredictionService.ComputePrediction) - במקום InternalsVisibleTo.
        public static string ComputeAutoScheduleFingerprint(SchedulerData data, List<int> candidateIds)
        {
            StringBuilder sb = new StringBuilder();

            sb.Append("comp=").Append(data.CompetitionId).Append('\n');

            sb.Append("cand=");
            foreach (int id in candidateIds.OrderBy(x => x))
            {
                sb.Append(id).Append(',');
            }
            sb.Append('\n');

            sb.Append("slots=\n");
            foreach (SchedulerSlot s in data.Slots.OrderBy(x => x.PaidTimeSlotInCompId))
            {
                sb.Append(s.PaidTimeSlotInCompId).Append('|')
                  .Append(s.SlotDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)).Append('|')
                  .Append(s.StartTimeRaw).Append('|')
                  .Append(s.EndTimeRaw).Append('|')
                  .Append(s.TotalCapacityMinutes).Append('|')
                  .Append(s.ArenaKey).Append('|')
                  .Append(s.IsPublished ? "1" : "0").Append('\n');
            }

            sb.Append("reqs=\n");
            foreach (SchedulerRequest r in data.Requests.OrderBy(x => x.PaidTimeRequestId))
            {
                sb.Append(r.PaidTimeRequestId).Append('|')
                  .Append(r.Status).Append('|')
                  .Append(r.RequestedCompSlotId).Append('|')
                  .Append(r.AssignedCompSlotId?.ToString(CultureInfo.InvariantCulture) ?? string.Empty).Append('|')
                  .Append(r.AssignedStartTime?.ToString("o", CultureInfo.InvariantCulture) ?? string.Empty).Append('|')
                  .Append(r.AssignedOrder?.ToString(CultureInfo.InvariantCulture) ?? string.Empty).Append('|')
                  .Append(r.DurationMinutes).Append('|')
                  .Append(r.CoachFederationMemberId).Append('|')
                  .Append(r.HorseId).Append('|')
                  .Append(r.RiderFederationMemberId).Append('|')
                  .Append(r.SrequestDateTime.ToString("o", CultureInfo.InvariantCulture)).Append('\n');
            }

            using SHA256 sha = SHA256.Create();
            byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(sb.ToString()));
            return Convert.ToHexString(hash);
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