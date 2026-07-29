using System.Text.Json;

namespace RideOnServer.BL.AutoScheduler
{
    // אלגוריתם השיבוץ האוטומטי - v1.
    //
    // עקרונות:
    // 1) FIFO (לפי srequestdatetime) - בקשה שנקלטה קודם מקבלת קדימות.
    // 2) Greedy fit - לכל בקשה, מחפש את הזמן המוקדם ביותר בסלוט המבוקש
    //    שלא מפר אילוצים קשיחים.
    // 3) אילוצים קשיחים תמיד נשמרים:
    //    - מאמן לא יכול להיות בשני מקומות באותו זמן.
    //    - מעבר בין מגרשים דורש 7 דק' מינימום.
    //    - קיבולת הסלוט (סך דקות).
    // 4) סלוטים פורסמו (isPublished=true) - לא נוגעים בשיבוצים שלהם.
    //
    // יורחב ב-v2 ל: re-shuffle pass, scoring להעדפות רכות,
    // אילוצי מטא-דאטה (adjacency, min-spacing, training order, hard time).
    public static class AutoScheduler
    {
        private const int TRANSITION_MINUTES = 7;

        public static AutoScheduleResult Schedule(SchedulerData data, IReadOnlyCollection<int> candidateRequestIds)
        {
            AutoScheduleResult result = new AutoScheduleResult
            {
                CompetitionId = data.CompetitionId,
                ExecutedAt = data.Now
            };

            if (candidateRequestIds == null)
            {
                throw new Exception("candidateRequestIds is required");
            }

            // מזהי-המועמדים נגזרים בשרת בלבד; לא מתקבלים מהלקוח.
            // 1. דחיית כפילויות מפורשת בקבוצת המועמדים.
            HashSet<int> candidateSet = new HashSet<int>();
            foreach (int id in candidateRequestIds)
            {
                if (!candidateSet.Add(id))
                {
                    throw new Exception($"Duplicate candidate request id: {id}");
                }
            }

            Dictionary<int, SchedulerSlot> slotById = data.Slots.ToDictionary(s => s.PaidTimeSlotInCompId);

            // אינדוקס הבקשות מה-snapshot; אימות שכל מזהה מופיע פעם אחת בדיוק.
            Dictionary<int, SchedulerRequest> requestById = new Dictionary<int, SchedulerRequest>();
            foreach (SchedulerRequest r in data.Requests)
            {
                if (requestById.ContainsKey(r.PaidTimeRequestId))
                {
                    throw new Exception($"Duplicate request {r.PaidTimeRequestId} in scheduler data");
                }
                requestById[r.PaidTimeRequestId] = r;
            }

            // 2. אימות: כל מועמד קיים ב-snapshot, ובמצב Pending ולא-משובץ.
            //    לא מדלגים בשקט על מועמד מבוקש.
            foreach (int id in candidateSet)
            {
                if (!requestById.TryGetValue(id, out SchedulerRequest? cand))
                {
                    throw new Exception($"Candidate request {id} not found in scheduler data");
                }
                if (cand.Status != "Pending" || cand.AssignedCompSlotId != null)
                {
                    throw new Exception($"Candidate request {id} is not Pending/unassigned");
                }
            }

            // 3. Place-new-only: כל בקשה קיימת במצב Assigned נחשבת קבועה (ללא תלות
            //    ב-allocationOrigin) - לא זזה, לא מוחלפת, ולא מקבלת החלטה. זורעים את
            //    המרווח התפוס שלה לצירי-הזמן של הסלוט ושל המאמן, ומחשבים את המקסימום
            //    של assignedOrder הקיים בכל סלוט (בסיס ל-max+1).
            CoachTimeline coachTimelines = new CoachTimeline();
            SlotTimeline slotTimelines = new SlotTimeline();
            // תפוסת רוכב/סוס (V2-0): חפיפה טהורה לפי Interval, ללא מרווח-מעבר,
            // על פני כל הסלוטים/המגרשים/התאריכים בתחרות.
            EntityTimeline riderTimelines = new EntityTimeline();
            EntityTimeline horseTimelines = new EntityTimeline();
            Dictionary<int, int> maxOrderBySlot = new Dictionary<int, int>();

            foreach (SchedulerRequest req in data.Requests)
            {
                if (req.Status != "Assigned")
                {
                    continue;
                }

                if (req.AssignedCompSlotId.HasValue
                    && req.AssignedStartTime.HasValue
                    && slotById.TryGetValue(req.AssignedCompSlotId.Value, out SchedulerSlot? assignedSlot))
                {
                    Interval interval = new Interval(
                        req.AssignedStartTime.Value,
                        req.AssignedStartTime.Value.AddMinutes(req.DurationMinutes)
                    );

                    coachTimelines.Add(req.CoachFederationMemberId, assignedSlot, interval);
                    slotTimelines.Add(assignedSlot.PaidTimeSlotInCompId, interval);
                    // שיבוץ קפוא זורע גם תפוסת רוכב/סוס - בקשה חדשה לא תחפוף עליו.
                    riderTimelines.Add(req.RiderFederationMemberId, interval);
                    horseTimelines.Add(req.HorseId, interval);
                }

                if (req.AssignedCompSlotId.HasValue && req.AssignedOrder.HasValue)
                {
                    int sid = req.AssignedCompSlotId.Value;
                    if (!maxOrderBySlot.TryGetValue(sid, out int cur) || req.AssignedOrder.Value > cur)
                    {
                        maxOrderBySlot[sid] = req.AssignedOrder.Value;
                    }
                }

                result.Audit.Add(new AuditLogEntry
                {
                    PaidTimeRequestId = req.PaidTimeRequestId,
                    Action = "kept-frozen",
                    Reason = "שיבוץ קיים - נשמר במקומו",
                    NewSlotId = req.AssignedCompSlotId,
                    NewStartTime = req.AssignedStartTime
                });

                result.FrozenCount++;
            }

            // 4. משבצים אך ורק את המועמדים, לפי FIFO. החלטה אחת בדיוק לכל מועמד.
            List<SchedulerRequest> candidates = candidateSet
                .Select(id => requestById[id])
                .OrderBy(r => r.SrequestDateTime)
                .ThenBy(r => r.PaidTimeRequestId)
                .ToList();

            foreach (SchedulerRequest req in candidates)
            {
                if (!slotById.TryGetValue(req.RequestedCompSlotId, out SchedulerSlot? requestedSlot))
                {
                    AddPendingDecision(result, req, "הסלוט המבוקש לא נמצא");
                    continue;
                }

                // אם הסלוט המבוקש פורסם - לא משתבץ אוטומטית (שייך למזכירה).
                if (requestedSlot.IsPublished)
                {
                    AddPendingDecision(result, req, "הסלוט המבוקש פורסם - שיבוץ ידני נדרש", requestedSlot.PaidTimeSlotInCompId);
                    continue;
                }

                Interval? placement = TryFindPlacement(
                    req, requestedSlot, coachTimelines, slotTimelines,
                    riderTimelines, horseTimelines, out UnscheduledCause cause);

                if (placement.HasValue)
                {
                    coachTimelines.Add(req.CoachFederationMemberId, requestedSlot, placement.Value);
                    slotTimelines.Add(requestedSlot.PaidTimeSlotInCompId, placement.Value);
                    riderTimelines.Add(req.RiderFederationMemberId, placement.Value);
                    horseTimelines.Add(req.HorseId, placement.Value);

                    // assignedOrder: max הקיים בסלוט + 1 (דטרמיניסטי, לפי סדר העיבוד היציב).
                    // אין הסתמכות על ספירת המשובצים (פערים עלולים לגרום להתנגשות).
                    int slotId = requestedSlot.PaidTimeSlotInCompId;
                    int baseMax = maxOrderBySlot.TryGetValue(slotId, out int m) ? m : 0;
                    int order = baseMax + 1;
                    maxOrderBySlot[slotId] = order;

                    result.Assignments.Add(new AssignmentDecision
                    {
                        PaidTimeRequestId = req.PaidTimeRequestId,
                        HorseId = req.HorseId,
                        CoachFederationMemberId = req.CoachFederationMemberId,
                        AssignedCompSlotId = slotId,
                        AssignedStartTime = placement.Value.Start,
                        AssignedOrder = order,
                        Status = "Assigned"
                    });

                    result.Audit.Add(new AuditLogEntry
                    {
                        PaidTimeRequestId = req.PaidTimeRequestId,
                        Action = "scheduled",
                        Reason = "FIFO greedy",
                        PreviousSlotId = req.AssignedCompSlotId,
                        NewSlotId = slotId,
                        NewStartTime = placement.Value.Start
                    });

                    result.ScheduledCount++;
                }
                else
                {
                    AddPendingDecision(result, req, ReasonForCause(cause));
                }
            }

            // 5. אימות שוויון-קבוצות: מזהי-ההחלטות == קבוצת-המועמדים, ללא כפילויות.
            HashSet<int> decisionIds = new HashSet<int>();
            foreach (AssignmentDecision d in result.Assignments)
            {
                if (!decisionIds.Add(d.PaidTimeRequestId))
                {
                    throw new Exception($"Duplicate decision for request {d.PaidTimeRequestId}");
                }
            }
            if (!decisionIds.SetEquals(candidateSet))
            {
                throw new Exception("Decision set does not equal candidate set");
            }

            return result;
        }

