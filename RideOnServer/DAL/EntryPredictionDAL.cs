using Npgsql;
using RideOnServer.BL.DTOs.Prediction;

namespace RideOnServer.DAL
{
    public class EntryPredictionDAL : DBServices
    {
        public EntryPredictionFeatureInputs? GetFeatureInputs(int classInCompId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassInCompId", classInCompId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetEntryPredictionFeatureInputs", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (!reader.Read())
                        {
                            return null;
                        }

                        return new EntryPredictionFeatureInputs
                        {
                            ClassInCompId = Convert.ToInt32(reader["ClassInCompId"]),
                            CompetitionId = Convert.ToInt32(reader["CompetitionId"]),
                            ClassDateTime = Convert.ToDateTime(reader["ClassDateTime"]),
                            OrderInDay = reader["OrderInDay"] == DBNull.Value ? null : Convert.ToInt16(reader["OrderInDay"]),
                            TotalCost = Convert.ToDecimal(reader["TotalCost"]),
                            ClassTypeId = Convert.ToInt16(reader["ClassTypeId"]),
                            ClassName = reader["ClassName"] == DBNull.Value ? string.Empty : reader["ClassName"].ToString() ?? string.Empty,
                            FieldId = Convert.ToInt16(reader["FieldId"]),
                            FieldName = reader["FieldName"] == DBNull.Value ? string.Empty : reader["FieldName"].ToString() ?? string.Empty,
                            ClassesPerCompetition = Convert.ToInt32(reader["ClassesPerCompetition"]),
                            FieldAvgPastEntries = reader["FieldAvgPastEntries"] == DBNull.Value ? null : Convert.ToDecimal(reader["FieldAvgPastEntries"]),
                            ClassNameAvgPastEntries = reader["ClassNameAvgPastEntries"] == DBNull.Value ? null : Convert.ToDecimal(reader["ClassNameAvgPastEntries"]),
                            PrizeShovarAmount = Convert.ToDecimal(reader["PrizeShovarAmount"]),
                            PrizeJackpotPostedAmount = Convert.ToDecimal(reader["PrizeJackpotPostedAmount"]),
                            PrizeAddedMoneyAmount = Convert.ToDecimal(reader["PrizeAddedMoneyAmount"])
                        };
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public ActiveModelParameters GetActiveModelParameters()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    ActiveModelParameters result = new ActiveModelParameters();
                    bool headerSet = false;

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetActiveModelParameters", connection, null))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            if (!headerSet)
                            {
                                result.ModelVersionId = Convert.ToInt32(reader["ModelVersionId"]);
                                result.Intercept = Convert.ToDouble(reader["Intercept"]);
                                result.Rmse = Convert.ToDouble(reader["Rmse"]);
                                headerSet = true;
                            }

                            result.Parameters.Add(new ModelParameterRow
                            {
                                FeatureName = reader["FeatureName"] == DBNull.Value ? string.Empty : reader["FeatureName"].ToString() ?? string.Empty,
                                FeatureOrder = Convert.ToInt32(reader["FeatureOrder"]),
                                Coefficient = Convert.ToDouble(reader["Coefficient"]),
                                ScalerMean = Convert.ToDouble(reader["ScalerMean"]),
                                ScalerScale = Convert.ToDouble(reader["ScalerScale"])
                            });
                        }
                    }

                    return result;
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpsertEntryPrediction(int classIncompId, decimal predictedEntries, int modelVersionId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ClassIncompId", classIncompId },
                { "@PredictedEntries", predictedEntries },
                { "@ModelVersionId", modelVersionId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpsertEntryPrediction", connection, paramDic))
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
