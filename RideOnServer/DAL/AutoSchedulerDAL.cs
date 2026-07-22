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
    }
}
