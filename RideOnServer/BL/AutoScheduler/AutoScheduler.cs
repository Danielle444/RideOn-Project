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

        public static AutoScheduleResult Schedule(SchedulerData data)
        {
            AutoScheduleResult result = new AutoScheduleResult
            {
                CompetitionId = data.CompetitionId,
                ExecutedAt = data.Now
            };

            Dictionary<int, SchedulerSlot> slotById = data.Slots.ToDictionary(s => s.PaidTimeSlotInCompId);
            Dictionary<int, SchedulerBatch> batchById = data.Batches.ToDictionary(b => b.BatchId);

            // 1. הפרדה: frozen (Assigned בסלוט פורסם) vs movable (כל השאר).
            List<SchedulerRequest> frozen = new List<SchedulerRequest>();
            List<SchedulerRequest> movable = new List<SchedulerRequest>();

            foreach (SchedulerRequest req in data.Requests)
            {
                if (req.Status == "Assigned"
                    && req.AssignedCompSlotId.HasValue
                    && slotById.TryGetValue(req.AssignedCompSlotId.Value, out SchedulerSlot? assignedSlot)
                    && assignedSlot.IsPublished)
                {
                    frozen.Add(req);
                }
                else
                {
                    movable.Add(req);
                }
            }

            // 2. בונה ציר זמן ראשוני של כל מאמן ושל כל סלוט מהקפואים.
            CoachTimeline coachTimelines = new CoachTimeline();
            SlotTimeline slotTimelines = new SlotTimeline();

            foreach (SchedulerRequest fr in frozen)
            {
                if (!fr.AssignedStartTime.HasValue || !fr.AssignedCompSlotId.HasValue) continue;
                SchedulerSlot slot = slotById[fr.AssignedCompSlotId.Value];

                Interval interval = new Interval(
                    fr.AssignedStartTime.Value,
                    fr.AssignedStartTime.Value.AddMinutes(fr.DurationMinutes)
                );

                coachTimelines.Add(fr.CoachFederationMemberId, slot, interval);
                slotTimelines.Add(slot.PaidTimeSlotInCompId, interval);

                result.Audit.Add(new AuditLogEntry
                {
                    PaidTimeRequestId = fr.PaidTimeRequestId,
                    Action = "kept-frozen",
                    Reason = "סלוט פורסם - השיבוץ נשמר",
                    NewSlotId = fr.AssignedCompSlotId,
                    NewStartTime = fr.AssignedStartTime
                });

                result.FrozenCount++;
            }

            // 3. ממיין את ה-movable לפי FIFO ועובר אחת אחת.
            List<SchedulerRequest> sorted = movable
                .OrderBy(r => r.SrequestDateTime)
                .ThenBy(r => r.PaidTimeRequestId)
                .ToList();

            foreach (SchedulerRequest req in sorted)
            {
                if (!slotById.TryGetValue(req.RequestedCompSlotId, out SchedulerSlot? requestedSlot))
                {
                    result.Audit.Add(new AuditLogEntry
                    {
                        PaidTimeRequestId = req.PaidTimeRequestId,
                        Action = "unscheduled",
                        Reason = "הסלוט המבוקש לא נמצא"
                    });
                    result.Assignments.Add(new AssignmentDecision
                    {
                        PaidTimeRequestId = req.PaidTimeRequestId,
                        HorseId = req.HorseId,
                        CoachFederationMemberId = req.CoachFederationMemberId,
                        Status = "Pending"
                    });
                    result.UnscheduledCount++;
                    continue;
                }

                // אם הסלוט המבוקש פורסם - לא משתבץ אוטומטית (שייך למזכירה).
                if (requestedSlot.IsPublished)
                {
                    result.Audit.Add(new AuditLogEntry
                    {
                        PaidTimeRequestId = req.PaidTimeRequestId,
                        Action = "unscheduled",
                        Reason = "הסלוט המבוקש פורסם - שיבוץ ידני נדרש",
                        NewSlotId = requestedSlot.PaidTimeSlotInCompId
                    });
                    result.Assignments.Add(new AssignmentDecision
                    {
                        PaidTimeRequestId = req.PaidTimeRequestId,
                        HorseId = req.HorseId,
                        CoachFederationMemberId = req.CoachFederationMemberId,
                        Status = "Pending"
                    });
                    result.UnscheduledCount++;
                    continue;
                }

                Interval? placement = TryFindPlacement(req, requestedSlot, coachTimelines, slotTimelines);

                if (placement.HasValue)
                {
                    coachTimelines.Add(req.CoachFederationMemberId, requestedSlot, placement.Value);
                    slotTimelines.Add(requestedSlot.PaidTimeSlotInCompId, placement.Value);

                    int order = slotTimelines.GetCount(requestedSlot.PaidTimeSlotInCompId);

                    result.Assignments.Add(new AssignmentDecision
                    {
                        PaidTimeRequestId = req.PaidTimeRequestId,
                        HorseId = req.HorseId,
                        CoachFederationMemberId = req.CoachFederationMemberId,
                        AssignedCompSlotId = requestedSlot.PaidTimeSlotInCompId,
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
                        NewSlotId = requestedSlot.PaidTimeSlotInCompId,
                        NewStartTime = placement.Value.Start
                    });

                    result.ScheduledCount++;
                }
                else
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
                        Reason = "אין מקום פנוי בסלוט המבוקש (קיבולת/מאמן עסוק)"
                    });

                    result.UnscheduledCount++;
                }
            }

            return result;
        }

        // מנסה למצוא את הזמן המוקדם ביותר בסלוט שמתאים לבקשה
        // ולא מפר אילוצי מאמן/קיבולת.
        private static Interval? TryFindPlacement(
            SchedulerRequest req,
            SchedulerSlot slot,
            CoachTimeline coachTimelines,
            SlotTimeline slotTimelines)
        {
            DateTime slotStart = slot.SlotDate.Date.Add(slot.StartTime);
            DateTime slotEnd = slot.SlotDate.Date.Add(slot.EndTime);

            // קיבולת: סך דקות שכבר תפוסות בסלוט + הבקשה הנוכחית <= קיבולת.
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

                // המאמן לא תפוס (כולל מעבר 7 דק' אם בא ממגרש אחר).
                if (!coachTimelines.IsCoachAvailable(req.CoachFederationMemberId, slot, candidate, TRANSITION_MINUTES)) continue;

                return candidate;
            }

            return null;
        }
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
}
