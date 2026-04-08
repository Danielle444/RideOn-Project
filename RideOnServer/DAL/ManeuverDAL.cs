using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class ManeuverDAL : DBServices
    {
        public List<Maneuver> GetAllManeuvers()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    List<Maneuver> list = new List<Maneuver>();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllManeuvers", connection, null))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new Maneuver
                            {
                                ManeuverId = Convert.ToInt16(reader["ManeuverId"]),
                                ManeuverName = reader["ManeuverName"].ToString() ?? string.Empty,
                                ManeuverDescription = reader["ManeuverDescription"] == DBNull.Value
                                    ? string.Empty
                                    : reader["ManeuverDescription"].ToString() ?? string.Empty
                            });
                        }
                    }

                    return list;
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public short InsertManeuver(string maneuverName, string maneuverDescription)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ManeuverName", maneuverName },
                { "@ManeuverDescription", string.IsNullOrWhiteSpace(maneuverDescription) ? DBNull.Value : maneuverDescription }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertManeuver", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt16(result);
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateManeuver(short maneuverId, string maneuverName, string maneuverDescription)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ManeuverId", maneuverId },
                { "@ManeuverName", maneuverName },
                { "@ManeuverDescription", string.IsNullOrWhiteSpace(maneuverDescription) ? DBNull.Value : maneuverDescription }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateManeuver", connection, paramDic))
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

        public void DeleteManeuver(short maneuverId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ManeuverId", maneuverId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteManeuver", connection, paramDic))
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
    }
}