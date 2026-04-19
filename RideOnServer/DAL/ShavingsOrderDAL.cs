using Npgsql;
using RideOnServer.BL.DTOs.ShavingsOrders;

namespace RideOnServer.DAL
{
    public class ShavingsOrderDAL : DBServices
    {
        public List<WorkerShavingsOrderItem> GetWorkerShavingsOrders(int workerSystemUserId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@WorkerSystemUserId", workerSystemUserId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetWorkerShavingsOrders",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<WorkerShavingsOrderItem> list = new List<WorkerShavingsOrderItem>();

                        while (reader.Read())
                        {
                            list.Add(new WorkerShavingsOrderItem
                            {
                                ShavingsOrderId = Convert.ToInt32(reader["ShavingsOrderId"]),
                                BagQuantity = Convert.ToInt32(reader["BagQuantity"]),
                                Notes = reader["Notes"] as string,
                                RequestedDeliveryTime = reader["RequestedDeliveryTime"] as DateTime?,
                                ArrivalTime = reader["ArrivalTime"] as DateTime?,
                                DeliveryStatus = reader["DeliveryStatus"].ToString() ?? string.Empty,
                                DeliveryPhotoUrl = reader["DeliveryPhotoUrl"] as string,
                                DeliveryPhotoDate = reader["DeliveryPhotoDate"] as DateTime?,
                                PayerFirstName = reader["PayerFirstName"].ToString() ?? string.Empty,
                                PayerLastName = reader["PayerLastName"].ToString() ?? string.Empty,
                                StallName = reader["StallName"] as string,
                                RanchName = reader["RanchName"] as string,
                                CompetitionName = reader["CompetitionName"] as string,
                            });
                        }

                        return list;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetWorkerShavingsOrders: {ex.Message}");
                throw;
            }
        }

        public void SaveDeliveryPhoto(int shavingsOrderId, string photoUrl, DateTime photoDate)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ShavingsOrderId", shavingsOrderId },
                { "@DeliveryPhotoUrl", photoUrl },
                { "@DeliveryPhotoDate", photoDate }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_SaveDeliveryPhoto",
                        connection,
                        paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SaveDeliveryPhoto: {ex.Message}");
                throw;
            }
        }

        public List<PendingDeliveryApprovalItem> GetPendingDeliveryApprovals(int ranchId)
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

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetPendingDeliveryApprovals",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<PendingDeliveryApprovalItem> list = new List<PendingDeliveryApprovalItem>();

                        while (reader.Read())
                        {
                            list.Add(new PendingDeliveryApprovalItem
                            {
                                ShavingsOrderId = Convert.ToInt32(reader["ShavingsOrderId"]),
                                BagQuantity = Convert.ToInt32(reader["BagQuantity"]),
                                Notes = reader["Notes"] as string,
                                DeliveryPhotoUrl = reader["DeliveryPhotoUrl"] as string,
                                DeliveryPhotoDate = reader["DeliveryPhotoDate"] as DateTime?,
                                PayerFirstName = reader["PayerFirstName"].ToString() ?? string.Empty,
                                PayerLastName = reader["PayerLastName"].ToString() ?? string.Empty,
                                StallName = reader["StallName"] as string,
                                WorkerFirstName = reader["WorkerFirstName"].ToString() ?? string.Empty,
                                WorkerLastName = reader["WorkerLastName"].ToString() ?? string.Empty,
                            });
                        }

                        return list;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPendingDeliveryApprovals: {ex.Message}");
                throw;
            }
        }

        public void ApproveDelivery(int shavingsOrderId, int approvedByPersonId, DateTime approvedAt)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@ShavingsOrderId", shavingsOrderId },
                { "@ApprovedByPersonId", approvedByPersonId },
                { "@ApprovedAt", approvedAt }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_ApproveDelivery",
                        connection,
                        paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApproveDelivery: {ex.Message}");
                throw;
            }
        }
    }
}
