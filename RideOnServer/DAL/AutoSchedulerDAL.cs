using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.AutoScheduler;

namespace RideOnServer.DAL
{
    public class AutoSchedulerDAL : DBServices
    {
        private static readonly JsonSerializerOptions DeserializeOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        public SchedulerData GetAutoSchedulerData(int competitionId)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT public.usp_getautoschedulerdata(
                            p_competitionid := @competitionId
                        );", connection))
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;

                        object? scalar = command.ExecuteScalar();

                        if (scalar == null || scalar == DBNull.Value)
                        {
                            return new SchedulerData
                            {
                                CompetitionId = competitionId,
                                Now = DateTime.UtcNow
                            };
                        }

                        string json = scalar.ToString() ?? "{}";

                        SchedulerData? data = JsonSerializer.Deserialize<SchedulerData>(json, DeserializeOptions);
                        return data ?? new SchedulerData { CompetitionId = competitionId };
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int ApplyAutoSchedule(List<AssignmentDecision> decisions, int[] allowedRequestIds, int competitionId)
        {
            // אין קריאה לפרוצדורה 129 כשאין החלטות או כשקבוצת המזהים המורשים ריקה
            // (הפרוצדורה זורקת חריגה על מערך ריק).
            if (decisions == null || decisions.Count == 0
                || allowedRequestIds == null || allowedRequestIds.Length == 0)
            {
                return 0;
            }

            string json = JsonSerializer.Serialize(decisions.Select(d => new
            {
                paidTimeRequestId = d.PaidTimeRequestId,
                assignedCompSlotId = d.AssignedCompSlotId,
                assignedStartTime = d.AssignedStartTime?.ToString("o"),
                assignedOrder = d.AssignedOrder,
                status = d.Status
            }));

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT public.usp_applyautoschedule(
                            p_assignments := @assignments::jsonb,
                            p_allowedrequestids := @allowedRequestIds,
                            p_competitionid := @competitionId
                        );", connection))
                    {
                        command.Parameters.Add("@assignments", NpgsqlDbType.Jsonb).Value = json;
                        command.Parameters.Add("@allowedRequestIds", NpgsqlDbType.Array | NpgsqlDbType.Integer).Value = allowedRequestIds;
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;

                        object? scalar = command.ExecuteScalar();
                        if (scalar == null || scalar == DBNull.Value)
                        {
                            return 0;
                        }
                        return Convert.ToInt32(scalar);
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        // V2-2: החלת קבוצת-הכתיבה דרך פרוצדורה 182. שונה מהותית מ-129:
        // המטען נושא גם מצב-ישן צפוי לכל שורה, וגם את זהות המאשר לשורת-הביקורת.
        // פרוצדורה 129 נשארת ללא שינוי ומשרתת את מסלול ה-bulk.
        //
        // מחזיר את גוף ה-JSON שהפרוצדורה החזירה (assigned/moved/audited).
        public string ApplyAutoScheduleV2(
            AutoScheduleWritePlan plan,
            int competitionId,
            int appliedByPersonId)
        {
            // אין קריאה לפרוצדורה כשאין מה לכתוב. תוכנית ריקה היא תוצאה תקינה
            // לחלוטין (שום בקשה לא שובצה ושום שיבוץ לא הוזז), לא שגיאה.
            if (plan == null || plan.Items == null || plan.Items.Count == 0)
            {
                return "{\"assigned\":0,\"moved\":0,\"audited\":0}";
            }

            // סריאליזציה מפורשת בשמות שהפרוצדורה מצפה להם. אין הסתמכות על
            // מדיניות-שמות של הסריאלייזר, בדיוק כמו ב-ApplyAutoSchedule.
            // זמנים נשלחים ב-"o" - אותה סמנטיקה בדיוק כמו במסלול של 129.
            string json = JsonSerializer.Serialize(new
            {
                expectedWriteSetCount = plan.ExpectedWriteSetCount,
                items = plan.Items.Select(i => new
                {
                    paidTimeRequestId = i.PaidTimeRequestId,
                    changeKind = i.ChangeKind,
                    expectedStatus = i.ExpectedStatus,
                    expectedAssignedCompSlotId = i.ExpectedAssignedCompSlotId,
                    expectedAssignedStartTime = i.ExpectedAssignedStartTime?.ToString("o"),
                    expectedAssignedOrder = i.ExpectedAssignedOrder,
                    expectedAllocationOrigin = i.ExpectedAllocationOrigin,
                    newAssignedCompSlotId = i.NewAssignedCompSlotId,
                    newAssignedStartTime = i.NewAssignedStartTime.ToString("o"),
                    newAssignedOrder = i.NewAssignedOrder,
                    newStatus = i.NewStatus,
                    newAllocationOrigin = i.NewAllocationOrigin
                })
            });

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT public.usp_applyautoschedulev2(
                            p_plan              := @plan::jsonb,
                            p_competitionid     := @competitionId,
                            p_appliedbypersonid := @appliedByPersonId
                        );", connection))
                    {
                        command.Parameters.Add("@plan", NpgsqlDbType.Jsonb).Value = json;
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;
                        command.Parameters.Add("@appliedByPersonId", NpgsqlDbType.Integer).Value = appliedByPersonId;

                        object? scalar = command.ExecuteScalar();
                        if (scalar == null || scalar == DBNull.Value)
                        {
                            return "{}";
                        }
                        return scalar.ToString() ?? "{}";
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }
    }
}
