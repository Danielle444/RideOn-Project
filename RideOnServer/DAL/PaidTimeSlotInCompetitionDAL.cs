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
                                CompSlotId = Convert.ToInt32(reader["CompSlotId"]),
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
                                SlotNotes = reader["SlotNotes"] == DBNull.Value ? null : reader["SlotNotes"].ToString()
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
                { "@CompSlotId", item.CompSlotId },
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

        public void DeletePaidTimeSlotInCompetition(int compSlotId, bool forceDelete)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompSlotId", compSlotId },
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
    }
}