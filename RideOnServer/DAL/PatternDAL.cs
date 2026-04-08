using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class PatternDAL : DBServices
    {
        public List<Pattern> GetAllPatterns()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    List<Pattern> list = new List<Pattern>();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllPatterns", connection, null))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new Pattern
                            {
                                PatternNumber = Convert.ToInt16(reader["PatternNumber"])
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

        public List<PatternWithManeuvers> GetAllPatternsWithManeuvers()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    Dictionary<short, PatternWithManeuvers> map = new Dictionary<short, PatternWithManeuvers>();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllPatternsWithManeuvers", connection, null))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            short patternNumber = Convert.ToInt16(reader["PatternNumber"]);

                            if (!map.ContainsKey(patternNumber))
                            {
                                map[patternNumber] = new PatternWithManeuvers
                                {
                                    PatternNumber = patternNumber,
                                    Maneuvers = new List<PatternManeuver>()
                                };
                            }

                            if (reader["ManeuverId"] != DBNull.Value)
                            {
                                map[patternNumber].Maneuvers.Add(new PatternManeuver
                                {
                                    PatternNumber = patternNumber,
                                    ManeuverId = Convert.ToInt16(reader["ManeuverId"]),
                                    ManeuverOrder = Convert.ToInt16(reader["ManeuverOrder"]),
                                    ManeuverName = reader["ManeuverName"] == DBNull.Value ? null : reader["ManeuverName"].ToString(),
                                    ManeuverDescription = reader["ManeuverDescription"] == DBNull.Value ? null : reader["ManeuverDescription"].ToString()
                                });
                            }
                        }
                    }

                    return map.Values
                        .OrderBy(x => x.PatternNumber)
                        .ToList();
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void InsertPattern(short patternNumber)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PatternNumber", patternNumber }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertPattern", connection, paramDic))
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

        public void UpdatePattern(short oldPatternNumber, short newPatternNumber)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@OldPatternNumber", oldPatternNumber },
                { "@NewPatternNumber", newPatternNumber }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdatePattern", connection, paramDic))
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

        public void DeletePattern(short patternNumber)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PatternNumber", patternNumber }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeletePattern", connection, paramDic))
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