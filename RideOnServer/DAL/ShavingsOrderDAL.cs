using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.ShavingsOrders;
using System.Text.Json;

namespace RideOnServer.DAL
{
    public class ShavingsOrderDAL : DBServices
    {
        public List<WorkerShavingsOrderItem> GetWorkerShavingsOrders(int workerSystemUserId)
        {
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@WorkerSystemUserId", workerSystemUserId }
            };

            try
            {
                using NpgsqlConnection connection = DBServices.GetDefaultConnection();
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
                            DeliveryStatus = reader["DeliveryStatus"]?.ToString() ?? string.Empty,
                            DeliveryPhotoUrl = reader["DeliveryPhotoUrl"] as string,
                            DeliveryPhotoDate = reader["DeliveryPhotoDate"] as DateTime?,
                            PayerFirstName = reader["PayerFirstName"]?.ToString() ?? string.Empty,
                            PayerLastName = reader["PayerLastName"]?.ToString() ?? string.Empty,
                            StallNumber = reader["StallNumber"] as string,
                            RanchName = reader["RanchName"] as string,
                            CompetitionName = reader["CompetitionName"] as string,
                        });
                    }

                    return list;
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
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@ShavingsOrderId", shavingsOrderId },
                { "@DeliveryPhotoUrl", photoUrl },
                { "@DeliveryPhotoDate", photoDate }
            };

            try
            {
                using NpgsqlConnection connection = DBServices.GetDefaultConnection();
                connection.Open();

                using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                    "usp_SaveDeliveryPhoto",
                    connection,
                    paramDic))
                {
                    command.ExecuteNonQuery();
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
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@RanchId", ranchId }
            };

            try
            {
                using NpgsqlConnection connection = DBServices.GetDefaultConnection();
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
                            PayerFirstName = reader["PayerFirstName"]?.ToString() ?? string.Empty,
                            PayerLastName = reader["PayerLastName"]?.ToString() ?? string.Empty,
                            StallNumber = reader["StallNumber"] as string,
                            WorkerFirstName = reader["WorkerFirstName"]?.ToString() ?? string.Empty,
                            WorkerLastName = reader["WorkerLastName"]?.ToString() ?? string.Empty,
                        });
                    }

                    return list;
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
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@ShavingsOrderId", shavingsOrderId },
                { "@ApprovedByPersonId", approvedByPersonId },
                { "@ApprovedAt", approvedAt }
            };

            try
            {
                using NpgsqlConnection connection = DBServices.GetDefaultConnection();
                connection.Open();

                using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                    "usp_ApproveDelivery",
                    connection,
                    paramDic))
                {
                    command.ExecuteNonQuery();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApproveDelivery: {ex.Message}");
                throw;
            }
        }

        public static List<WorkerShavingsOrderItem> GetShavingsOrdersByCompetitionForWorker(int competitionId, int ranchId)
        {
            List<WorkerShavingsOrderItem> orders = new List<WorkerShavingsOrderItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_getshavingsordersforworkerbycompetition(@competitionId, @ranchId)",
                conn
            );

            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                orders.Add(new WorkerShavingsOrderItem
                {
                    ShavingsOrderId = Convert.ToInt32(reader["ShavingsOrderId"]),
                    BagQuantity = Convert.ToInt32(reader["BagQuantity"]),
                    Notes = reader["Notes"] as string,
                    RequestedDeliveryTime = reader["RequestedDeliveryTime"] as DateTime?,
                    ArrivalTime = reader["ArrivalTime"] as DateTime?,
                    DeliveryStatus = reader["DeliveryStatus"]?.ToString() ?? string.Empty,
                    DeliveryPhotoUrl = reader["DeliveryPhotoUrl"] as string,
                    DeliveryPhotoDate = reader["DeliveryPhotoDate"] as DateTime?,
                    PayerFirstName = reader["PayerFirstName"]?.ToString() ?? string.Empty,
                    PayerLastName = reader["PayerLastName"]?.ToString() ?? string.Empty,
                    StallNumber = reader["StallNumber"] as string,
                    WorkerSystemUserId = reader["WorkerSystemUserId"] == DBNull.Value ? null : Convert.ToInt32(reader["WorkerSystemUserId"]),
                    WorkerFirstName = reader["WorkerFirstName"] as string,
                    WorkerLastName = reader["WorkerLastName"] as string,
                });
            }

            return orders;
        }

        public static bool ClaimShavingsOrder(int shavingsOrderId, int workerSystemUserId)
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT usp_claimshavingsorder(@shavingsOrderId, @workerSystemUserId)",
                conn
            );

            cmd.Parameters.AddWithValue("@shavingsOrderId", shavingsOrderId);
            cmd.Parameters.AddWithValue("@workerSystemUserId", workerSystemUserId);

            object? result = cmd.ExecuteScalar();
            int rowsAffected = result == null || result == DBNull.Value ? 0 : Convert.ToInt32(result);
            return rowsAffected > 0;
        }

        public static int CreateShavingsOrder(CreateShavingsOrderRequest request)
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                @"SELECT usp_createshavingsorder(
                    @competitionId,
                    @orderedBySystemUserId,
                    @priceCatalogId,
                    @ranchId,
                    @notes,
                    @requestedDeliveryTime,
                    @stalls::jsonb
                )",
                conn
            );

            cmd.Parameters.AddWithValue("@competitionId", request.CompetitionId);
            cmd.Parameters.AddWithValue("@orderedBySystemUserId", request.OrderedBySystemUserId);
            cmd.Parameters.AddWithValue("@priceCatalogId", request.PriceCatalogId);
            cmd.Parameters.AddWithValue("@ranchId", request.RanchId);
            cmd.Parameters.AddWithValue("@notes", (object?)request.Notes ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@requestedDeliveryTime", NpgsqlDbType.Timestamp, request.RequestedDeliveryTime);

            string stallsJson = JsonSerializer.Serialize(request.Stalls);
            cmd.Parameters.AddWithValue("@stalls", NpgsqlDbType.Jsonb, stallsJson);

            object? result = cmd.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create shavings order.");
            }

            return Convert.ToInt32(result);
        }

        public static List<ShavingsAvailableStallItem> GetStallBookingsForShavings(int competitionId, int ranchId)
        {
            List<ShavingsAvailableStallItem> stalls = new List<ShavingsAvailableStallItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_getstallbookingsforshavings(@competitionId, @ranchId)",
                conn
            );

            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                stalls.Add(new ShavingsAvailableStallItem
                {
                    StallBookingId = Convert.ToInt32(reader["stallbookingid"]),
                    HorseId = reader["horseid"] == DBNull.Value ? null : Convert.ToInt32(reader["horseid"]),
                    HorseName = reader["horsename"] == DBNull.Value ? null : reader["horsename"].ToString(),
                    startDate = Convert.ToDateTime(reader["startdate"]),
                    endDate = Convert.ToDateTime(reader["enddate"]),
                    CompoundId = reader["compoundid"] == DBNull.Value ? null : Convert.ToInt16(reader["compoundid"]),
                    StallId = reader["stallid"] == DBNull.Value ? null : Convert.ToInt16(reader["stallid"]),
                    PayerNames = reader["payernames"] == DBNull.Value ? "" : reader["payernames"].ToString()
                });
            }

            return stalls;
        }

        public static List<CompetitionShavingsOrderListItem> GetShavingsOrdersForCompetitionAndRanch(int competitionId, int ranchId)
        {
            List<CompetitionShavingsOrderListItem> orders = new List<CompetitionShavingsOrderListItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_getshavingsordersforcompetitionandranch(@competitionId, @ranchId)",
                conn
            );

            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                orders.Add(new CompetitionShavingsOrderListItem
                {
                    ShavingsOrderId = Convert.ToInt32(reader["shavingsorderid"]),
                    RequestedDeliveryTime = reader["requesteddeliverytime"] == DBNull.Value ? null : Convert.ToDateTime(reader["requesteddeliverytime"]),
                    BagQuantity = reader["bagquantity"] == DBNull.Value ? null : Convert.ToInt16(reader["bagquantity"]),
                    DeliveryStatus = reader["deliverystatus"]?.ToString() ?? string.Empty,
                    Notes = reader["notes"] == DBNull.Value ? null : reader["notes"].ToString(),
                    WorkerSystemUserId = reader["workersystemuserid"] == DBNull.Value ? null : Convert.ToInt32(reader["workersystemuserid"]),
                    ApprovedByPersonId = reader["approvedbypersonid"] == DBNull.Value ? null : Convert.ToInt32(reader["approvedbypersonid"]),
                    ApprovedAt = reader["approvedat"] == DBNull.Value ? null : Convert.ToDateTime(reader["approvedat"])
                });
            }

            return orders;
        }

        public static List<ShavingsOrderDetailsItem> GetShavingsOrderDetails(int shavingsOrderId)
        {
            List<ShavingsOrderDetailsItem> details = new List<ShavingsOrderDetailsItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_getshavingsorderdetails(@shavingsOrderId)",
                conn
            );

            cmd.Parameters.AddWithValue("@shavingsOrderId", shavingsOrderId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                details.Add(new ShavingsOrderDetailsItem
                {
                    StallBookingId = Convert.ToInt32(reader["stallbookingid"]),
                    HorseId = reader["horseid"] == DBNull.Value ? null : Convert.ToInt32(reader["horseid"]),
                    HorseName = reader["horsename"] == DBNull.Value ? null : reader["horsename"].ToString(),
                    BagQuantityPerStall = Convert.ToInt16(reader["bagquantityperstall"])
                });
            }

            return details;
        }

        public static List<ShavingsOrderPayerItem> GetPayersForShavingsOrder(int shavingsOrderId)
        {
            List<ShavingsOrderPayerItem> payers = new List<ShavingsOrderPayerItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_getpayersforshavingsorder(@shavingsOrderId)",
                conn
            );

            cmd.Parameters.AddWithValue("@shavingsOrderId", shavingsOrderId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                payers.Add(new ShavingsOrderPayerItem
                {
                    ShavingsOrderId = Convert.ToInt32(reader["shavingsorderid"]),
                    BillId = Convert.ToInt32(reader["billid"]),
                    PaidByPersonId = Convert.ToInt32(reader["paidbypersonid"]),
                    PayerFullName = reader["payerfullname"]?.ToString() ?? string.Empty,
                    AmountToPay = Convert.ToDecimal(reader["amounttopay"]),
                    DateOpened = Convert.ToDateTime(reader["dateopened"]),
                    DateClosed = reader["dateclosed"] == DBNull.Value ? null : Convert.ToDateTime(reader["dateclosed"])
                });
            }

            return payers;
        }

        public static List<ShavingsOrderPayerItem> GetAllShavingsOrderPayersForCompetitionAndRanch(int competitionId, int ranchId)
        {
            List<ShavingsOrderPayerItem> payers = new List<ShavingsOrderPayerItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_getallshavingsorderpayersforcompetitionandranch(@competitionId, @ranchId)",
                conn
            );

            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                payers.Add(new ShavingsOrderPayerItem
                {
                    ShavingsOrderId = Convert.ToInt32(reader["shavingsorderid"]),
                    BillId = Convert.ToInt32(reader["billid"]),
                    PaidByPersonId = Convert.ToInt32(reader["paidbypersonid"]),
                    PayerFullName = reader["payerfullname"]?.ToString() ?? string.Empty,
                    AmountToPay = Convert.ToDecimal(reader["amounttopay"]),
                    DateOpened = Convert.ToDateTime(reader["dateopened"]),
                    DateClosed = reader["dateclosed"] == DBNull.Value ? null : Convert.ToDateTime(reader["dateclosed"])
                });
            }

            return payers;
        }
    }
}