        // מוסיף החלטת Pending יחידה (ללא שדות-שיבוץ), רישום ביקורת ומונה.
        private static void AddPendingDecision(
            AutoScheduleResult result,
            SchedulerRequest req,
            string reason,
            int? requestedSlotId = null)
        {
            result.Assignments.Add(new AssignmentDecision
            {
                PaidTimeRequestId = req.PaidTimeRequestId,
                HorseId = req.HorseId,
                CoachFederationMemberId = req.CoachFederationMemberId,
                Status = "Pending"
            });

            result.Audit.Add(new AuditLogEntry
            {
                PaidTimeRequestId = req.PaidTimeRequestId,
                Action = "unscheduled",
                Reason = reason,
                NewSlotId = requestedSlotId
            });

            result.UnscheduledCount++;
        }

        // ממפה סיבת אי-שיבוץ ממוקדת למחרוזת ההצגה (Hebrew). קיבולת/מאמן נשמרת
        // כמחרוזת הקיימת ללא שינוי; רוכב/סוס מקבלים מחרוזת ייעודית.
        private static string ReasonForCause(UnscheduledCause cause)
        {
            switch (cause)
            {
                case UnscheduledCause.Rider:
                    return "אין מקום פנוי בסלוט המבוקש (הרוכב תפוס בזמן חופף)";
                case UnscheduledCause.Horse:
                    return "אין מקום פנוי בסלוט המבוקש (הסוס תפוס בזמן חופף)";
                default:
                    return "אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)";
            }
        }

