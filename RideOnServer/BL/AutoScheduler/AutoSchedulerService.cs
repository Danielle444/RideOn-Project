using RideOnServer.DAL;

namespace RideOnServer.BL.AutoScheduler
{
    // אורקסטרציה: קורא את הנתונים מ-DB, מריץ את האלגוריתם,
    // וכותב חזרה את ההחלטות. נקרא אוטומטית בסוף BulkCreate
    // וגם זמין כ-endpoint ידני למזכירה.
    public static class AutoSchedulerService
    {
        // מסלול bulk: טוען snapshot אחד ומריץ עבור קבוצת-המועמדים שנמסרה.
        public static AutoScheduleResult RunForCompetition(int competitionId, IReadOnlyList<int> candidateRequestIds)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            AutoSchedulerDAL dal = new AutoSchedulerDAL();
            SchedulerData data = dal.GetAutoSchedulerData(competitionId);

            return RunForCompetition(data, competitionId, candidateRequestIds);
        }

        // מסלול ידני: מקבל snapshot שכבר נטען (אותו snapshot שממנו נגזרו המועמדים),
        // כדי למנוע טעינה כפולה של נתוני-השיבוץ.
        internal static AutoScheduleResult RunForCompetition(
            SchedulerData data,
            int competitionId,
            IReadOnlyList<int> candidateRequestIds)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (candidateRequestIds == null)
            {
                throw new Exception("candidateRequestIds is required");
            }

            // דחיית כפילויות במזהי-המועמדים.
            HashSet<int> candidateSet = new HashSet<int>();
            foreach (int id in candidateRequestIds)
            {
                if (!candidateSet.Add(id))
                {
                    throw new Exception($"Duplicate candidate request id: {id}");
                }
            }

            // קבוצת מועמדים ריקה: אין עבודה, ולא קוראים לפרוצדורה 129.
            if (candidateSet.Count == 0)
            {
                return new AutoScheduleResult
                {
                    CompetitionId = competitionId,
                    ExecutedAt = data.Now
                };
            }

            // מסלול ה-bulk נשאר V2-1 בדיוק: allowMovement=false. פרוצדורה 129
            // מקבלת אך ורק שיבוצים חדשים, ולכן אסור שהמנוע ייצר כאן החלטות-הזזה.
            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateRequestIds, false);

            // אימות שוויון-קבוצות הגנתי (המנוע כבר מוודא זאת).
            HashSet<int> decisionIds = result.Assignments.Select(a => a.PaidTimeRequestId).ToHashSet();
            if (!decisionIds.SetEquals(candidateSet))
            {
                throw new Exception("Decision set does not equal candidate set");
            }

            AutoSchedulerDAL dal = new AutoSchedulerDAL();
            dal.ApplyAutoSchedule(result.Assignments, candidateSet.ToArray(), competitionId);

            return result;
        }

        // מסלול תצוגה-מקדימה (שלב A): מריץ את *אותו* אלגוריתם על snapshot שכבר
        // נטען, ומחזיר את התוצאה - בלי שום כתיבה ל-DB. אין קריאה ל-ApplyAutoSchedule
        // ואין יצירת AutoSchedulerDAL כאן. read-only מובטח מבנית.
        internal static AutoScheduleResult PreviewForCompetition(
            SchedulerData data,
            int competitionId,
            IReadOnlyList<int> candidateRequestIds)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (candidateRequestIds == null)
            {
                throw new Exception("candidateRequestIds is required");
            }

            // דחיית כפילויות במזהי-המועמדים (עקבי עם מסלול ההרצה).
            HashSet<int> candidateSet = new HashSet<int>();
            foreach (int id in candidateRequestIds)
            {
                if (!candidateSet.Add(id))
                {
                    throw new Exception($"Duplicate candidate request id: {id}");
                }
            }

            // בניגוד למסלול ההרצה, אין כאן short-circuit על קבוצת-מועמדים ריקה:
            // גם ללא מועמדים, התצוגה המקדימה צריכה להציג את השיבוצים הקפואים
            // הקיימים (FrozenItems), ולכן מריצים את האלגוריתם תמיד.
            //
            // V2-2: זהו המסלול היחיד שבו הזזת שיבוצים קיימים מותרת. הוא משותף
            // ל-Preview ול-Apply (BuildVerifiedApplyPlan קורא לאותה מתודה בדיוק
            // על אותה תמונת-מצב), ולכן זהות התוצאה בין השניים מובטחת מבנית.
            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateRequestIds, true);

            // אימות שוויון-קבוצות הגנתי: ההחלטות הן המועמדים *ועוד* שיבוצים
            // קיימים שהוזזו. שורות שלא זזו וקפואות אינן החלטות.
            HashSet<int> decisionIds = result.Assignments.Select(a => a.PaidTimeRequestId).ToHashSet();
            HashSet<int> movedIds = result.Assignments
                .Where(a => a.ChangeKind == ChangeKinds.Moved)
                .Select(a => a.PaidTimeRequestId)
                .ToHashSet();

            HashSet<int> expectedIds = new HashSet<int>(candidateSet);
            expectedIds.UnionWith(movedIds);

            if (!decisionIds.SetEquals(expectedIds))
            {
                throw new Exception("Decision set does not equal candidate set");
            }

            // כל מזהה שאינו מועמד חייב להיות החלטת-הזזה - לעולם לא שיבוץ חדש.
            if (movedIds.Overlaps(candidateSet))
            {
                throw new Exception("A candidate request was emitted as a moved decision");
            }

            return result;
        }
    }
}
