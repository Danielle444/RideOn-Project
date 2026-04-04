using Microsoft.Data.SqlClient;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class FineDAL : DBServices
    {
        public List<Fine> GetAllFines()
        {
            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllFines", connection, null))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<Fine> list = new List<Fine>();

                        while (reader.Read())
                        {
                            list.Add(new Fine
                            {
                                FineId = Convert.ToInt32(reader["FineId"]),
                                FineName = reader["FineName"].ToString() ?? string.Empty,
                                FineDescription = reader["FineDescription"] == DBNull.Value
                                    ? string.Empty
                                    : reader["FineDescription"].ToString() ?? string.Empty,
                                FineAmount = Convert.ToDecimal(reader["FineAmount"])
                            });
                        }

                        return list;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public int InsertFine(string fineName, string fineDescription, decimal fineAmount)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FineName", fineName },
                { "@FineDescription", string.IsNullOrWhiteSpace(fineDescription) ? DBNull.Value : fineDescription },
                { "@FineAmount", fineAmount }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_InsertFine", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void UpdateFine(int fineId, string fineName, string fineDescription, decimal fineAmount)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FineId", fineId },
                { "@FineName", fineName },
                { "@FineDescription", string.IsNullOrWhiteSpace(fineDescription) ? DBNull.Value : fineDescription },
                { "@FineAmount", fineAmount }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateFine", connection, paramDic))
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

        public void DeleteFine(int fineId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@FineId", fineId }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteFine", connection, paramDic))
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