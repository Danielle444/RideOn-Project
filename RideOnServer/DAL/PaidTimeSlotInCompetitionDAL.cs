using Microsoft.Data.SqlClient;
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
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetPaidTimeSlotsByCompId", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<PaidTimeSlotInCompetition> list = new List<PaidTimeSlotInCompetition>();

                        while (reader.Read())
                        {
                            list.Add(new PaidTimeSlotInCompetition
                            {
                                CompSlotId = Convert.ToInt32(reader["CompSlotId"]),
                                CompetitionId = competitionId,
                                SlotDate = Convert.ToDateTime(reader["SlotDate"]),
                                TimeOfDay = reader["TimeOfDay"] == DBNull.Value ? null : reader["TimeOfDay"].ToString(),
                                StartTime = (TimeSpan)reader["StartTime"],
                                EndTime = (TimeSpan)reader["EndTime"],
                                ArenaRanchId = Convert.ToInt32(reader["ArenaRanchId"]),
                                ArenaId = Convert.ToByte(reader["ArenaId"]),
                                ArenaName = reader["ArenaName"] == DBNull.Value ? null : reader["ArenaName"].ToString()
                            });
                        }

                        return list;
                    }
                }
            }
            catch (SqlException ex)
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
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_InsertPaidTimeSlotInComp", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (SqlException ex)
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
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdatePaidTimeSlotInComp", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (SqlException ex)
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
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_DeletePaidTimeSlotInComp", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<PaidTimeSlot> GetAllPaidTimeBaseSlots()
        {
            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllPaidTimeBaseSlots", connection, null))
                    using (SqlDataReader reader = command.ExecuteReader())
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
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }
    }
}