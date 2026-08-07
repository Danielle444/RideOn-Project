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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int InsertArena(int ranchId, string arenaName, short? arenaLength, short? arenaWidth, bool? isCovered)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", ranchId },
                { "@ArenaName", arenaName },
                { "@ArenaLength", arenaLength ?? (object)DBNull.Value },
                { "@ArenaWidth", arenaWidth ?? (object)DBNull.Value },
                { "@IsCovered", isCovered ?? (object)DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertArena", connection, paramDic))
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

        public void UpdateArena(int ranchId, short arenaId, string arenaName, short? arenaLength, short? arenaWidth, bool? isCovered)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", ranchId },
                { "@ArenaId", arenaId },
                { "@ArenaName", arenaName },
                { "@ArenaLength", arenaLength ?? (object)DBNull.Value },
                { "@ArenaWidth", arenaWidth ?? (object)DBNull.Value },
                { "@IsCovered", isCovered ?? (object)DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateArena", connection, paramDic))
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

        public void DeleteArena(int ranchId, short arenaId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", ranchId },
                { "@ArenaId", arenaId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteArena", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (PostgresException ex) when (ex.SqlState == "P0001")
            {
                // Business-rule guard raised inside usp_DeleteArena (arena
                // still in use, or not found). The proc has no custom
                // ERRCODE, so Postgres's default RAISE EXCEPTION SQLSTATE
                // (P0001) is what's actually thrown here -- same convention
                // the RN001 guards elsewhere in this codebase use, just
                // without a DB migration to add one. Message text is
                // already correct Hebrew; surface it as-is.
                throw new BL.ValidationException(ex.MessageText);
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }
    }
}