        // מנסה למצוא את הזמן המוקדם ביותר בסלוט שמתאים לבקשה ולא מפר אילוצי
        // קיבולת/מאמן/רוכב/סוס. מדווח דרך cause את "הסיבה הכובלת" - השלב העמוק
        // ביותר שאליו הגיע מועמד-זמן כלשהו לפני שנחסם, כדי שכשל-קיבולת לעולם
        // לא יסומן כרוכב/סוס ולהפך.
        private static Interval? TryFindPlacement(
            SchedulerRequest req,
            SchedulerSlot slot,
            CoachTimeline coachTimelines,
            SlotTimeline slotTimelines,
            EntityTimeline riderTimelines,
            EntityTimeline horseTimelines,
            out UnscheduledCause cause)
        {
            // ברירת מחדל: קיבולת/מאמן (כולל קיבולת, גבולות, חפיפת-סלוט, מאמן).
            cause = UnscheduledCause.CapacityOrCoach;

            DateTime slotStart = slot.SlotDate.Date.Add(slot.StartTime);
            DateTime slotEnd = slot.SlotDate.Date.Add(slot.EndTime);

            // קיבולת: סך דקות שכבר תפוסות בסלוט + הבקשה הנוכחית <= קיבולת.
            // כשל קיבולת חוזר מוקדם ולעולם אינו מסומן כרוכב/סוס.
            int usedMinutes = slotTimelines.GetUsedMinutes(slot.PaidTimeSlotInCompId);
            if (usedMinutes + req.DurationMinutes > slot.TotalCapacityMinutes)
            {
                return null;
            }

            // מנסה את הקצה המוקדם ביותר של הסלוט; אם תפוס - אחרי כל קטע תפוס.
            List<Interval> busyInSlot = slotTimelines.GetIntervals(slot.PaidTimeSlotInCompId);
            List<DateTime> candidateStarts = new List<DateTime> { slotStart };
            foreach (Interval i in busyInSlot)
            {
                candidateStarts.Add(i.End);
            }
            candidateStarts = candidateStarts.OrderBy(t => t).ToList();

            foreach (DateTime startCandidate in candidateStarts)
            {
                DateTime endCandidate = startCandidate.AddMinutes(req.DurationMinutes);

                if (endCandidate > slotEnd) continue;

                Interval candidate = new Interval(startCandidate, endCandidate);

                // לא יחפוף עם תפוסה קיימת בסלוט.
                if (slotTimelines.OverlapsAny(slot.PaidTimeSlotInCompId, candidate)) continue;

                // המאמן לא תפוס (כולל מעבר 7 דק' אם בא ממגרש אחר). התנהגות מאמן לא שונתה.
                if (!coachTimelines.IsCoachAvailable(req.CoachFederationMemberId, slot, candidate, TRANSITION_MINUTES)) continue;

                // מכאן והלאה - עבר קיבולת/גבולות/סלוט/מאמן; חוסמי רוכב/סוס בלבד.
                // הרוכב לא תפוס (חפיפה טהורה, ללא מרווח-מעבר).
                if (riderTimelines.IsBusy(req.RiderFederationMemberId, candidate))
                {
                    // מקדם ל-Rider רק אם טרם נמצא חוסם עמוק יותר (Horse).
                    if (cause == UnscheduledCause.CapacityOrCoach)
                    {
                        cause = UnscheduledCause.Rider;
                    }
                    continue;
                }

                // הסוס לא תפוס (חפיפה טהורה, ללא מרווח-מעבר).
                if (horseTimelines.IsBusy(req.HorseId, candidate))
                {
                    // Horse הוא השלב העמוק ביותר - תמיד גובר.
                    cause = UnscheduledCause.Horse;
                    continue;
                }

                return candidate;
            }

            return null;
        }
    }

