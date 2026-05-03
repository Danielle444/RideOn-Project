using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class PaidTimeSlotInCompetitionDAL : DBServices
    {
        public List<PaidTimeSlotInCompetition> GetPaidTimeSlotsByCompetitionId(int competitionId)
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

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetPaidTimeSlotsByCompId", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<PaidTimeSlotInCompetition> list = new List<PaidTimeSlotInCompetition>();

                        while (reader.Read())
                        {
                            list.Add(new PaidTimeSlotInCompetition
                            {
                                PaidTimeSlotInCompId = Convert.ToInt32(reader["PaidTimeSlotInCompId"]),
                                CompetitionId = competitionId,
                                PaidTimeSlotId = Convert.ToInt32(reader["PaidTimeSlotId"]),
                                SlotDate = Convert.ToDateTime(reader["SlotDate"]),
                                TimeOfDay = reader["TimeOfDay"] == DBNull.Value ? null : reader["TimeOfDay"].ToString(),
                                StartTime = (TimeSpan)reader["StartTime"],
                                EndTime = (TimeSpan)reader["EndTime"],
                                ArenaRanchId = Convert.ToInt32(reader["ArenaRanchId"]),
                                ArenaId = Convert.ToByte(reader["ArenaId"]),
                                ArenaName = reader["ArenaName"] == DBNull.Value ? null : reader["ArenaName"].ToString(),
                                SlotStatus = reader["SlotStatus"] == DBNull.Value ? null : reader["SlotStatus"].ToString(),
                                SlotNotes = reader["SlotNotes"] == DBNull.Value ? null : reader["SlotNotes"].ToString(),
                                TotalCapacityMinutes = reader["TotalCapacityMinutes"] != DBNull.Value ? Convert.ToInt32(reader["TotalCapacityMinutes"]) : 0,
                                UsedCapacityMinutes = reader["UsedCapacityMinutes"] != DBNull.Value ? Convert.ToInt32(reader["UsedCapacityMinutes"]) : 0,
                                RemainingCapacityMinutes = reader["RemainingCapacityMinutes"] != DBNull.Value ? Convert.ToInt32(reader["RemainingCapacityMinutes"]) : 0,
                                EstimatedAvailablePlaces = reader["EstimatedAvailablePlaces"] != DBNull.Value ? Convert.ToInt32(reader["EstimatedAvailablePlaces"]) : 0,
                                AssignedCount = reader["AssignedCount"] != DBNull.Value ? Convert.ToInt32(reader["AssignedCount"]) : 0,
                                PendingRequestsCount = reader["PendingRequestsCount"] != DBNull.Value
                                    ? Convert.ToInt32(reader["PendingRequestsCount"])
                                    : 0,
                            });
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

        public int InsertPaidTimeSlotInCompetition(PaidTimeSlotInCompetition item)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", item.CompetitionId },
                { "@PaidTimeSlotId", item.PaidTimeSlotId },
                { "@ArenaRanchId", item.ArenaRanchId },
                { "@ArenaId", item.ArenaId },
                { "@SlotDate", item.SlotDate },
                { "@StartTime", item.StartTime },
                { "@EndTime", item.EndTime },
                { "@SlotStatus", item.SlotStatus },
                { "@SlotNotes", item.SlotNotes }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertPaidTimeSlotInComp", connection, paramDic))
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

        public void UpdatePaidTimeSlotInCompetition(PaidTimeSlotInCompetition item)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PaidTimeSlotInCompId", item.PaidTimeSlotInCompId },
                { "@PaidTimeSlotId", item.PaidTimeSlotId },
                { "@ArenaRanchId", item.ArenaRanchId },
                { "@ArenaId", item.ArenaId },
                { "@SlotDate", item.SlotDate },
                { "@StartTime", item.StartTime },
                { "@EndTime", item.EndTime },
                { "@SlotStatus", item.SlotStatus },
                { "@SlotNotes", item.SlotNotes }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdatePaidTimeSlotInComp", connection, paramDic))
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

        public void DeletePaidTimeSlotInCompetition(int PaidTimeSlotInCompId, bool forceDelete)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PaidTimeSlotInCompId", PaidTimeSlotInCompId },
                { "@ForceDelete", forceDelete }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeletePaidTimeSlotInComp", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<PaidTimeSlot> GetAllPaidTimeBaseSlots()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllPaidTimeBaseSlots", connection, null))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<PaidTimeSlot> list = new List<PaidTimeSlot>();

                        while (reader.Read())
                        {
                            list.Add(new PaidTimeSlot
                            {
                                PaidTimeSlotId = Convert.ToInt32(reader["PaidTimeSlotId"]),
                                DayOfWeek = reader["DayOfWeek"].ToString() ?? string.Empty,
                                TimeOfDay = reader["TimeOfDay"].ToString() ?? string.Empty
                            });
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

        public PaidTimeSlotInCompetition? GetById(int PaidTimeSlotInCompId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@PaidTimeSlotInCompId", PaidTimeSlotInCompId }
    };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetPaidTimeSlotInCompById", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new PaidTimeSlotInCompetition
                            {
                                PaidTimeSlotInCompId = Convert.ToInt32(reader["PaidTimeSlotInCompId"]),
                                CompetitionId = Convert.ToInt32(reader["CompetitionId"]),
                                PaidTimeSlotId = Convert.ToInt32(reader["PaidTimeSlotId"]),
                                SlotDate = Convert.ToDateTime(reader["SlotDate"]),
                                TimeOfDay = reader["TimeOfDay"]?.ToString(),
                                StartTime = (TimeSpan)reader["StartTime"],
                                EndTime = (TimeSpan)reader["EndTime"],
                                ArenaRanchId = Convert.ToInt32(reader["ArenaRanchId"]),
                                ArenaId = Convert.ToByte(reader["ArenaId"]),
                                ArenaName = reader["ArenaName"]?.ToString(),
                                SlotStatus = reader["SlotStatus"]?.ToString(),
                                SlotNotes = reader["SlotNotes"]?.ToString()
                            };
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
    }
}