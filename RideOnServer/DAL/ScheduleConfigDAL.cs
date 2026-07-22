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
                                MinutesPerEntryMin = ReadOptionalDecimal(reader, "minutesperentrymin"),
                                MinutesPerEntryMax = ReadOptionalDecimal(reader, "minutesperentrymax"),
                                BetweenClassGapMinutes = ReadOptionalDecimal(reader, "betweenclassgapminutes"),
                                LateFinishYellowHour = ReadOptionalDecimal(reader, "latefinishyellowhour"),
                                LateFinishOrangeHour = ReadOptionalDecimal(reader, "latefinishorangehour"),
                                LateFinishRedHour = ReadOptionalDecimal(reader, "latefinishredhour"),
                                DefaultFirstClassStartHour = ReadOptionalDecimal(reader, "defaultfirstclassstarthour"),
                                FlatteningRunsPerGap = ReadOptionalDecimal(reader, "flatteningrunspergap")
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

        // This proc gains return columns over time (7 as of 2026-07-20, 8 with the flattening
        // interval), and the DB deploys independently of this backend. Indexing a reader by a
        // column the currently deployed proc does not return throws IndexOutOfRangeException,
        // which is NOT an NpgsqlException and so escapes the catch above: the controller turns
        // it into a 400, loadScheduleConfig swallows it by design, and every schedule column
        // silently disappears with nothing surfaced to the secretary. That exact failure was
        // audit finding 1. Treating an absent column as an absent value makes the backend
        // tolerant of DB deploy order in both directions.
        private static decimal? ReadOptionalDecimal(NpgsqlDataReader reader, string columnName)
        {
            if (!HasColumn(reader, columnName))
            {
                return null;
            }

            object value = reader[columnName];

            return value == DBNull.Value ? null : Convert.ToDecimal(value);
        }

        private static bool HasColumn(NpgsqlDataReader reader, string columnName)
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                if (string.Equals(reader.GetName(i), columnName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}
