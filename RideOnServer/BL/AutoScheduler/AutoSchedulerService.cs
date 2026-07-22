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

            AutoScheduleResult result = AutoScheduler.Schedule(data, candidateRequestIds);

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
    }
}
