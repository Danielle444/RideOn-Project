using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class PrizeTypeDAL : DBServices
    {
        public List<PrizeType> GetAllPrizeTypes()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllPrizeTypes", connection, null))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<PrizeType> list = new List<PrizeType>();

                        while (reader.Read())
                        {
                            list.Add(new PrizeType
                            {
                                PrizeTypeId = Convert.ToByte(reader["PrizeTypeId"]),
                                PrizeTypeName = reader["PrizeTypeName"].ToString() ?? string.Empty,
                                PrizeDescription = reader["PrizeDescription"] == DBNull.Value
                                    ? string.Empty
                                    : reader["PrizeDescription"].ToString() ?? string.Empty
                            });
                        }

                        return list;
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public int InsertPrizeType(string prizeTypeName, string prizeDescription)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PrizeTypeName", prizeTypeName },
                { "@PrizeDescription", string.IsNullOrWhiteSpace(prizeDescription) ? DBNull.Value : prizeDescription }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertPrizeType", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void UpdatePrizeType(byte prizeTypeId, string prizeTypeName, string prizeDescription)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PrizeTypeId", prizeTypeId },
                { "@PrizeTypeName", prizeTypeName },
                { "@PrizeDescription", string.IsNullOrWhiteSpace(prizeDescription) ? DBNull.Value : prizeDescription }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdatePrizeType", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void DeletePrizeType(byte prizeTypeId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PrizeTypeId", prizeTypeId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeletePrizeType", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception(ex.Message);
            }
        }
    }
}