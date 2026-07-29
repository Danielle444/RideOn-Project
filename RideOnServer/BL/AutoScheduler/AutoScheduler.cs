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
    // V2-1 - נפילה-לסלוט-סמוך באותו יום:
    // 5) העיבוד מתבצע בשני שלבים. שלב 1 מנסה לכל המועמדים (FIFO) את הסלוט
    //    המבוקש בלבד; שלב 2 מנסה למי שנותר, באותו סדר FIFO, את השכן הקודם
    //    ואז את השכן הבא באותו יום. השלביות מבטיחה שבקשה שנופלת לסלוט סמוך
    //    לא תתפוס קיבולת בסלוט לפני שבקשה שביקשה אותו *ישירות* קיבלה את
    //    הזדמנות שלב-1 שלה.
    // 6) "קודם"/"הבא" הם השכנים הפיזיים המיידיים ברשימת סלוטי אותו יום,
    //    לפי סדר דטרמיניסטי מלא. שכן שאינו כשיר (פורסם / מגרש אחר) מדולג
    //    ואינו מוחלף בסלוט המרוחק שתי עמדות או יותר.
    // 7) לעולם אין חציית תאריך: המועמדים נבנים מסלוטי אותו SlotDate בלבד.
    //
    // V2-2 - הזזה מבוקרת של שיבוצים קיימים לא-מפורסמים (שלב 3):
    // 8) allowMovement=false משמר את התנהגות V2-1 *בדיוק*: כל שורה Assigned
    //    קפואה, ללא סיווג וללא הזזה. זהו המסלול של usp_applyautoschedule
    //    (פרוצדורה 129) שנשאר ללא שינוי.
    // 9) allowMovement=true מסווג כל שורה Assigned כניידת או קפואה, ומריץ אחרי
    //    שלבים 1-2 חיפוש-שרשרת-הדחה חסום. שרשרת מתקבלת *אך ורק* כאשר בקשה
    //    שלא שובצה קודם משובצת וכל שורה שהורמה הוחזרה למקום חוקי - ולכן מספר
    //    המשובצים גדל ממש. אין הזזה לשיפור-העדפה בלבד.
    // 10) החיפוש הוא best-effort חסום ודטרמיניסטי. הוא *אינו* מוכיח מקסימום
    //    גלובלי: פתרון חוקי מעבר ל-MAX_CHAIN_DEPTH או מעבר לתקציב-הצמתים
    //    לא יימצא במכוון, ומדווח דרך MovementSearchExhausted.
    public static class AutoScheduler
    {
        private const int TRANSITION_MINUTES = 7;

        // ===== חוזה החיפוש החסום (V2-2) =====
        // קבועי-קוד ולא הגדרה: Preview ו-Apply מריצים את המנוע בנפרד וחייבים
        // לסרוק *בדיוק* את אותו מרחב, אחרת זהות Preview/Apply נשברת.
        //
        // MAX_CHAIN_DEPTH=3 מכסה את כל צורות-התנועה שמרחב-התנועה יודע לבטא
        // מקצה לקצה: הדחה בודדת (1), החלפה הדדית (2), ומעגל-שלושה (3).
        internal const int MAX_CHAIN_DEPTH = 3;
        internal const int MAX_NODES_PER_REQUEST = 200;
        internal const int MAX_NODES_PER_RUN = 20000;

        // מסלול תאימות: התנהגות V2-1 בדיוק (ללא הזזה). זהו ברירת-המחדל, ולכן
        // כל קורא קיים ממשיך לקבל את התנהגות V2-1 ללא שינוי.
        public static AutoScheduleResult Schedule(SchedulerData data, IReadOnlyCollection<int> candidateRequestIds)
        {
            return Schedule(data, candidateRequestIds, false);
        }

        public static AutoScheduleResult Schedule(
            SchedulerData data,
            IReadOnlyCollection<int> candidateRequestIds,
            bool allowMovement)
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

            // סלוטי התחרות מקובצים לפי תאריך ומסודרים בסדר דטרמיניסטי מלא (V2-1).
            // מכאן נגזרים השכנים הפיזיים המיידיים של הסלוט המבוקש.
            Dictionary<DateTime, List<SchedulerSlot>> slotsByDate = BuildOrderedSlotsByDate(data.Slots);

            // רשימות-המועמדים לכל בקשה (הסלוט המבוקש + שני השכנים הכשירים).
            // משמשות גם לסיווג הניידות של שיבוץ קיים וגם לחיפוש-השרשרת.
            Dictionary<int, List<(SchedulerSlot slot, string kind)>> candidateSlotsByRequest =
                new Dictionary<int, List<(SchedulerSlot, string)>>();
            foreach (SchedulerRequest r in data.Requests)
            {
                candidateSlotsByRequest[r.PaidTimeRequestId] = BuildCandidateSlots(r, slotById, slotsByDate);
            }

            // 3. שיבוצים קיימים. במסלול ללא-הזזה כולם קפואים (V2-1). במסלול ההזזה
            //    כל שורה מסווגת: ניידת, או קפואה עם סיבה מובנית. בשני המקרים היא
            //    זורעת את המרווח התפוס שלה לצירי-הזמן ואת מספר-המיקום שלה למאגר.
            // מאגר-המיקומים מקבל את מדיניות ההקצאה של המסלול: max+1 ב-bulk,
            // ומחזור-פערים רק במסלול ההזזה.
            SchedulingState state = new SchedulingState(reuseOrderGaps: allowMovement);

            // מעבר-מקדים (V2-2 בלבד): איתור הסלוטים ה"לא-בטוחים". שורה Assigned
            // ללא assignedstarttime אינה זורעת ציר-זמן, ולכן הקיבולת, החפיפה
            // והגבולות של הסלוט שבו היא יושבת אינם ניתנים לאימות. במקום להתעלם
            // ממנה ואז לכתוב לתוך אותו סלוט, מוציאים את הסלוט כולו מהתחום
            // האוטומטי: לא נכנסים אליו, לא יוצאים ממנו ולא זזים בתוכו.
            if (allowMovement)
            {
                foreach (SchedulerRequest req in data.Requests)
                {
                    if (req.Status == "Assigned"
                        && req.AssignedCompSlotId.HasValue
                        && !req.AssignedStartTime.HasValue)
                    {
                        state.UnsafeLegacySlotIds.Add(req.AssignedCompSlotId.Value);
                    }
                }
            }

            // מזהי השיבוצים הניידים, בסדר FIFO דטרמיניסטי מלא. הפליטה בסוף הריצה
            // קוראת את המיקום *העדכני* מ-state.Placed ולא עותק מהזריעה, כי שרשרת
            // מוצלחת מחליפה את אובייקט-המיקום.
            List<int> movableIds = new List<int>();

            foreach (SchedulerRequest req in data.Requests)
            {
                if (req.Status != "Assigned")
                {
                    continue;
                }

                string? frozenReason = allowMovement
                    ? ClassifyAssigned(req, slotById, candidateSlotsByRequest[req.PaidTimeRequestId],
                        state.UnsafeLegacySlotIds)
                    : string.Empty;   // מסלול ה-bulk: הכול קפוא, ללא סיווג ניידות.

                bool isMovable = allowMovement && frozenReason == null;

                if (req.AssignedCompSlotId.HasValue
                    && req.AssignedStartTime.HasValue
                    && slotById.TryGetValue(req.AssignedCompSlotId.Value, out SchedulerSlot? assignedSlot))
                {
                    Interval interval = new Interval(
                        req.AssignedStartTime.Value,
                        req.AssignedStartTime.Value.AddMinutes(req.DurationMinutes)
                    );

                    if (isMovable)
                    {
                        // שורה ניידת נכנסת ל-state כשחקן שניתן להרים ולהחזיר.
                        LivePlacement live = new LivePlacement
                        {
                            Request = req,
                            Slot = assignedSlot,
                            Interval = interval,
                            Order = req.AssignedOrder!.Value,
                            IsMovableExisting = true,
                            PlacementKind = ResolvePlacementKind(
                                candidateSlotsByRequest[req.PaidTimeRequestId], assignedSlot)
                        };

                        state.Originals[req.PaidTimeRequestId] = new OriginalPlacement
                        {
                            Slot = assignedSlot,
                            Interval = interval,
                            Order = req.AssignedOrder!.Value
                        };

                        Occupy(state, live);
                        movableIds.Add(req.PaidTimeRequestId);
                        continue;
                    }

                    // שורה קפואה: זורעת תפוסה בלבד, לעולם אינה מורמת.
                    state.Coach.Add(req.CoachFederationMemberId, assignedSlot, interval);
                    state.Slots.Add(assignedSlot.PaidTimeSlotInCompId, interval);
                    state.Riders.Add(req.RiderFederationMemberId, interval);
                    state.Horses.Add(req.HorseId, interval);
                }

                // מספר-המיקום של שורה קפואה נתפס לצמיתות ולעולם אינו משתחרר.
                if (req.AssignedCompSlotId.HasValue && req.AssignedOrder.HasValue)
                {
                    state.Orders.Claim(req.AssignedCompSlotId.Value, req.AssignedOrder.Value);
                }

                if (!isMovable)
                {
                    result.Audit.Add(new AuditLogEntry
                    {
                        PaidTimeRequestId = req.PaidTimeRequestId,
                        Action = "kept-frozen",
                        Reason = "שיבוץ קיים - נשמר במקומו",
                        NewSlotId = req.AssignedCompSlotId,
                        NewStartTime = req.AssignedStartTime,
                        FrozenReason = string.IsNullOrEmpty(frozenReason) ? null : frozenReason
                    });

                    result.FrozenCount++;
                }
            }

            // 4. משבצים אך ורק את המועמדים, לפי FIFO. החלטה אחת בדיוק לכל מועמד.
            List<SchedulerRequest> candidates = candidateSet
                .Select(id => requestById[id])
                .OrderBy(r => r.SrequestDateTime)
                .ThenBy(r => r.PaidTimeRequestId)
                .ToList();

            // ===== שלב 1: כל המועמדים (FIFO), הסלוט המבוקש בלבד =====
            // התוצאה של כל מועמד נרשמת ונפלטת רק בסוף, כדי לשמור על סדר-הפליטה
            // ההיסטורי (FIFO) של ההחלטות והביקורת גם כשמתרחשת נפילה-לסלוט-סמוך.
            List<CandidateOutcome> outcomes = new List<CandidateOutcome>();

            foreach (SchedulerRequest req in candidates)
            {
                CandidateOutcome outcome = new CandidateOutcome { Request = req };
                outcomes.Add(outcome);

                if (!slotById.TryGetValue(req.RequestedCompSlotId, out SchedulerSlot? requestedSlot))
                {
                    outcome.PendingReason = "הסלוט המבוקש לא נמצא";
                    continue;
                }

                outcome.RequestedSlot = requestedSlot;

                // אם הסלוט המבוקש פורסם - לא משתבץ אוטומטית (שייך למזכירה).
                // התנהגות V2-0 נשמרת: אין ניסיון נפילה לסלוט סמוך במקרה הזה,
                // וגם אין חיפוש-הזזה (V2-2) - הבקשה כולה מחוץ לטווח האוטומטי.
                if (requestedSlot.IsPublished)
                {
                    outcome.PendingReason = "הסלוט המבוקש פורסם - שיבוץ ידני נדרש";
                    outcome.PendingSlotId = requestedSlot.PaidTimeSlotInCompId;
                    continue;
                }

                Interval? placement = TryFindPlacement(
                    req, requestedSlot, state, out UnscheduledCause cause);

                // הסיבה של שלב 1 היא הסיבה הסופית שתדווח אם גם כל הסמוכים ייכשלו.
                outcome.RequestedSlotCause = cause;

                if (placement.HasValue)
                {
                    PlaceCandidate(state, req, requestedSlot, placement.Value, outcome,
                        PlacementKinds.Requested, "FIFO greedy");
                }
                else
                {
                    // מועמד לשלב 2 בלבד אם הסלוט המבוקש נמצא ואינו מפורסם.
                    outcome.EligibleForFallback = true;
                }
            }

            // ===== שלב 2: מי שנותר, באותו סדר FIFO, שכן קודם ואז שכן הבא =====
            foreach (CandidateOutcome outcome in outcomes)
            {
                if (outcome.Placed || !outcome.EligibleForFallback || outcome.RequestedSlot == null)
                {
                    continue;
                }

                List<(SchedulerSlot slot, string kind)> adjacent =
                    ResolveAdjacentCandidates(slotsByDate, outcome.RequestedSlot);

                foreach ((SchedulerSlot slot, string kind) candidate in adjacent)
                {
                    // סמוך "נבדק" רק כשבוצע עליו ניסיון-מיקום בפועל.
                    outcome.AdjacentSlotsTried = true;

                    Interval? adjacentPlacement = TryFindPlacement(
                        outcome.Request, candidate.slot, state, out UnscheduledCause _);

                    if (adjacentPlacement.HasValue)
                    {
                        PlaceCandidate(state, outcome.Request, candidate.slot, adjacentPlacement.Value,
                            outcome, candidate.kind, "FIFO greedy - סלוט סמוך באותו יום");
                        break;
                    }
                }
            }

            // ===== שלב 3 (V2-2): חיפוש-שרשרת-הדחה חסום, רק למי שעדיין לא שובץ =====
            // רץ *אחרי* התוצאה המלאה של V2-1, ולכן הזזה לעולם אינה מתרחשת כשקיים
            // מיקום ללא-הזזה: שלבים 1-2 כבר מיצו את כל המיקומים הישירים.
            if (allowMovement && movableIds.Count > 0)
            {
                RunBudget runBudget = new RunBudget();

                foreach (CandidateOutcome outcome in outcomes)
                {
                    if (outcome.Placed || !outcome.EligibleForFallback)
                    {
                        continue;
                    }

                    List<(SchedulerSlot slot, string kind)> cands =
                        candidateSlotsByRequest[outcome.Request.PaidTimeRequestId];

                    // אין למי להדיח בסלוטי-המועמד -> אין מה לנסות, ואין לדווח ניסיון.
                    if (!HasMovableOccupant(state, cands))
                    {
                        continue;
                    }

                    outcome.MovementAttempted = true;

                    ChainContext ctx = new ChainContext(runBudget, candidateSlotsByRequest);

                    if (TryChain(outcome.Request, cands, 0, ctx, state, false))
                    {
                        LivePlacement mine = state.Placed[outcome.Request.PaidTimeRequestId];
                        outcome.Placed = true;
                        outcome.Slot = mine.Slot;
                        outcome.Placement = mine.Interval;
                        outcome.AssignedOrder = mine.Order;
                        outcome.PlacementKind = mine.PlacementKind;
                        outcome.AuditReason = "FIFO greedy - הזזת שיבוצים קיימים באותו יום";
                    }
                    else
                    {
                        // כשל אמיתי מול כשל-תקציב: מדווחים בנפרד, ולעולם לא
                        // מחליפים בכך את סיבת-הכשל של הסלוט המבוקש.
                        outcome.MovementSearchExhausted = ctx.Exhausted;
                    }
                }
            }

            // ===== פליטת ההחלטות בסדר FIFO המקורי =====
            foreach (CandidateOutcome outcome in outcomes)
            {
                if (outcome.Placed && outcome.Slot != null)
                {
                    result.Assignments.Add(new AssignmentDecision
                    {
                        PaidTimeRequestId = outcome.Request.PaidTimeRequestId,
                        HorseId = outcome.Request.HorseId,
                        CoachFederationMemberId = outcome.Request.CoachFederationMemberId,
                        AssignedCompSlotId = outcome.Slot.PaidTimeSlotInCompId,
                        AssignedStartTime = outcome.Placement.Start,
                        AssignedOrder = outcome.AssignedOrder,
                        Status = "Assigned",
                        PlacementKind = outcome.PlacementKind,
                        // שיבוץ חדש: תמיד Auto, וללא מצב-ישן.
                        ChangeKind = ChangeKinds.NewAssignment,
                        AllocationOrigin = "Auto"
                    });

                    result.Audit.Add(new AuditLogEntry
                    {
                        PaidTimeRequestId = outcome.Request.PaidTimeRequestId,
                        Action = "scheduled",
                        Reason = outcome.AuditReason,
                        PreviousSlotId = outcome.Request.AssignedCompSlotId,
                        NewSlotId = outcome.Slot.PaidTimeSlotInCompId,
                        NewStartTime = outcome.Placement.Start
                    });

                    result.ScheduledCount++;
                }
                else
                {
                    // סיבה סופית: הסיבה של הסלוט המבוקש (שלב 1). כשלונות של
                    // מועמדים סמוכים ושל חיפוש-ההזזה לעולם אינם מחליפים אותה.
                    string reason = outcome.PendingReason ?? ReasonForCause(outcome.RequestedSlotCause);

                    AddPendingDecision(result, outcome, reason);
                }
            }

            // ===== פליטת שיבוצים קיימים ניידים: הוזזו / נותרו במקומם =====
            // סדר דטרמיניסטי מלא, בלתי-תלוי בסדר מעבר על מילון.
            movableIds.Sort((a, b) =>
            {
                int c = requestById[a].SrequestDateTime.CompareTo(requestById[b].SrequestDateTime);
                return c != 0 ? c : a.CompareTo(b);
            });

            foreach (int movableId in movableIds)
            {
                // אינווריאנטה: שרשרת מוצלחת ממקמת מחדש כל שורה שהורמה, ושרשרת
                // שנכשלה מוחזרת במלואה. שורה ניידת חייבת אפוא להיות ממוקמת כאן.
                if (!state.Placed.TryGetValue(movableId, out LivePlacement? live))
                {
                    throw new Exception($"Movable request {movableId} was left unplaced");
                }

                OriginalPlacement original = state.Originals[movableId];

                if (!live.HasMovedFrom(original))
                {
                    result.Audit.Add(new AuditLogEntry
                    {
                        PaidTimeRequestId = live.Request.PaidTimeRequestId,
                        Action = "kept-unchanged",
                        Reason = "שיבוץ קיים - לא נדרשה הזזה",
                        NewSlotId = live.Slot.PaidTimeSlotInCompId,
                        NewStartTime = live.Interval.Start
                    });

                    result.UnchangedCount++;
                    continue;
                }

                result.Assignments.Add(new AssignmentDecision
                {
                    PaidTimeRequestId = live.Request.PaidTimeRequestId,
                    HorseId = live.Request.HorseId,
                    CoachFederationMemberId = live.Request.CoachFederationMemberId,
                    AssignedCompSlotId = live.Slot.PaidTimeSlotInCompId,
                    AssignedStartTime = live.Interval.Start,
                    AssignedOrder = live.Order,
                    Status = "Assigned",
                    PlacementKind = live.PlacementKind,
                    ChangeKind = ChangeKinds.Moved,
                    PreviousAssignedCompSlotId = original.Slot.PaidTimeSlotInCompId,
                    PreviousAssignedStartTime = original.Interval.Start,
                    PreviousAssignedOrder = original.Order,
                    // שימור מדויק, כולל NULL - אין מחיקת עדות ל'Manual'.
                    PreviousAllocationOrigin = live.Request.AllocationOrigin,
                    AllocationOrigin = live.Request.AllocationOrigin
                });

                result.Audit.Add(new AuditLogEntry
                {
                    PaidTimeRequestId = live.Request.PaidTimeRequestId,
                    Action = "moved",
                    Reason = "שיבוץ קיים הוזז כדי לפנות מקום לבקשה נוספת",
                    PreviousSlotId = original.Slot.PaidTimeSlotInCompId,
                    NewSlotId = live.Slot.PaidTimeSlotInCompId,
                    NewStartTime = live.Interval.Start
                });

                result.MovedCount++;
            }

            // 5. אימות שוויון-קבוצות: מזהי-ההחלטות == מועמדים + שיבוצים שהוזזו,
            //    ללא כפילויות. שורות שלא הוזזו וקפואות אינן החלטות ואינן נכתבות.
            HashSet<int> decisionIds = new HashSet<int>();
            foreach (AssignmentDecision d in result.Assignments)
            {
                if (!decisionIds.Add(d.PaidTimeRequestId))
                {
                    throw new Exception($"Duplicate decision for request {d.PaidTimeRequestId}");
                }
            }

            HashSet<int> expectedIds = new HashSet<int>(candidateSet);
            foreach (int movableId in movableIds)
            {
                if (state.Placed[movableId].HasMovedFrom(state.Originals[movableId])
                    && !expectedIds.Add(movableId))
                {
                    throw new Exception($"Moved request {movableId} collides with a candidate");
                }
            }

            if (!decisionIds.SetEquals(expectedIds))
            {
                throw new Exception("Decision set does not equal candidate set");
            }

            return result;
        }

        // ===================== מצב-השיבוץ החי =====================

        // כל צירי-הזמן, מאגר-המיקומים והמיקומים החיים במקום אחד, כדי ששלב 3
        // יוכל להרים ולהחזיר מיקום בפעולה אטומית אחת ובלי לשכוח ציר.
        private sealed class SchedulingState
        {
            public readonly CoachTimeline Coach = new CoachTimeline();
            public readonly SlotTimeline Slots = new SlotTimeline();
            // תפוסת רוכב/סוס (V2-0): חפיפה טהורה לפי Interval, ללא מרווח-מעבר,
            // על פני כל הסלוטים/המגרשים/התאריכים בתחרות.
            public readonly EntityTimeline Riders = new EntityTimeline();
            public readonly EntityTimeline Horses = new EntityTimeline();
            public readonly OrderPool Orders;

            // סלוטים "לא-בטוחים" (V2-2): סלוט שמכיל ולו שורה אחת במצב Assigned
            // ללא assignedstarttime. לשורה כזו אין מרווח-זמן, ולכן מצב-התפוסה
            // האמיתי של הסלוט אינו ניתן לאימות - לא בקיבולת, לא בחפיפה ולא
            // בגבולות. כל עוד היא שם, הסלוט כולו מוצא מחוץ לתחום האוטומטי.
            // ריק לחלוטין במסלול ה-bulk (allowMovement=false), שבו התנהגות V2-1
            // נשמרת כפי שהיא.
            public readonly HashSet<int> UnsafeLegacySlotIds = new HashSet<int>();

            public SchedulingState(bool reuseOrderGaps)
            {
                Orders = new OrderPool(reuseOrderGaps);
            }

            // מיקומים חיים של שורות שניתן להרים (שיבוצים קיימים ניידים) ושל
            // בקשות ששובצו בשלב 3. מפתח = paidTimeRequestId.
            public readonly Dictionary<int, LivePlacement> Placed = new Dictionary<int, LivePlacement>();

            // המיקום המקורי (מתמונת-המצב) של כל שיבוץ קיים נייד. נשמר בנפרד
            // מ-Placed כי הרמה בתוך שרשרת מוציאה את השורה מ-Placed לחלוטין, ואסור
            // שנקודת-ההשוואה "האם באמת זזה" תלך לאיבוד יחד איתה.
            public readonly Dictionary<int, OriginalPlacement> Originals =
                new Dictionary<int, OriginalPlacement>();
        }

        private sealed class OriginalPlacement
        {
            public SchedulerSlot Slot = null!;
            public Interval Interval;
            public int Order;
        }

        // מיקום חי יחיד. עבור שיבוץ קיים נייד נשמר גם המיקום המקורי, כדי לקבוע
        // בסוף הריצה אם השורה באמת זזה (ולכן נכנסת לקבוצת-הכתיבה).
        private sealed class LivePlacement
        {
            public SchedulerRequest Request = null!;
            public SchedulerSlot Slot = null!;
            public Interval Interval;
            public int Order;
            public bool IsMovableExisting;
            public string PlacementKind = PlacementKinds.Requested;

            public bool HasMovedFrom(OriginalPlacement original)
            {
                return Slot.PaidTimeSlotInCompId != original.Slot.PaidTimeSlotInCompId
                    || Interval.Start != original.Interval.Start
                    || Order != original.Order;
            }
        }

        // מאגר מספרי-המיקום (assignedorder) לכל סלוט.
        //
        // שתי מדיניות-הקצאה, לפי המסלול - וזה מכוון:
        //
        //   reuseGaps=false (allowMovement=false, מסלול ה-bulk / פרוצדורה 129):
        //     max+1 בדיוק כמו V2-1. פערים אינם ממוחזרים. אסור לשנות התנהגות של
        //     מסלול שנפרס בנפרד מתוך משימת V2-2.
        //
        //   reuseGaps=true (allowMovement=true, מסלול Preview/Apply של V2-2):
        //     המספר החיובי הפנוי *הנמוך ביותר*. הכלל הזה ממחזר פערים שנוצרו בתוך
        //     אותה תוכנית (שורה שיצאה מהסלוט), ולכן אינו מצריך מספור-מחדש של
        //     שורות שלא זזו.
        //
        // בשני המקרים פערים קיימים ב-assignedorder נשארים חוקיים - אין אילוץ,
        // אין אינדקס ואין קוד שדורש רציפות.
        private sealed class OrderPool
        {
            private readonly Dictionary<int, HashSet<int>> _used = new Dictionary<int, HashSet<int>>();
            private readonly bool _reuseGaps;

            public OrderPool(bool reuseGaps)
            {
                _reuseGaps = reuseGaps;
            }

            public void Claim(int slotId, int order)
            {
                Bucket(slotId).Add(order);
            }

            public void Release(int slotId, int order)
            {
                if (_used.TryGetValue(slotId, out HashSet<int>? set))
                {
                    set.Remove(order);
                }
            }

            public int Allocate(int slotId)
            {
                HashSet<int> set = Bucket(slotId);

                int order;
                if (_reuseGaps)
                {
                    order = 1;
                    while (set.Contains(order))
                    {
                        order++;
                    }
                }
                else
                {
                    // max+1, זהה ל-maxOrderBySlot של V2-1. סלוט ריק -> 1.
                    order = set.Count == 0 ? 1 : set.Max() + 1;
                }

                set.Add(order);
                return order;
            }

            private HashSet<int> Bucket(int slotId)
            {
                if (!_used.TryGetValue(slotId, out HashSet<int>? set))
                {
                    set = new HashSet<int>();
                    _used[slotId] = set;
                }
                return set;
            }
        }

        // תקציב-צמתים לכל הריצה (משותף לכל הבקשות).
        private sealed class RunBudget
        {
            public int NodesUsed;
        }

        // הקשר של שרשרת-הדחה אחת: שומר על שומר-המעגלים (Lifted) ועל תקציב
        // הצמתים של הבקשה הנוכחית.
        private sealed class ChainContext
        {
            private readonly RunBudget _run;
            private readonly Dictionary<int, List<(SchedulerSlot slot, string kind)>> _candidates;

            public readonly HashSet<int> Lifted = new HashSet<int>();
            public int NodesUsed;
            public bool Exhausted;

            public ChainContext(
                RunBudget run,
                Dictionary<int, List<(SchedulerSlot slot, string kind)>> candidates)
            {
                _run = run;
                _candidates = candidates;
            }

            public List<(SchedulerSlot slot, string kind)> CandidatesFor(int requestId)
            {
                return _candidates.TryGetValue(requestId, out List<(SchedulerSlot, string)>? list)
                    ? list
                    : new List<(SchedulerSlot, string)>();
            }

            // הוצאת צומת אחד. חריגה מכל אחד מהתקציבים מסמנת Exhausted ועוצרת את
            // החיפוש - זהו כשל-תקציב, לא כשל-חוקיות, והוא מדווח ככזה.
            public bool TrySpendNode()
            {
                if (_run.NodesUsed >= MAX_NODES_PER_RUN || NodesUsed >= MAX_NODES_PER_REQUEST)
                {
                    Exhausted = true;
                    return false;
                }

                NodesUsed++;
                _run.NodesUsed++;
                return true;
            }
        }

        // ===================== חיפוש-שרשרת-ההדחה =====================

        // מנסה למקם בקשה אחת. תחילה מיקום ישיר בכל אחד מסלוטי-המועמד; רק אם כל
        // הישירים נכשלו - מרים שיבוץ קיים נייד ומנסה למקם אותו מחדש ברקורסיה.
        //
        // מחזיר true אך ורק כאשר הבקשה *וכל* השורות שהורמו מוקמו במקום חוקי.
        // בכל מסלול-כשל המצב מוחזר לקדמותו במלואו (rollback מלא של הצירים,
        // של מאגר-המיקומים ושל המיקומים החיים) - ולכן שרשרת שנכשלה אינה משאירה
        // שום עקבה, ובפרט אינה מזיזה שיבוץ קיים.
        private static bool TryChain(
            SchedulerRequest req,
            List<(SchedulerSlot slot, string kind)> candidates,
            int depth,
            ChainContext ctx,
            SchedulingState state,
            bool isMovableExisting)
        {
            // --- מיקום ישיר ---
            foreach ((SchedulerSlot slot, string kind) candidate in candidates)
            {
                if (!ctx.TrySpendNode())
                {
                    return false;
                }

                Interval? direct = TryFindPlacement(req, candidate.slot, state, out UnscheduledCause _);
                if (direct.HasValue)
                {
                    Occupy(state, BuildPlacement(state, req, candidate.slot, direct.Value,
                        candidate.kind, isMovableExisting));
                    return true;
                }
            }

            // מגבלת-העומק היא עצירת-תקציב לכל דבר, ולכן היא מסמנת Exhausted בדיוק
            // כמו תקציב-הצמתים: החיפוש נעצר במגבלה ולא הוכיח שאין פתרון. הדיווח
            // הזה *מתווסף* לסיבת-הכשל של הסלוט המבוקש ולעולם אינו מחליף אותה.
            if (depth >= MAX_CHAIN_DEPTH)
            {
                ctx.Exhausted = true;
                return false;
            }

            // --- הדחה ---
            foreach ((SchedulerSlot slot, string kind) candidate in candidates)
            {
                foreach (LivePlacement occupant in MovableOccupants(state, candidate.slot, ctx))
                {
                    if (!ctx.TrySpendNode())
                    {
                        return false;
                    }

                    // מרימים את התופס. שומר-המעגלים מונע הרמה חוזרת של אותה שורה
                    // בתוך אותה שרשרת, ולכן מעגל אינסופי בלתי-אפשרי מבנית.
                    LivePlacement saved = Snapshot(occupant);
                    Vacate(state, occupant);
                    ctx.Lifted.Add(occupant.Request.PaidTimeRequestId);

                    Interval? afterEviction =
                        TryFindPlacement(req, candidate.slot, state, out UnscheduledCause _);

                    if (afterEviction.HasValue)
                    {
                        LivePlacement mine = BuildPlacement(state, req, candidate.slot,
                            afterEviction.Value, candidate.kind, isMovableExisting);
                        Occupy(state, mine);

                        if (TryChain(
                                occupant.Request,
                                ctx.CandidatesFor(occupant.Request.PaidTimeRequestId),
                                depth + 1,
                                ctx,
                                state,
                                true))
                        {
                            // הצלחה: הבקשה מוקמה והתופס מוקם מחדש. השרשרת נסגרת
                            // ומתקבלת כמכלול; אין צורך לשחרר את שומר-המעגלים.
                            return true;
                        }

                        Vacate(state, mine);
                    }

                    // כשל: מחזירים את התופס בדיוק למקומו הקודם.
                    ctx.Lifted.Remove(occupant.Request.PaidTimeRequestId);
                    Occupy(state, saved);
                }
            }

            return false;
        }

        // התופסים הניידים של סלוט, בסדר FIFO דטרמיניסטי מלא, למעט מי שכבר הורם
        // בשרשרת הנוכחית. מחושב מחדש בכל קריאה כדי שלא ייווצר מצב לא-עקבי אחרי
        // הרמה/החזרה.
        private static List<LivePlacement> MovableOccupants(
            SchedulingState state,
            SchedulerSlot slot,
            ChainContext ctx)
        {
            return state.Placed.Values
                .Where(p => p.IsMovableExisting
                            && p.Slot.PaidTimeSlotInCompId == slot.PaidTimeSlotInCompId
                            && !ctx.Lifted.Contains(p.Request.PaidTimeRequestId))
                .OrderBy(p => p.Request.SrequestDateTime)
                .ThenBy(p => p.Request.PaidTimeRequestId)
                .ToList();
        }

        private static bool HasMovableOccupant(
            SchedulingState state,
            List<(SchedulerSlot slot, string kind)> candidates)
        {
            foreach ((SchedulerSlot slot, string kind) candidate in candidates)
            {
                foreach (LivePlacement p in state.Placed.Values)
                {
                    if (p.IsMovableExisting
                        && p.Slot.PaidTimeSlotInCompId == candidate.slot.PaidTimeSlotInCompId)
                    {
                        return true;
                    }
                }
            }
            return false;
        }

        // ===================== תפיסה ושחרור =====================

        private static LivePlacement BuildPlacement(
            SchedulingState state,
            SchedulerRequest req,
            SchedulerSlot slot,
            Interval interval,
            string placementKind,
            bool isMovableExisting)
        {
            return new LivePlacement
            {
                Request = req,
                Slot = slot,
                Interval = interval,
                // המיקום מוקצה רק כאן, *אחרי* שהתופס שהודח כבר שחרר את שלו.
                Order = state.Orders.Allocate(slot.PaidTimeSlotInCompId),
                IsMovableExisting = isMovableExisting,
                PlacementKind = placementKind
            };
        }

        // עותק של מיקום חי לצורך שחזור מדויק אחרי כשל.
        private static LivePlacement Snapshot(LivePlacement source)
        {
            return new LivePlacement
            {
                Request = source.Request,
                Slot = source.Slot,
                Interval = source.Interval,
                Order = source.Order,
                IsMovableExisting = source.IsMovableExisting,
                PlacementKind = source.PlacementKind
            };
        }

        private static void Occupy(SchedulingState state, LivePlacement placement)
        {
            state.Coach.Add(placement.Request.CoachFederationMemberId, placement.Slot, placement.Interval);
            state.Slots.Add(placement.Slot.PaidTimeSlotInCompId, placement.Interval);
            state.Riders.Add(placement.Request.RiderFederationMemberId, placement.Interval);
            state.Horses.Add(placement.Request.HorseId, placement.Interval);
            state.Orders.Claim(placement.Slot.PaidTimeSlotInCompId, placement.Order);
            state.Placed[placement.Request.PaidTimeRequestId] = placement;
        }

        private static void Vacate(SchedulingState state, LivePlacement placement)
        {
            state.Coach.Remove(placement.Request.CoachFederationMemberId, placement.Slot, placement.Interval);
            state.Slots.Remove(placement.Slot.PaidTimeSlotInCompId, placement.Interval);
            state.Riders.Remove(placement.Request.RiderFederationMemberId, placement.Interval);
            state.Horses.Remove(placement.Request.HorseId, placement.Interval);
            state.Orders.Release(placement.Slot.PaidTimeSlotInCompId, placement.Order);
            state.Placed.Remove(placement.Request.PaidTimeRequestId);
        }

        // מיקום מועמד בשלבים 1-2 (ללא הדחה). כותב גם לתוצאת-הביניים של המועמד.
        private static void PlaceCandidate(
            SchedulingState state,
            SchedulerRequest req,
            SchedulerSlot slot,
            Interval placement,
            CandidateOutcome outcome,
            string placementKind,
            string auditReason)
        {
            LivePlacement live = BuildPlacement(state, req, slot, placement, placementKind, false);
            Occupy(state, live);

            outcome.Placed = true;
            outcome.Slot = slot;
            outcome.Placement = placement;
            outcome.AssignedOrder = live.Order;
            outcome.PlacementKind = placementKind;
            outcome.AuditReason = auditReason;
        }

        // ===================== סיווג ניידות =====================

        // מחזיר NULL כאשר השיבוץ הקיים נייד, או קוד-סיבה מ-FrozenReasons אחרת.
        //
        // מרחב-התנועה סגור במכוון: שורה ניידת יכולה לנוע *רק* בין אותם שלושה
        // סלוטים שמהם היא כבר נמצאת באחד. שיבוץ שהמזכירה העבירה לסלוט רחוק,
        // ליום אחר או למגרש אחר אינו יכול "להישאר במקומו" בתוך המרחב הזה, ולכן
        // הוא קפוא ולא יוזז.
        private static string? ClassifyAssigned(
            SchedulerRequest req,
            Dictionary<int, SchedulerSlot> slotById,
            List<(SchedulerSlot slot, string kind)> candidates,
            HashSet<int> unsafeLegacySlotIds)
        {
            if (!req.AssignedCompSlotId.HasValue)
            {
                return FrozenReasons.OutOfScopePlacement;
            }

            if (!slotById.TryGetValue(req.AssignedCompSlotId.Value, out SchedulerSlot? assignedSlot))
            {
                return FrozenReasons.OutOfScopePlacement;
            }

            // סלוט מפורסם מקפיא את השיבוץ שבתוכו - צד-המקור, לא רק צד-היעד.
            if (assignedSlot.IsPublished)
            {
                return FrozenReasons.PublishedSlot;
            }

            // נתוני-מדור-קודם: שורה Assigned ללא שעת-התחלה אין לה מיקום לזוז ממנו
            // (היא גם אינה זורעת ציר-זמן). קיימות שורות כאלה בנתונים החיים.
            // הפגם של השורה עצמה ספציפי יותר ולכן גובר על פגם-הסלוט שלמטה.
            if (!req.AssignedStartTime.HasValue)
            {
                return FrozenReasons.NoStartTime;
            }

            // שורה תקינה לגמרי, אבל היא יושבת בסלוט לא-בטוח. אין להזיז אותה -
            // לא החוצה ולא בתוך הסלוט - כי מצב-התפוסה של הסלוט אינו ניתן לאימות.
            if (unsafeLegacySlotIds.Contains(assignedSlot.PaidTimeSlotInCompId))
            {
                return FrozenReasons.UnsafeLegacySlot;
            }

            if (!req.AssignedOrder.HasValue)
            {
                return FrozenReasons.OutOfScopePlacement;
            }

            foreach ((SchedulerSlot slot, string kind) candidate in candidates)
            {
                if (candidate.slot.PaidTimeSlotInCompId == assignedSlot.PaidTimeSlotInCompId)
                {
                    return null;
                }
            }

            return FrozenReasons.OutOfScopePlacement;
        }

        // סוג-המיקום הנוכחי של שיבוץ קיים, נגזר מרשימת-המועמדים שלו.
        private static string ResolvePlacementKind(
            List<(SchedulerSlot slot, string kind)> candidates,
            SchedulerSlot assignedSlot)
        {
            foreach ((SchedulerSlot slot, string kind) candidate in candidates)
            {
                if (candidate.slot.PaidTimeSlotInCompId == assignedSlot.PaidTimeSlotInCompId)
                {
                    return candidate.kind;
                }
            }
            return PlacementKinds.Requested;
        }

        // רשימת סלוטי-המועמד של בקשה: הסלוט המבוקש (אם אינו מפורסם) ואחריו
        // השכנים הפיזיים הכשירים. הסדר הוא סדר-ההעדפה: מבוקש, קודם, הבא.
        private static List<(SchedulerSlot slot, string kind)> BuildCandidateSlots(
            SchedulerRequest req,
            Dictionary<int, SchedulerSlot> slotById,
            Dictionary<DateTime, List<SchedulerSlot>> slotsByDate)
        {
            List<(SchedulerSlot slot, string kind)> list = new List<(SchedulerSlot, string)>();

            if (!slotById.TryGetValue(req.RequestedCompSlotId, out SchedulerSlot? requestedSlot))
            {
                return list;
            }

            if (!requestedSlot.IsPublished)
            {
                list.Add((requestedSlot, PlacementKinds.Requested));
            }

            list.AddRange(ResolveAdjacentCandidates(slotsByDate, requestedSlot));
            return list;
        }

        // תוצאת-ביניים של מועמד יחיד בין שלב 1 לשלב 3 ועד לפליטה. אינה נחשפת
        // מחוץ למנוע; ההחלטות עצמן נפלטות בסוף, בסדר FIFO המקורי.
        private sealed class CandidateOutcome
        {
            public SchedulerRequest Request = null!;

            // הסלוט המבוקש כפי שנפתר מתמונת-המצב (null אם לא נמצא).
            public SchedulerSlot? RequestedSlot;

            // סיבת-הכשל של הסלוט המבוקש בשלב 1 - הסיבה הסופית שתדווח.
            public UnscheduledCause RequestedSlotCause = UnscheduledCause.CapacityOrCoach;

            // נכון רק כשהסלוט המבוקש נמצא, אינו מפורסם, ולא נמצא בו מקום.
            public bool EligibleForFallback;

            // נכון כשבוצע ניסיון-מיקום בפועל על סלוט סמוך כלשהו בשלב 2.
            public bool AdjacentSlotsTried;

            // V2-2: נכון כשהופעל חיפוש-הזזה בשלב 3 עבור הבקשה.
            public bool MovementAttempted;

            // V2-2: נכון כשחיפוש-ההזזה נעצר במגבלת עומק/תקציב.
            public bool MovementSearchExhausted;

            public bool Placed;
            public SchedulerSlot? Slot;
            public Interval Placement;
            public int AssignedOrder;
            public string PlacementKind = PlacementKinds.Requested;
            public string AuditReason = string.Empty;

            // סיבת-Pending סופית שנקבעה כבר בשלב 1 (סלוט חסר / מפורסם).
            public string? PendingReason;
            public int? PendingSlotId;
        }

        // מקבץ את סלוטי התחרות לפי תאריך, וממיין כל יום בסדר דטרמיניסטי מלא:
        // StartTime, EndTime, ArenaRanchId, ArenaId, PaidTimeSlotInCompId.
        // המפתח האחרון הוא מפתח ראשי, ולכן הסדר הוא סדר-מלא ללא תיקו - אינו תלוי
        // בסדר ה-JSON, בסדר שורות ה-DB או בסדר מעבר על מילון.
        private static Dictionary<DateTime, List<SchedulerSlot>> BuildOrderedSlotsByDate(
            List<SchedulerSlot> slots)
        {
            Dictionary<DateTime, List<SchedulerSlot>> byDate = new Dictionary<DateTime, List<SchedulerSlot>>();

            foreach (SchedulerSlot s in slots)
            {
                DateTime key = s.SlotDate.Date;
                if (!byDate.TryGetValue(key, out List<SchedulerSlot>? list))
                {
                    list = new List<SchedulerSlot>();
                    byDate[key] = list;
                }
                list.Add(s);
            }

            foreach (KeyValuePair<DateTime, List<SchedulerSlot>> entry in byDate)
            {
                entry.Value.Sort(CompareSlotsForAdjacency);
            }

            return byDate;
        }

        private static int CompareSlotsForAdjacency(SchedulerSlot a, SchedulerSlot b)
        {
            int c = a.StartTime.CompareTo(b.StartTime);
            if (c != 0) return c;

            c = a.EndTime.CompareTo(b.EndTime);
            if (c != 0) return c;

            c = a.ArenaRanchId.CompareTo(b.ArenaRanchId);
            if (c != 0) return c;

            c = a.ArenaId.CompareTo(b.ArenaId);
            if (c != 0) return c;

            return a.PaidTimeSlotInCompId.CompareTo(b.PaidTimeSlotInCompId);
        }

        // השכנים הפיזיים המיידיים של הסלוט המבוקש באותו יום (עמדה i-1 ואז i+1).
        // שכן שאינו כשיר מדולג ואינו מוחלף בסלוט המרוחק שתי עמדות או יותר.
        // חציית תאריך בלתי-אפשרית מבנית: הרשימה היא של אותו SlotDate בלבד.
        private static List<(SchedulerSlot slot, string kind)> ResolveAdjacentCandidates(
            Dictionary<DateTime, List<SchedulerSlot>> slotsByDate,
            SchedulerSlot requestedSlot)
        {
            List<(SchedulerSlot slot, string kind)> candidates = new List<(SchedulerSlot, string)>();

            if (!slotsByDate.TryGetValue(requestedSlot.SlotDate.Date, out List<SchedulerSlot>? sameDay))
            {
                return candidates;
            }

            int index = sameDay.FindIndex(s => s.PaidTimeSlotInCompId == requestedSlot.PaidTimeSlotInCompId);
            if (index < 0)
            {
                return candidates;
            }

            if (index - 1 >= 0 && IsEligibleAdjacent(sameDay[index - 1], requestedSlot))
            {
                candidates.Add((sameDay[index - 1], PlacementKinds.PreviousSameDay));
            }

            if (index + 1 < sameDay.Count && IsEligibleAdjacent(sameDay[index + 1], requestedSlot))
            {
                candidates.Add((sameDay[index + 1], PlacementKinds.NextSameDay));
            }

            return candidates;
        }

        // כשירות שכן: אינו מפורסם, ובאותו מגרש כמו הסלוט המבוקש (V2-1:
        // נפילה חוצת-מגרשים נדחתה במפורש). שיוך-התחרות ושוויון-התאריך מובטחים
        // מבנית - תמונת-המצב היא של תחרות אחת, והרשימה היא של יום אחד.
        private static bool IsEligibleAdjacent(SchedulerSlot candidate, SchedulerSlot requestedSlot)
        {
            if (candidate.IsPublished)
            {
                return false;
            }

            if (candidate.ArenaKey != requestedSlot.ArenaKey)
            {
                return false;
            }

            return true;
        }

        // מוסיף החלטת Pending יחידה (ללא שדות-שיבוץ), רישום ביקורת ומונה.
        private static void AddPendingDecision(
            AutoScheduleResult result,
            CandidateOutcome outcome,
            string reason)
        {
            result.Assignments.Add(new AssignmentDecision
            {
                PaidTimeRequestId = outcome.Request.PaidTimeRequestId,
                HorseId = outcome.Request.HorseId,
                CoachFederationMemberId = outcome.Request.CoachFederationMemberId,
                Status = "Pending",
                AdjacentSlotsTried = outcome.AdjacentSlotsTried,
                ChangeKind = ChangeKinds.Unscheduled,
                MovementAttempted = outcome.MovementAttempted,
                MovementSearchExhausted = outcome.MovementSearchExhausted
            });

            result.Audit.Add(new AuditLogEntry
            {
                PaidTimeRequestId = outcome.Request.PaidTimeRequestId,
                Action = "unscheduled",
                Reason = reason,
                NewSlotId = outcome.PendingSlotId
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
            SchedulingState state,
            out UnscheduledCause cause)
        {
            // ברירת מחדל: קיבולת/מאמן (כולל קיבולת, גבולות, חפיפת-סלוט, מאמן).
            cause = UnscheduledCause.CapacityOrCoach;

            // סלוט לא-בטוח (V2-2): מכיל שורה Assigned ללא שעת-התחלה, ולכן תפוסתו
            // האמיתית אינה ניתנת לאימות. אין נכנסים אליו - לא בשיבוץ חדש ולא
            // כיעד-הזזה. הכשל מדווח בסיבת-הסלוט-המבוקש הרגילה ולא בסיבה חדשה:
            // הבקשה אכן לא שובצה, ואין שום טענה שהזזה כן הצליחה.
            // הקבוצה ריקה במסלול ה-bulk, ולכן התנהגות V2-1 שם אינה משתנה.
            if (state.UnsafeLegacySlotIds.Contains(slot.PaidTimeSlotInCompId))
            {
                return null;
            }

            DateTime slotStart = slot.SlotDate.Date.Add(slot.StartTime);
            DateTime slotEnd = slot.SlotDate.Date.Add(slot.EndTime);

            // קיבולת: סך דקות שכבר תפוסות בסלוט + הבקשה הנוכחית <= קיבולת.
            // כשל קיבולת חוזר מוקדם ולעולם אינו מסומן כרוכב/סוס.
            int usedMinutes = state.Slots.GetUsedMinutes(slot.PaidTimeSlotInCompId);
            if (usedMinutes + req.DurationMinutes > slot.TotalCapacityMinutes)
            {
                return null;
            }

            // מנסה את הקצה המוקדם ביותר של הסלוט; אם תפוס - אחרי כל קטע תפוס.
            List<Interval> busyInSlot = state.Slots.GetIntervals(slot.PaidTimeSlotInCompId);
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
                if (state.Slots.OverlapsAny(slot.PaidTimeSlotInCompId, candidate)) continue;

                // המאמן לא תפוס (כולל מעבר 7 דק' אם בא ממגרש אחר). התנהגות מאמן לא שונתה.
                if (!state.Coach.IsCoachAvailable(req.CoachFederationMemberId, slot, candidate, TRANSITION_MINUTES)) continue;

                // מכאן והלאה - עבר קיבולת/גבולות/סלוט/מאמן; חוסמי רוכב/סוס בלבד.
                // הרוכב לא תפוס (חפיפה טהורה, ללא מרווח-מעבר).
                if (state.Riders.IsBusy(req.RiderFederationMemberId, candidate))
                {
                    // מקדם ל-Rider רק אם טרם נמצא חוסם עמוק יותר (Horse).
                    if (cause == UnscheduledCause.CapacityOrCoach)
                    {
                        cause = UnscheduledCause.Rider;
                    }
                    continue;
                }

                // הסוס לא תפוס (חפיפה טהורה, ללא מרווח-מעבר).
                if (state.Horses.IsBusy(req.HorseId, candidate))
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

        // הסרת רשומה אחת בדיוק (V2-2: הרמת שיבוץ נייד בתוך שרשרת-הדחה).
        // מסירה את ההתאמה הראשונה בלבד, כדי ששתי רשומות זהות לא יימחקו יחד.
        public bool Remove(int coachId, SchedulerSlot slot, Interval interval)
        {
            if (!_byCoach.TryGetValue(coachId, out List<(SchedulerSlot slot, Interval interval)>? items))
            {
                return false;
            }

            for (int i = 0; i < items.Count; i++)
            {
                if (items[i].slot.PaidTimeSlotInCompId == slot.PaidTimeSlotInCompId
                    && items[i].interval.Start == interval.Start
                    && items[i].interval.End == interval.End)
                {
                    items.RemoveAt(i);
                    return true;
                }
            }

            return false;
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

        // הסרת קטע אחד בדיוק (ראה CoachTimeline.Remove).
        public bool Remove(int slotId, Interval interval)
        {
            if (!_bySlot.TryGetValue(slotId, out List<Interval>? list))
            {
                return false;
            }

            for (int i = 0; i < list.Count; i++)
            {
                if (list[i].Start == interval.Start && list[i].End == interval.End)
                {
                    list.RemoveAt(i);
                    return true;
                }
            }

            return false;
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

        // הסרת קטע אחד בדיוק (ראה CoachTimeline.Remove).
        public bool Remove(int entityId, Interval interval)
        {
            if (!_byEntity.TryGetValue(entityId, out List<Interval>? list))
            {
                return false;
            }

            for (int i = 0; i < list.Count; i++)
            {
                if (list[i].Start == interval.Start && list[i].End == interval.End)
                {
                    list.RemoveAt(i);
                    return true;
                }
            }

            return false;
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
