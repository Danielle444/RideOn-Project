using Npgsql;
using RideOnServer.BL.DTOs.Financial;

namespace RideOnServer.DAL
{
    public class FinancialConfigDAL : DBServices
    {
        public FinancialConfig? GetFinancialConfigForCompetition(int competitionId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", competitionId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    FinancialConfig? item = null;

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetFinancialConfigForCompetition", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            item = new FinancialConfig
                            {
                                RanchId = ReadOptionalInt(reader, "ranchid"),
                                CompetitionDays = ReadOptionalInt(reader, "competitiondays"),
                                FieldId = ReadOptionalInt(reader, "fieldid"),
                                MaxHorseClassesPerDay = ReadOptionalInt(reader, "maxhorseclassesperday"),
                                StallRegularPrice = ReadOptionalDecimal(reader, "stallregularprice"),
                                StallUpgradedPrice = ReadOptionalDecimal(reader, "stallupgradedprice"),
                                StallRegularSupply = ReadOptionalInt(reader, "stallregularsupply"),
                                StallUpgradedSupply = ReadOptionalInt(reader, "stallupgradedsupply"),
                                ShavingsPriceMin = ReadOptionalDecimal(reader, "shavingspricemin"),
                                ShavingsPriceMax = ReadOptionalDecimal(reader, "shavingspricemax"),
                                ShavingsActiveCount = ReadOptionalInt(reader, "shavingsactivecount"),
                                ShavingsBagsMin = ReadOptionalDecimal(reader, "shavingsbagsmin"),
                                ShavingsBagsMax = ReadOptionalDecimal(reader, "shavingsbagsmax"),
                                TackHorsesPerUnitMin = ReadOptionalDecimal(reader, "tackhorsesperunitmin"),
                                TackHorsesPerUnitMax = ReadOptionalDecimal(reader, "tackhorsesperunitmax")
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

        // Absent-column tolerance, same rationale as ScheduleConfigDAL.ReadOptionalDecimal: the DB
        // deploys independently of this backend, so a proc revision that adds or drops a column
        // must not throw IndexOutOfRangeException (which is not an NpgsqlException and would escape
        // the catch above, turning a partial degrade into a hard 400). Treating an absent column as
        // an absent value keeps the backend tolerant of DB deploy order in both directions.
        private static decimal? ReadOptionalDecimal(NpgsqlDataReader reader, string columnName)
        {
            if (!HasColumn(reader, columnName))
            {
                return null;
            }

            object value = reader[columnName];

            return value == DBNull.Value ? null : Convert.ToDecimal(value);
        }

        private static int? ReadOptionalInt(NpgsqlDataReader reader, string columnName)
        {
            if (!HasColumn(reader, columnName))
            {
                return null;
            }

            object value = reader[columnName];

            return value == DBNull.Value ? null : Convert.ToInt32(value);
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
