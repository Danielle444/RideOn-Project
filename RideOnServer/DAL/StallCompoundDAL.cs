using Npgsql;
using RideOnServer.BL.DTOs.StallCompounds;

namespace RideOnServer.DAL
{
    public class StallCompoundDAL : DBServices
    {
        public List<StallCompoundSummary> GetCompoundsSummaryByRanchId(int ranchId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetCompoundsSummaryByRanchId", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<StallCompoundSummary> list = new List<StallCompoundSummary>();

                        while (reader.Read())
                        {
                            list.Add(new StallCompoundSummary
                            {
                                RanchId = ranchId,
                                CompoundId = Convert.ToInt16(reader["CompoundId"]),
                                CompoundName = reader["CompoundName"].ToString() ?? string.Empty,
                                StallTypeProductId = Convert.ToInt16(reader["StallTypeProductId"]),
                                StallTypeName = reader["StallTypeName"].ToString() ?? string.Empty,
                                StallCount = Convert.ToInt32(reader["StallCount"]),
                                LayoutJson = reader["layout"] == DBNull.Value ? null : reader["layout"].ToString()
                            });
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

        public int CreateCompoundWithStallsByPattern(int ranchId, string compoundName, short stallTypeProductId, string numberingPattern)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", ranchId },
                { "@CompoundName", compoundName },
                { "@StallType", stallTypeProductId },
                { "@NumberingPattern", numberingPattern }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_CreateCompoundWithStallsByPattern", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void UpdateCompoundName(int ranchId, short compoundId, string compoundName)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", ranchId },
                { "@CompoundId", compoundId },
                { "@CompoundName", compoundName }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateCompoundName", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void DeleteCompound(int ranchId, short compoundId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", ranchId },
                { "@CompoundId", compoundId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteCompound", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }
    }
}