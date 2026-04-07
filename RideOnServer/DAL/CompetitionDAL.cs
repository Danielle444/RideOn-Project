using Npgsql;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition;

namespace RideOnServer.DAL
{
    public class CompetitionDAL : DBServices
    {
        public List<Competition> GetCompetitionsByHostRanch(CompetitionFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", filters.RanchId },
                { "@SearchText", filters.SearchText },
                { "@Status", filters.Status },
                { "@FieldId", filters.FieldId },
                { "@DateFrom", filters.DateFrom },
                { "@DateTo", filters.DateTo }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetCompetitionsByHostRanch", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<Competition> list = new List<Competition>();

                        while (reader.Read())
                        {
                            list.Add(MapCompetition(reader));
                        }

                        return list;
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public Competition? GetCompetitionById(int competitionId)
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

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetCompetitionById", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return MapCompetition(reader);
                        }

                        return null;
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int InsertCompetition(Competition competition)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@HostRanchId", competition.HostRanchId },
                { "@FieldId", competition.FieldId },
                { "@CreatedBySystemUserId", competition.CreatedBySystemUserId },
                { "@CompetitionName", competition.CompetitionName },
                { "@CompetitionStartDate", competition.CompetitionStartDate.Date },
                { "@CompetitionEndDate", competition.CompetitionEndDate.Date },
                { "@RegistrationOpenDate", competition.RegistrationOpenDate?.Date ?? (object)DBNull.Value },
                { "@RegistrationEndDate", competition.RegistrationEndDate?.Date ?? (object)DBNull.Value },
                { "@PaidTimeRegistrationDate", competition.PaidTimeRegistrationDate?.Date ?? (object)DBNull.Value },
                { "@PaidTimePublicationDate", competition.PaidTimePublicationDate?.Date ?? (object)DBNull.Value },
                { "@CompetitionStatus", competition.CompetitionStatus ?? (object)DBNull.Value },
                { "@Notes", competition.Notes ?? (object)DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertCompetition", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateCompetition(Competition competition)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", competition.CompetitionId },
                { "@FieldId", competition.FieldId },
                { "@CompetitionName", competition.CompetitionName },
                { "@CompetitionStartDate", competition.CompetitionStartDate.Date },
                { "@CompetitionEndDate", competition.CompetitionEndDate.Date },
                { "@RegistrationOpenDate", competition.RegistrationOpenDate?.Date ?? (object)DBNull.Value },
                { "@RegistrationEndDate", competition.RegistrationEndDate?.Date ?? (object)DBNull.Value },
                { "@PaidTimeRegistrationDate", competition.PaidTimeRegistrationDate?.Date ?? (object)DBNull.Value },
                { "@PaidTimePublicationDate", competition.PaidTimePublicationDate?.Date ?? (object)DBNull.Value },
                { "@CompetitionStatus", competition.CompetitionStatus ?? (object)DBNull.Value },
                { "@Notes", competition.Notes ?? (object)DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateCompetition", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        private Competition MapCompetition(NpgsqlDataReader reader)
        {
            return new Competition
            {
                CompetitionId = Convert.ToInt32(reader["CompetitionId"]),
                HostRanchId = Convert.ToInt32(reader["HostRanchId"]),
                FieldId = Convert.ToByte(reader["FieldId"]),
                CreatedBySystemUserId = Convert.ToInt32(reader["CreatedBySystemUserId"]),
                CompetitionName = reader["CompetitionName"].ToString() ?? string.Empty,
                CompetitionStartDate = Convert.ToDateTime(reader["CompetitionStartDate"]),
                CompetitionEndDate = Convert.ToDateTime(reader["CompetitionEndDate"]),
                RegistrationOpenDate = reader["RegistrationOpenDate"] == DBNull.Value
                    ? null
                    : Convert.ToDateTime(reader["RegistrationOpenDate"]),
                RegistrationEndDate = reader["RegistrationEndDate"] == DBNull.Value
                    ? null
                    : Convert.ToDateTime(reader["RegistrationEndDate"]),
                PaidTimeRegistrationDate = reader["PaidTimeRegistrationDate"] == DBNull.Value
                    ? null
                    : Convert.ToDateTime(reader["PaidTimeRegistrationDate"]),
                PaidTimePublicationDate = reader["PaidTimePublicationDate"] == DBNull.Value
                    ? null
                    : Convert.ToDateTime(reader["PaidTimePublicationDate"]),
                CompetitionStatus = reader["CompetitionStatus"] == DBNull.Value
                    ? null
                    : reader["CompetitionStatus"].ToString(),
                Notes = reader["Notes"] == DBNull.Value
                    ? null
                    : reader["Notes"].ToString(),
                StallMapUrl = reader["StallMapUrl"] == DBNull.Value
                    ? null
                    : reader["StallMapUrl"].ToString(),
                FieldName = reader["FieldName"] == DBNull.Value
                    ? null
                    : reader["FieldName"].ToString()
            };
        }
    }
}