using Npgsql;
using RideOnServer.BL.DTOs.Schedule;

namespace RideOnServer.DAL
{
    public class ScheduleConfigDAL : DBServices
    {
        public ScheduleConfig? GetScheduleConfigByFieldId(short fieldId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FieldId", fieldId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    ScheduleConfig? item = null;

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetScheduleConfigByFieldId", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            item = new ScheduleConfig
                            {
                                MinutesPerEntryMin = reader["minutesperentrymin"] == DBNull.Value ? null : Convert.ToDecimal(reader["minutesperentrymin"]),
                                MinutesPerEntryMax = reader["minutesperentrymax"] == DBNull.Value ? null : Convert.ToDecimal(reader["minutesperentrymax"]),
                                BetweenClassGapMinutes = reader["betweenclassgapminutes"] == DBNull.Value ? null : Convert.ToDecimal(reader["betweenclassgapminutes"]),
                                LateFinishYellowHour = reader["latefinishyellowhour"] == DBNull.Value ? null : Convert.ToDecimal(reader["latefinishyellowhour"]),
                                LateFinishOrangeHour = reader["latefinishorangehour"] == DBNull.Value ? null : Convert.ToDecimal(reader["latefinishorangehour"]),
                                LateFinishRedHour = reader["latefinishredhour"] == DBNull.Value ? null : Convert.ToDecimal(reader["latefinishredhour"])
                            };
                        }
                    }

                    return item;
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }
    }
}
