using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class FineDAL : DBServices
    {
        public List<Fine> GetAllFines()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command =
                            CreateCommandWithStoredProcedure(
                                "usp_GetAllFines",
                                connection,
                                null
                            )
                    )
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<Fine> list = new List<Fine>();

                        while (reader.Read())
                        {
                            list.Add(
                                new Fine
                                {
                                    FineId = Convert.ToInt32(reader["FineId"]),

                                    FineAmount = Convert.ToDecimal(
                                        reader["FineAmount"]
                                    ),

                                    FineReason =
                                        reader["FineReason"] == DBNull.Value
                                            ? null
                                            : reader["FineReason"]?.ToString(),

                                    TriggerMode =
                                        reader["TriggerMode"] == DBNull.Value
                                            ? null
                                            : reader["TriggerMode"]?.ToString(),

                                    StartEvent =
                                        reader["StartEvent"] == DBNull.Value
                                            ? null
                                            : reader["StartEvent"]?.ToString(),

                                    EndEvent =
                                        reader["EndEvent"] == DBNull.Value
                                            ? null
                                            : reader["EndEvent"]?.ToString(),

                                    IsActive =
                                        reader["IsActive"] != DBNull.Value
                                        && Convert.ToBoolean(reader["IsActive"])
                                }
                            );
                        }

                        return list;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void UpdateFine(
            int fineId,
            decimal fineAmount,
            string? fineReason,
            string? triggerMode,
            string? startEvent,
            string? endEvent,
            bool isActive
        )
        {
            Dictionary<string, object> paramDic =
                new Dictionary<string, object>
                {
                    { "@fineid_param", fineId },
                    { "@fineamount_param", fineAmount },

                    {
                        "@finereason_param",
                        string.IsNullOrWhiteSpace(fineReason)
                            ? DBNull.Value
                            : fineReason
                    },

                    {
                        "@triggermode_param",
                        string.IsNullOrWhiteSpace(triggerMode)
                            ? DBNull.Value
                            : triggerMode
                    },

                    {
                        "@startevent_param",
                        string.IsNullOrWhiteSpace(startEvent)
                            ? DBNull.Value
                            : startEvent
                    },

                    {
                        "@endevent_param",
                        string.IsNullOrWhiteSpace(endEvent)
                            ? DBNull.Value
                            : endEvent
                    },

                    { "@isactive_param", isActive }
                };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command =
                            CreateCommandWithStoredProcedure(
                                "usp_UpdateFine",
                                connection,
                                paramDic
                            )
                    )
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }
    }
}