using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.StallMap;

namespace RideOnServer.DAL
{
    public class StallAssignmentDAL : DBServices
    {
        public List<StallMapCompoundDto> GetCompoundsWithLayout(int ranchId)
        {
            var paramDic = new Dictionary<string, object> { { "@RanchId", ranchId } };
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();
                using var command = CreateCommandWithStoredProcedure("usp_GetCompoundsWithLayout", connection, paramDic);
                using var reader = command.ExecuteReader();
                var list = new List<StallMapCompoundDto>();
                while (reader.Read())
                {
                    list.Add(new StallMapCompoundDto
                    {
                        CompoundId   = Convert.ToInt16(reader["CompoundId"]),
                        CompoundName = reader["CompoundName"].ToString()!,
                        LayoutJson   = reader["Layout"] == DBNull.Value ? null : reader["Layout"].ToString()
                    });
                }
                return list;
            }
            catch (NpgsqlException ex) { throw new Exception($"Database error: {ex.Message}"); }
        }

        public void SaveCompoundLayout(int ranchId, short compoundId, string layoutJson)
        {
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure(
                    "usp_SaveCompoundLayout",
                    connection,
                    null
                );

                command.Parameters.AddWithValue("@RanchId", ranchId);
                command.Parameters.AddWithValue("@CompoundId", compoundId);
                command.Parameters.AddWithValue("@Layout", NpgsqlDbType.Jsonb, layoutJson);

                command.ExecuteNonQuery();
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<HorseForMapDto> GetHorsesForCompetition(int competitionId, int ranchId)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", competitionId },
                { "@RanchId", ranchId }
            };

            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = CreateCommandWithStoredProcedure("usp_GetHorsesForCompetition", connection, paramDic);
                using var reader = command.ExecuteReader();

                var list = new List<HorseForMapDto>();

                while (reader.Read())
                {
                    list.Add(new HorseForMapDto
                    {
                        HorseId = Convert.ToInt32(reader["HorseId"]),
                        HorseName = reader["HorseName"].ToString()!,
                        BarnName = reader["BarnName"] == DBNull.Value ? null : reader["BarnName"].ToString()
                    });
                }

                return list;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<StallAssignmentDto> GetAssignments(int competitionId)
        {
            var paramDic = new Dictionary<string, object> { { "@CompetitionId", competitionId } };
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();
                using var command = CreateCommandWithStoredProcedure("usp_GetStallAssignmentsForCompetition", connection, paramDic);
                using var reader = command.ExecuteReader();
                var list = new List<StallAssignmentDto>();
                while (reader.Read())
                {
                    list.Add(new StallAssignmentDto
                    {
                        CompoundId  = Convert.ToInt16(reader["CompoundId"]),
                        StallId     = Convert.ToInt16(reader["StallId"]),
                        StallNumber = reader["StallNumber"] == DBNull.Value ? null : reader["StallNumber"].ToString(),
                        HorseId     = Convert.ToInt32(reader["HorseId"]),
                        HorseName   = reader["HorseName"].ToString()!,
                        BarnName    = reader["BarnName"] == DBNull.Value ? null : reader["BarnName"].ToString()
                    });
                }
                return list;
            }
            catch (NpgsqlException ex) { throw new Exception($"Database error: {ex.Message}"); }
        }

        public void AssignHorse(int competitionId, int ranchId, short compoundId, short stallId, int horseId)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", competitionId },
                { "@RanchId",       ranchId       },
                { "@CompoundId",    compoundId    },
                { "@StallId",       stallId       },
                { "@HorseId",       horseId       }
            };
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();
                using var command = CreateCommandWithStoredProcedure("usp_AssignHorseToStall", connection, paramDic);
                command.ExecuteNonQuery();
            }
            catch (NpgsqlException ex) { throw new Exception($"Database error: {ex.Message}"); }
        }

        public void UnassignHorse(int competitionId, int ranchId, short compoundId, short stallId)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", competitionId },
                { "@RanchId",       ranchId       },
                { "@CompoundId",    compoundId    },
                { "@StallId",       stallId       }
            };
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();
                using var command = CreateCommandWithStoredProcedure("usp_UnassignHorseFromStall", connection, paramDic);
                command.ExecuteNonQuery();
            }
            catch (NpgsqlException ex) { throw new Exception($"Database error: {ex.Message}"); }
        }
    }
}
