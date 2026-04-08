using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class PatternManeuverDAL : DBServices
    {
        public List<PatternManeuver> GetPatternManeuvers(short patternNumber)
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

                    List<PatternManeuver> list = new List<PatternManeuver>();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetPatternManeuvers", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new PatternManeuver
                            {
                                PatternNumber = Convert.ToInt16(reader["PatternNumber"]),
                                ManeuverId = Convert.ToInt16(reader["ManeuverId"]),
                                ManeuverOrder = Convert.ToInt16(reader["ManeuverOrder"]),
                                ManeuverName = reader["ManeuverName"] == DBNull.Value ? null : reader["ManeuverName"].ToString(),
                                ManeuverDescription = reader["ManeuverDescription"] == DBNull.Value ? null : reader["ManeuverDescription"].ToString()
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

        public void ReplacePatternManeuvers(short patternNumber, List<PatternManeuver> maneuvers)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlTransaction transaction = connection.BeginTransaction())
                    {
                        try
                        {
                            Dictionary<string, object> deleteParams = new Dictionary<string, object>
                            {
                                { "@PatternNumber", patternNumber }
                            };

                            using (NpgsqlCommand deleteCommand = CreateCommandWithStoredProcedure("usp_DeletePatternManeuvers", connection, deleteParams))
                            {
                                deleteCommand.Transaction = transaction;
                                deleteCommand.ExecuteNonQuery();
                            }

                            foreach (PatternManeuver item in maneuvers.OrderBy(x => x.ManeuverOrder))
                            {
                                Dictionary<string, object> insertParams = new Dictionary<string, object>
                                {
                                    { "@PatternNumber", patternNumber },
                                    { "@ManeuverId", item.ManeuverId },
                                    { "@ManeuverOrder", item.ManeuverOrder }
                                };

                                using (NpgsqlCommand insertCommand = CreateCommandWithStoredProcedure("usp_InsertPatternManeuver", connection, insertParams))
                                {
                                    insertCommand.Transaction = transaction;
                                    insertCommand.ExecuteNonQuery();
                                }
                            }

                            transaction.Commit();
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
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