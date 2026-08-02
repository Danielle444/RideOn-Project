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

        // No-photo delivery fallback (CAP-4). Mirrors ClaimShavingsOrder: the SP returns
        // rows-affected, so >0 means "recorded", 0 means "no open order matched".
        public static bool MarkDelivered(int shavingsOrderId)
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@shavingsOrderId", shavingsOrderId }
            };

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_markdelivered",
                conn,
                paramDic);

            object? result = cmd.ExecuteScalar();
            int rowsAffected = result == null || result == DBNull.Value ? 0 : Convert.ToInt32(result);
            return rowsAffected > 0;
        }

        public static List<WorkerShavingsOrderItem> GetShavingsOrdersByCompetitionForWorker(int competitionId, int ranchId)
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            // Positional-dict binding: entry order (competitionId, ranchId) matches
            // usp_getshavingsordersforworkerbycompetition(p_competitionid, p_ranchid).
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@competitionId", competitionId },
                { "@ranchId", ranchId }
            };

            List<WorkerShavingsOrderItem> orders = new List<WorkerShavingsOrderItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_getshavingsordersforworkerbycompetition",
                conn,
                paramDic);

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

        public static List<WorkerShavingsOrderItem> GetWorkerHomeShavingsFeed(int workerSystemUserId, int ranchId)
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            // Positional-dict binding: entry order (workerSystemUserId, ranchId) matches
            // usp_getworkerhomeshavingsfeed(p_workersystemuserid, p_ranchid).
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@workerSystemUserId", workerSystemUserId },
                { "@ranchId", ranchId }
            };

            List<WorkerShavingsOrderItem> orders = new List<WorkerShavingsOrderItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_getworkerhomeshavingsfeed",
                conn,
                paramDic);

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
                    CompetitionId = reader["CompetitionId"] == DBNull.Value ? null : Convert.ToInt32(reader["CompetitionId"]),
                    CompetitionName = reader["CompetitionName"] as string,
                    WorkerSystemUserId = reader["WorkerSystemUserId"] == DBNull.Value ? null : Convert.ToInt32(reader["WorkerSystemUserId"]),
                    WorkerFirstName = reader["WorkerFirstName"] as string,
                    WorkerLastName = reader["WorkerLastName"] as string,
                });
            }

            return orders;
        }

        public static bool ClaimShavingsOrder(int shavingsOrderId, int workerSystemUserId)
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            // Positional-dict binding: (shavingsOrderId, workerSystemUserId) matches
            // usp_claimshavingsorder(p_shavingsorderid, p_workersystemuserid).
            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@shavingsOrderId", shavingsOrderId },
                { "@workerSystemUserId", workerSystemUserId }
            };

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_claimshavingsorder",
                conn,
                paramDic);

            object? result = cmd.ExecuteScalar();
            int rowsAffected = result == null || result == DBNull.Value ? 0 : Convert.ToInt32(result);
            return rowsAffected > 0;
        }

        // DOCUMENTED EXCEPTION to the CreateCommandWithStoredProcedure convention (CAP-10):
        // this call passes a typed jsonb (@stalls) and a typed Timestamp (@requestedDeliveryTime).
        // @stalls is not a real column name, so AddParameterWithType cannot resolve jsonb by the
        // column-name convention — it is left on the raw NpgsqlCommand to keep the explicit typing.
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
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@competitionId", competitionId },
                { "@ranchId", ranchId }
            };

            List<ShavingsAvailableStallItem> stalls = new List<ShavingsAvailableStallItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_getstallbookingsforshavings",
                conn,
                paramDic);

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

        public static List<CompetitionShavingsOrderListItem> GetShavingsOrdersForCompetitionAndRanch(
            int competitionId,
            int ranchId
        )
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@competitionId", competitionId },
                { "@ranchId", ranchId }
            };

            List<CompetitionShavingsOrderListItem> orders =
                new List<CompetitionShavingsOrderListItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_getshavingsordersforcompetitionandranch",
                conn,
                paramDic);

            using NpgsqlDataReader reader = cmd.ExecuteReader();

            while (reader.Read())
            {
                orders.Add(new CompetitionShavingsOrderListItem
                {
                    ShavingsOrderId = Convert.ToInt32(reader["shavingsorderid"]),

                    RequestedDeliveryTime =
                        reader["requesteddeliverytime"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["requesteddeliverytime"]),

                    BagQuantity =
                        reader["bagquantity"] == DBNull.Value
                            ? null
                            : Convert.ToInt16(reader["bagquantity"]),

                    DeliveryStatus =
                        reader["deliverystatus"]?.ToString() ?? string.Empty,

                    Notes =
                        reader["notes"] == DBNull.Value
                            ? null
                            : reader["notes"].ToString(),

                    WorkerSystemUserId =
                        reader["workersystemuserid"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["workersystemuserid"]),

                    // Lifecycle fields (approval retired) — Seen=responsetime, Delivered=arrivaltime,
                    // PrequestDatetime=order creation clock. Ships with M4 (DROP+CREATE of the SP).
                    Seen =
                        reader["seen"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["seen"]),

                    Delivered =
                        reader["delivered"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["delivered"]),

                    PrequestDatetime =
                        reader["prequestdatetime"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["prequestdatetime"]),

                    OrderedByName =
                        reader["orderedbyname"] == DBNull.Value
                            ? null
                            : reader["orderedbyname"].ToString(),

                    PriceCatalogId =
                        reader["pricecatalogid"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["pricecatalogid"]),

                    ItemPrice =
                        reader["itemprice"] == DBNull.Value
                            ? 0
                            : Convert.ToDecimal(reader["itemprice"]),

                    TotalAmount =
                        reader["totalamount"] == DBNull.Value
                            ? 0
                            : Convert.ToDecimal(reader["totalamount"]),

                    // DEP-1 (Spec 2): appended LAST to #176. Read by name so it is safe even if an
                    // older proc without the column were ever hit (name lookup, not ordinal).
                    DeliveryPhotoUrl =
                        reader["deliveryphotourl"] == DBNull.Value
                            ? null
                            : reader["deliveryphotourl"].ToString()
                });
            }

            return orders;
        }

        public static List<ShavingsOrderDetailsItem> GetShavingsOrderDetails(int shavingsOrderId)
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@shavingsOrderId", shavingsOrderId }
            };

            List<ShavingsOrderDetailsItem> details = new List<ShavingsOrderDetailsItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_getshavingsorderdetails",
                conn,
                paramDic);

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
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@shavingsOrderId", shavingsOrderId }
            };

            List<ShavingsOrderPayerItem> payers = new List<ShavingsOrderPayerItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_getpayersforshavingsorder",
                conn,
                paramDic);

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
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@competitionId", competitionId },
                { "@ranchId", ranchId }
            };

            List<ShavingsOrderPayerItem> payers = new List<ShavingsOrderPayerItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_getallshavingsorderpayersforcompetitionandranch",
                conn,
                paramDic);

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

        public static List<CompetitionShavingsOrderDetailsItem> GetAllShavingsOrderDetailsForCompetitionAndRanch(
            int competitionId,
            int ranchId
        )
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();

            Dictionary<string, object?> paramDic = new Dictionary<string, object?>
            {
                { "@competitionId", competitionId },
                { "@ranchId", ranchId }
            };

            List<CompetitionShavingsOrderDetailsItem> details =
                new List<CompetitionShavingsOrderDetailsItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = dal.CreateCommandWithStoredProcedure(
                "usp_getallshavingsorderdetailsforcompetitionandranch",
                conn,
                paramDic);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                details.Add(new CompetitionShavingsOrderDetailsItem
                {
                    ShavingsOrderId = Convert.ToInt32(reader["shavingsorderid"]),
                    StallBookingId = Convert.ToInt32(reader["stallbookingid"]),
                    HorseId = reader["horseid"] == DBNull.Value ? null : Convert.ToInt32(reader["horseid"]),
                    HorseName = reader["horsename"] == DBNull.Value ? null : reader["horsename"].ToString(),
                    BagQuantityPerStall = Convert.ToInt16(reader["bagquantityperstall"])
                });
            }

            return details;
        }
    }
}
