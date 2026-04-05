using Microsoft.Data.SqlClient;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class ClassInCompetitionDAL : DBServices
    {
        public List<ClassInCompetition> GetClassesByCompetitionId(int competitionId)
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

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetClassesByCompetitionId", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<ClassInCompetition> list = new List<ClassInCompetition>();

                        while (reader.Read())
                        {
                            list.Add(new ClassInCompetition
                            {
                                ClassInCompId = Convert.ToInt32(reader["ClassInCompId"]),
                                CompetitionId = competitionId,
                                ClassTypeId = Convert.ToInt16(reader["ClassTypeId"]),
                                ClassName = reader["ClassName"] == DBNull.Value ? null : reader["ClassName"].ToString(),
                                OrganizerCost = reader["OrganizerCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["OrganizerCost"]),
                                FederationCost = reader["FederationCost"] == DBNull.Value ? null : Convert.ToDecimal(reader["FederationCost"]),
                                StartTime = reader["StartTime"] == DBNull.Value ? null : (TimeSpan?)reader["StartTime"],
                                OrderInDay = reader["OrderInDay"] == DBNull.Value ? null : Convert.ToByte(reader["OrderInDay"]),
                                ClassNotes = reader["ClassNotes"] == DBNull.Value ? null : reader["ClassNotes"].ToString()
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

        public int InsertClassInCompetition(ClassInCompetition item)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", item.CompetitionId },
                { "@ClassTypeId", item.ClassTypeId },
                { "@ArenaRanchId", item.ArenaRanchId },
                { "@ArenaId", item.ArenaId },
                { "@ClassDateTime", item.ClassDateTime },
                { "@StartTime", item.StartTime },
                { "@OrderInDay", item.OrderInDay },
                { "@OrganizerCost", item.OrganizerCost },
                { "@FederationCost", item.FederationCost },
                { "@ClassNotes", item.ClassNotes }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_InsertClassInCompetition", connection, paramDic))
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

        public void UpdateClassInCompetition(ClassInCompetition item)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", item.ClassInCompId },
                { "@ClassTypeId", item.ClassTypeId },
                { "@ArenaRanchId", item.ArenaRanchId },
                { "@ArenaId", item.ArenaId },
                { "@ClassDateTime", item.ClassDateTime },
                { "@StartTime", item.StartTime },
                { "@OrderInDay", item.OrderInDay },
                { "@OrganizerCost", item.OrganizerCost },
                { "@FederationCost", item.FederationCost },
                { "@ClassNotes", item.ClassNotes }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateClassInCompetition", connection, paramDic))
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

        public void DeleteClassInCompetition(int classInCompId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteClassInCompetition", connection, paramDic))
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
    }
}