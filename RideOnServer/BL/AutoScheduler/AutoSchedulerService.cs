using RideOnServer.DAL;

namespace RideOnServer.BL.AutoScheduler
{
    // אורקסטרציה: קורא את הנתונים מ-DB, מריץ את האלגוריתם,
    // וכותב חזרה את ההחלטות. נקרא אוטומטית בסוף BulkCreate
    // וגם זמין כ-endpoint ידני למזכירה.
    public static class AutoSchedulerService
    {
        public static AutoScheduleResult RunForCompetition(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            AutoSchedulerDAL dal = new AutoSchedulerDAL();

            SchedulerData data = dal.GetAutoSchedulerData(competitionId);
            AutoScheduleResult result = AutoScheduler.Schedule(data);

            if (result.Assignments.Count > 0)
            {
                dal.ApplyAutoSchedule(result.Assignments);
            }

            return result;
        }
    }
}
