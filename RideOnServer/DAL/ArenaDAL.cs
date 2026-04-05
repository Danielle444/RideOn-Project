using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class ArenaDAL : DBServices
    {
        public List<Arena> GetArenasByRanchId(int ranchId)
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

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetArenasByRanchId", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<Arena> list = new List<Arena>();

                        while (reader.Read())
                        {
                            list.Add(new Arena
                            {
                                RanchId = ranchId,
                                ArenaId = Convert.ToByte(reader["ArenaId"]),
                                ArenaName = reader["ArenaName"].ToString() ?? string.Empty,
                                ArenaLength = reader["ArenaLength"] == DBNull.Value
                                    ? null
                                    : Convert.ToInt16(reader["ArenaLength"]),
                                ArenaWidth = reader["ArenaWidth"] == DBNull.Value
                                    ? null
                                    : Convert.ToInt16(reader["ArenaWidth"]),
                                IsCovered = reader["IsCovered"] == DBNull.Value
                                    ? null
                                    : Convert.ToBoolean(reader["IsCovered"])
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