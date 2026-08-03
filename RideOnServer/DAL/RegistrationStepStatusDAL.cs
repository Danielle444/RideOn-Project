using Npgsql;
using RideOnServer.BL.DTOs.RegistrationStepStatus;

namespace RideOnServer.DAL
{
    public class RegistrationStepStatusDAL : DBServices
    {
        public RegistrationStepStatus? GetRegistrationStepStatus(int competitionId, int ranchId, int adminPersonId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", competitionId },
                { "@RanchId", ranchId },
                { "@AdminPersonId", adminPersonId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    RegistrationStepStatus? item = null;

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetRegistrationStepStatus", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            item = new RegistrationStepStatus
                            {
                                CompetitionEndDate = ReadOptionalDate(reader, "competitionenddate"),
                                IsCompetitionEnded = ReadOptionalBool(reader, "iscompetitionended"),

                                PaidTimeRegistrationDate = ReadOptionalDate(reader, "paidtimeregistrationdate"),
                                HasPaidTimeSlots = ReadOptionalBool(reader, "haspaidtimeslots"),
                                HasActivePaidTimePrice = ReadOptionalBool(reader, "hasactivepaidtimeprice"),
                                PaidTimeConfigured = ReadOptionalBool(reader, "paidtimeconfigured"),
                                PaidTimeReadyToBook = ReadOptionalBool(reader, "paidtimereadytobook"),
                                IsPaidTimeWindowOpen = ReadOptionalBool(reader, "ispaidtimewindowopen"),

                                HasAdminCreatedActiveEntry = ReadOptionalBool(reader, "hasadmincreatedactiveentry"),
                                HasManagedPayerWithActiveEntry = ReadOptionalBool(reader, "hasmanagedpayerwithactiveentry"),
                                HasRelevantActiveEntry = ReadOptionalBool(reader, "hasrelevantactiveentry"),

                                HasAdminCreatedActiveNonTackStallBooking = ReadOptionalBool(reader, "hasadmincreatedactivenontackstallbooking"),
                                HasManagedPayerWithActiveNonTackStallBooking = ReadOptionalBool(reader, "hasmanagedpayerwithactivenontackstallbooking"),
                                HasRelevantActiveNonTackStallBooking = ReadOptionalBool(reader, "hasrelevantactivenontackstallbooking")
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

        // Absent-column tolerance, same rationale as FinancialConfigDAL.ReadOptionalDecimal: the DB
        // deploys independently of this backend, so a proc revision that adds or drops a column
        // must not throw IndexOutOfRangeException (which is not an NpgsqlException and would escape
        // the catch above, turning a partial degrade into a hard 400). Treating an absent column as
        // an absent value keeps the backend tolerant of DB deploy order in both directions.
        private static bool? ReadOptionalBool(NpgsqlDataReader reader, string columnName)
        {
            if (!HasColumn(reader, columnName))
            {
                return null;
            }

            object value = reader[columnName];

            return value == DBNull.Value ? null : Convert.ToBoolean(value);
        }

        private static DateTime? ReadOptionalDate(NpgsqlDataReader reader, string columnName)
        {
            if (!HasColumn(reader, columnName))
            {
                return null;
            }

            object value = reader[columnName];

            return value == DBNull.Value ? null : Convert.ToDateTime(value);
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
