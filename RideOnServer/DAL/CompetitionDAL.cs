using Npgsql;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition;
using System.Data;
using System.Text.Json;
using NpgsqlTypes;

namespace RideOnServer.DAL
{
    public class CompetitionDAL : DBServices
    {
        public List<Competition> GetCompetitionsByHostRanch(CompetitionFiltersRequest filters)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public Competition? GetCompetitionById(int competitionId)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int InsertCompetition(Competition competition)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@HostRanchId", competition.HostRanchId },
                { "@FieldId", competition.FieldId },
                { "@CreatedBySystemUserId", competition.CreatedBySystemUserId },
                { "@CompetitionName", competition.CompetitionName },
                { "@CompetitionStartDate", competition.CompetitionStartDate.Date },
                { "@CompetitionEndDate", competition.CompetitionEndDate.Date },
                { "@RegistrationOpenDate", competition.RegistrationOpenDate?.Date },
                { "@RegistrationEndDate", competition.RegistrationEndDate?.Date },
                { "@PaidTimeRegistrationDate", competition.PaidTimeRegistrationDate?.Date },
                { "@PaidTimePublicationDate", competition.PaidTimePublicationDate?.Date },
                { "@CompetitionStatus", competition.CompetitionStatus },
                { "@Notes", competition.Notes }
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateCompetition(Competition competition)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@CompetitionId", competition.CompetitionId },
                { "@FieldId", competition.FieldId },
                { "@CompetitionName", competition.CompetitionName },
                { "@CompetitionStartDate", competition.CompetitionStartDate.Date },
                { "@CompetitionEndDate", competition.CompetitionEndDate.Date },
                { "@RegistrationOpenDate", competition.RegistrationOpenDate?.Date },
                { "@RegistrationEndDate", competition.RegistrationEndDate?.Date },
                { "@PaidTimeRegistrationDate", competition.PaidTimeRegistrationDate?.Date },
                { "@PaidTimePublicationDate", competition.PaidTimePublicationDate?.Date },
                { "@CompetitionStatus", competition.CompetitionStatus },
                { "@Notes", competition.Notes }
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<Competition> GetAllCompetitionsForMobileAdmin()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllCompetitionsForMobileAdmin", connection, null))
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<Competition> GetCompetitionsForMobileWorker(int ranchId)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@RanchId", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetCompetitionsForMobileWorker", connection, paramDic))
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<Competition> GetCompetitionsForMobilePayer(int personId)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@PersonId", personId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetCompetitionsForMobilePayer", connection, paramDic))
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<Competition> GetCompetitionsForMobileAdminHome(int systemUserId)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@SystemUserId", systemUserId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetMobileAdminHomeCompetitions", connection, paramDic))
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<string> GetJudgeNamesByCompetitionId(int competitionId)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@CompetitionId", competitionId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetJudgesByCompetitionId", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<string> list = new List<string>();

                        while (reader.Read())
                        {
                            string fullName =
                                ((reader["FirstNameHebrew"] == DBNull.Value ? "" : reader["FirstNameHebrew"].ToString()) + " " +
                                 (reader["LastNameHebrew"] == DBNull.Value ? "" : reader["LastNameHebrew"].ToString())).Trim();

                            if (!string.IsNullOrWhiteSpace(fullName))
                            {
                                list.Add(fullName);
                            }
                        }

                        return list.Distinct().ToList();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public DuplicateCompetitionResponse DuplicateCompetition(
            DuplicateCompetitionRequest request,
            int createdBySystemUserId)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@SourceCompetitionId", request.SourceCompetitionId },
                { "@CreatedBySystemUserId", createdBySystemUserId },
                { "@NewCompetitionName", request.NewCompetitionName },
                { "@NewCompetitionStartDate", request.NewCompetitionStartDate.Date },
                { "@NewCompetitionEndDate", request.NewCompetitionEndDate.Date },
                { "@RegistrationOpenDate", request.RegistrationOpenDate?.Date },
                { "@RegistrationEndDate", request.RegistrationEndDate?.Date },
                { "@PaidTimeRegistrationDate", request.PaidTimeRegistrationDate?.Date },
                { "@PaidTimePublicationDate", request.PaidTimePublicationDate?.Date },
                { "@Notes", string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim() },
                { "@CopyClasses", request.CopyClasses },
                { "@CopyClassPrices", request.CopyClassPrices },
                { "@CopyClassPrizes", request.CopyClassPrizes },
                { "@CopyReiningPatterns", request.CopyReiningPatterns },
                { "@ClassJudgeIds", request.ClassJudgeIds == null ? Array.Empty<int>() : request.ClassJudgeIds.ToArray() },
                { "@CopyPaidTimeSlots", request.CopyPaidTimeSlots }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DuplicateCompetition", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new DuplicateCompetitionResponse
                            {
                                NewCompetitionId = Convert.ToInt32(reader["NewCompetitionId"]),
                                CopiedClassesCount = Convert.ToInt32(reader["CopiedClassesCount"]),
                                CopiedClassPrizesCount = Convert.ToInt32(reader["CopiedClassPrizesCount"]),
                                CopiedReiningPatternsCount = Convert.ToInt32(reader["CopiedReiningPatternsCount"]),
                                CopiedClassJudgesCount = Convert.ToInt32(reader["CopiedClassJudgesCount"]),
                                CopiedPaidTimeSlotsCount = Convert.ToInt32(reader["CopiedPaidTimeSlotsCount"]),
                                Message = reader["Message"].ToString() ?? string.Empty
                            };
                        }

                        throw new Exception("Duplicate competition did not return a result");
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public DuplicateCompetitionResponse DuplicateCompetitionFromSelection(
    DuplicateCompetitionFromSelectionRequest request,
    int createdBySystemUserId)
        {
            JsonSerializerOptions jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            string classesJson = JsonSerializer.Serialize(
                request.Classes ?? new List<DuplicateCompetitionSelectionClassItem>(),
                jsonOptions
            );

            string paidTimeSlotsJson = JsonSerializer.Serialize(
                request.PaidTimeSlots ?? new List<DuplicateCompetitionSelectionPaidTimeSlotItem>(),
                jsonOptions
            );

            // Order MUST match usp_DuplicateCompetitionFromSelection's parameter list:
            // CreateCommandWithStoredProcedure binds positionally (@p1..@p13). Key names
            // only drive NpgsqlDbType resolution in AddParameterWithType.
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@SourceCompetitionId", request.SourceCompetitionId },
                { "@CreatedBySystemUserId", createdBySystemUserId },
                { "@NewCompetitionName", request.NewCompetitionName },
                { "@NewCompetitionStartDate", request.NewCompetitionStartDate.Date },
                { "@NewCompetitionEndDate", request.NewCompetitionEndDate.Date },
                { "@RegistrationOpenDate", request.RegistrationOpenDate?.Date },
                { "@RegistrationEndDate", request.RegistrationEndDate?.Date },
                { "@PaidTimeRegistrationDate", request.PaidTimeRegistrationDate?.Date },
                { "@PaidTimePublicationDate", request.PaidTimePublicationDate?.Date },
                { "@Notes", string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim() },
                { "@ClassJudgeIds", request.ClassJudgeIds == null ? Array.Empty<int>() : request.ClassJudgeIds.ToArray() },
                { "@ClassesJson", classesJson },
                { "@PaidTimeSlotsJson", paidTimeSlotsJson }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DuplicateCompetitionFromSelection", connection, paramDic))
                    {
                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                return new DuplicateCompetitionResponse
                                {
                                    NewCompetitionId = Convert.ToInt32(reader["NewCompetitionId"]),
                                    CopiedClassesCount = Convert.ToInt32(reader["CopiedClassesCount"]),
                                    CopiedClassPrizesCount = Convert.ToInt32(reader["CopiedClassPrizesCount"]),
                                    CopiedReiningPatternsCount = Convert.ToInt32(reader["CopiedReiningPatternsCount"]),
                                    CopiedClassJudgesCount = Convert.ToInt32(reader["CopiedClassJudgesCount"]),
                                    CopiedPaidTimeSlotsCount = Convert.ToInt32(reader["CopiedPaidTimeSlotsCount"]),
                                    Message = reader["Message"].ToString() ?? string.Empty
                                };
                            }

                            throw new Exception("Duplicate competition from selection did not return a result");
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
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
                    : reader["FieldName"].ToString(),
                HostRanchName = HasColumn(reader, "HostRanchName") && reader["HostRanchName"] != DBNull.Value
                    ? reader["HostRanchName"].ToString()
                    : null,
            };
        }

        private bool HasColumn(NpgsqlDataReader reader, string columnName)
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                if (reader.GetName(i).Equals(columnName, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }
    }
}