    // סיבת אי-שיבוץ ממוקדת, נגזרת דטרמיניסטית מ-TryFindPlacement (V2-0).
    public enum UnscheduledCause
    {
        CapacityOrCoach,
        Rider,
        Horse
    }

    // טווח זמנים סגור-פתוח: [Start, End).
    public readonly struct Interval
    {
        public DateTime Start { get; }
        public DateTime End { get; }

        public Interval(DateTime start, DateTime end)
        {
            Start = start;
            End = end;
        }

        public bool Overlaps(Interval other)
        {
            return Start < other.End && other.Start < End;
        }

        public int DurationMinutes => (int)(End - Start).TotalMinutes;
    }

    // ניהול תפוסת מאמן: רשימה של (Slot, Interval) לכל מאמן.
    public class CoachTimeline
    {
        private readonly Dictionary<int, List<(SchedulerSlot slot, Interval interval)>> _byCoach = new();

        public void Add(int coachId, SchedulerSlot slot, Interval interval)
        {
            if (!_byCoach.ContainsKey(coachId))
            {
                _byCoach[coachId] = new List<(SchedulerSlot, Interval)>();
            }
            _byCoach[coachId].Add((slot, interval));
        }

        public bool IsCoachAvailable(int coachId, SchedulerSlot newSlot, Interval newInterval, int transitionMinutes)
        {
            if (!_byCoach.TryGetValue(coachId, out List<(SchedulerSlot slot, Interval interval)>? items))
            {
                return true;
            }

            string newArenaKey = newSlot.ArenaKey;

            foreach ((SchedulerSlot slot, Interval interval) item in items)
            {
                Interval expanded = item.interval;
                if (item.slot.ArenaKey != newArenaKey)
                {
                    expanded = new Interval(
                        item.interval.Start.AddMinutes(-transitionMinutes),
                        item.interval.End.AddMinutes(transitionMinutes)
                    );
                }
                if (expanded.Overlaps(newInterval))
                {
                    return false;
                }
            }

            return true;
        }
    }

    // ניהול תפוסת סלוט: רשימת קטעים תפוסים לכל סלוט.
    public class SlotTimeline
    {
        private readonly Dictionary<int, List<Interval>> _bySlot = new();

        public void Add(int slotId, Interval interval)
        {
            if (!_bySlot.ContainsKey(slotId))
            {
                _bySlot[slotId] = new List<Interval>();
            }
            _bySlot[slotId].Add(interval);
        }

        public List<Interval> GetIntervals(int slotId)
        {
            return _bySlot.TryGetValue(slotId, out List<Interval>? list)
                ? list
                : new List<Interval>();
        }

        public bool OverlapsAny(int slotId, Interval candidate)
        {
            if (!_bySlot.TryGetValue(slotId, out List<Interval>? list)) return false;
            foreach (Interval i in list)
            {
                if (i.Overlaps(candidate)) return true;
            }
            return false;
        }

        public int GetUsedMinutes(int slotId)
        {
            if (!_bySlot.TryGetValue(slotId, out List<Interval>? list)) return 0;
            return list.Sum(i => i.DurationMinutes);
        }

        public int GetCount(int slotId)
        {
            return _bySlot.TryGetValue(slotId, out List<Interval>? list) ? list.Count : 0;
        }
    }

    // ניהול תפוסת ישות בודדת (רוכב או סוס): רשימת קטעים תפוסים לכל מזהה-ישות.
    // חפיפה טהורה לפי Interval, ללא מרווח-מעבר (שונה מ-CoachTimeline, שמוסיף 7 דק'
    // בין מגרשים). משמש לאכיפת אי-חפיפה של אותו רוכב/סוס על פני כל הסלוטים בתחרות.
    public class EntityTimeline
    {
        private readonly Dictionary<int, List<Interval>> _byEntity = new();

        public void Add(int entityId, Interval interval)
        {
            if (!_byEntity.ContainsKey(entityId))
            {
                _byEntity[entityId] = new List<Interval>();
            }
            _byEntity[entityId].Add(interval);
        }

        public bool IsBusy(int entityId, Interval candidate)
        {
            if (!_byEntity.TryGetValue(entityId, out List<Interval>? list))
            {
                return false;
            }
            foreach (Interval i in list)
            {
                if (i.Overlaps(candidate))
                {
                    return true;
                }
            }
            return false;
        }
    }
}
