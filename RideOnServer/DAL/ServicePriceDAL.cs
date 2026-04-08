using Npgsql;
using RideOnServer.BL.DTOs.ServicePrices;

namespace RideOnServer.DAL
{
    public class ServicePriceDAL : DBServices
    {
        public List<ServicePriceRow> GetServicePricingDashboard(int ranchId)
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

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetServicePricingDashboard", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<ServicePriceRow> list = new List<ServicePriceRow>();

                        while (reader.Read())
                        {
                            list.Add(new ServicePriceRow
                            {
                                CategoryId = Convert.ToInt16(reader["CategoryId"]),
                                CategoryName = reader["CategoryName"].ToString() ?? string.Empty,
                                ProductId = Convert.ToInt16(reader["ProductId"]),
                                ProductName = reader["ProductName"].ToString() ?? string.Empty,
                                DurationMinutes = reader["DurationMinutes"] == DBNull.Value
                                    ? null
                                    : Convert.ToInt32(reader["DurationMinutes"]),
                                CatalogItemId = reader["CatalogItemId"] == DBNull.Value
                                    ? null
                                    : Convert.ToInt32(reader["CatalogItemId"]),
                                ItemPrice = reader["ItemPrice"] == DBNull.Value
                                    ? null
                                    : Convert.ToDecimal(reader["ItemPrice"]),
                                CreationDate = reader["CreationDate"] == DBNull.Value
                                    ? null
                                    : Convert.ToDateTime(reader["CreationDate"]),
                                IsActive = reader["IsActive"] != DBNull.Value &&
                                           Convert.ToBoolean(reader["IsActive"])
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

        public int InsertServiceProduct(short categoryId, string productName, int? durationMinutes, int ranchId, decimal itemPrice)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CategoryId", categoryId },
                { "@ProductName", productName },
                { "@DurationMinutes", durationMinutes ?? (object)DBNull.Value },
                { "@RanchId", ranchId },
                { "@InitialPrice", itemPrice }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_InsertServiceProduct", connection, paramDic))
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

        public void UpdateServiceProduct(short productId, string productName, int? durationMinutes, int ranchId, decimal itemPrice)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ProductId", productId },
                { "@ProductName", productName },
                { "@DurationMinutes", durationMinutes ?? (object)DBNull.Value },
                { "@RanchId", ranchId },
                { "@NewPrice", itemPrice }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateServiceProduct", connection, paramDic))
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

        public void DeleteServiceProduct(short productId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ProductId", productId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeleteServiceProduct", connection, paramDic))
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

        public void DeactivateServiceProductPrice(short productId, int ranchId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ProductId", productId },
                { "@RanchId", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_DeactivateServiceProductPrice", connection, paramDic))
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

        public void ActivateServiceProductPrice(short productId, int ranchId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ProductId", productId },
                { "@RanchId", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_ActivateServiceProductPrice", connection, paramDic))
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

        public List<ServicePriceHistoryRow> GetPriceHistoryForProduct(short productId, int ranchId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@ProductId", productId },
        { "@RanchId", ranchId }
    };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetPriceHistoryForProduct", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<ServicePriceHistoryRow> list = new List<ServicePriceHistoryRow>();

                        while (reader.Read())
                        {
                            list.Add(new ServicePriceHistoryRow
                            {
                                CatalogItemId = Convert.ToInt32(reader["CatalogItemId"]),
                                CreationDate = reader["CreationDate"] == DBNull.Value
                                    ? null
                                    : Convert.ToDateTime(reader["CreationDate"]),
                                ItemPrice = reader["ItemPrice"] == DBNull.Value
                                    ? null
                                    : Convert.ToDecimal(reader["ItemPrice"]),
                                IsActive = reader["IsActive"] != DBNull.Value &&
                                           Convert.ToBoolean(reader["IsActive"])
                            });
                        }

                        return list;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public void ActivateSpecificPriceHistoryItem(int catalogItemId, int ranchId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PriceCatalogId", catalogItemId },
                { "@RanchId", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_ActivateSpecificPriceHistoryItem", connection, paramDic))
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