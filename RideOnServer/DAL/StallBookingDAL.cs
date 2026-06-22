using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.StallBookings;
using System.Data;
using System.Text.Json;

namespace RideOnServer.DAL
{
    public static class StallBookingDAL
    {
        public static int CreateStallBooking(CreateStallBookingRequest request)
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT usp_createstallbooking(" +
                "@competitionId, " +
                "@orderedBySystemUserId, " +
                "@priceCatalogId, " +
                "@notes::text, " +               
                "@ranchId, " +
                "@horseId, " +
                "@startDate::date, " +         
                "@endDate::date, " +              
                "@isForTack, " +
                "@payers::jsonb)",
                conn);

            cmd.Parameters.AddWithValue("@competitionId", request.CompetitionId);
            cmd.Parameters.AddWithValue("@orderedBySystemUserId", request.OrderedBySystemUserId);
            cmd.Parameters.AddWithValue("@priceCatalogId", request.PriceCatalogId);

            cmd.Parameters.AddWithValue("@notes", (object?)request.Notes ?? DBNull.Value);

            cmd.Parameters.AddWithValue("@ranchId", request.RanchId);
            cmd.Parameters.AddWithValue("@horseId", request.HorseId);

            cmd.Parameters.Add("@startDate", NpgsqlDbType.Date).Value = request.startDate.Date;
            cmd.Parameters.Add("@endDate", NpgsqlDbType.Date).Value = request.endDate.Date;

            cmd.Parameters.AddWithValue("@isForTack", request.IsForTack);

            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            string payersJson = JsonSerializer.Serialize(request.Payers, jsonOptions);
            cmd.Parameters.Add("@payers", NpgsqlDbType.Jsonb).Value = payersJson;

            object? result = cmd.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create stall booking.");
            }

            return Convert.ToInt32(result);
        }


        public static List<HorseForStallBookingItem> GetHorsesForStallBooking(int competitionId, int ranchId)
        {
            List<HorseForStallBookingItem> horses = new List<HorseForStallBookingItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand("SELECT * FROM usp_gethorsesforstallbooking(@competitionId, @ranchId)", conn);
            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                horses.Add(new HorseForStallBookingItem
                {
                    HorseId = Convert.ToInt32(reader["horseid"]),
                    HorseName = reader["horsename"]?.ToString() ?? string.Empty,
                    BarnName = reader["barnname"] == DBNull.Value ? null : reader["barnname"].ToString(),
                    FederationNumber = reader["federationnumber"] == DBNull.Value ? null : reader["federationnumber"].ToString()
                });
            }

            return horses;
        }

        public static List<HorsePayerOptionItem> GetHorsePayersForCompetition(int competitionId, int ranchId)
        {
            List<HorsePayerOptionItem> payers = new List<HorsePayerOptionItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand("SELECT * FROM usp_gethorsepayersforcompetition(@competitionId, @ranchId)", conn);
            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                payers.Add(new HorsePayerOptionItem
                {
                    HorseId = Convert.ToInt32(reader["horseid"]),
                    PaidByPersonId = Convert.ToInt32(reader["paidbypersonid"]),
                    PayerFullName = reader["payerfullname"]?.ToString() ?? string.Empty,
                    BillId = Convert.ToInt32(reader["billid"])
                });
            }

            return payers;
        }

        public static List<CompetitionStallBookingListItem> GetStallBookingsForCompetitionAndRanch(int competitionId, int ranchId)
        {
            List<CompetitionStallBookingListItem> bookings = new List<CompetitionStallBookingListItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand("SELECT * FROM usp_getstallbookingsforcompetitionandranch(@competitionId, @ranchId)", conn);
            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                bookings.Add(new CompetitionStallBookingListItem
                {
                    StallBookingId = Convert.ToInt32(reader["stallbookingid"]),
                    HorseId = reader["horseid"] == DBNull.Value ? null : Convert.ToInt32(reader["horseid"]),
                    HorseName = reader["horsename"] == DBNull.Value ? null : reader["horsename"].ToString(),
                    IsForTack = Convert.ToBoolean(reader["isfortack"]),
                    startDate = Convert.ToDateTime(reader["startdate"]),
                    endDate = Convert.ToDateTime(reader["enddate"]),
                    CompoundId = reader["compoundid"] == DBNull.Value ? null : Convert.ToInt16(reader["compoundid"]),
                    StallId = reader["stallid"] == DBNull.Value ? null : Convert.ToInt16(reader["stallid"]),
                    PriceCatalogId = Convert.ToInt32(reader["pricecatalogid"]),
                    ItemPrice = Convert.ToDecimal(reader["itemprice"]),
                    Notes = reader["notes"] == DBNull.Value ? null : reader["notes"].ToString(),
                    ApprovalDate = reader["approvaldate"] == DBNull.Value ? null : Convert.ToDateTime(reader["approvaldate"]),
                    IsCancelled = Convert.ToBoolean(reader["iscancelled"]),
                    HasPendingCancellation = reader["haspendingcancellation"] != DBNull.Value && Convert.ToBoolean(reader["haspendingcancellation"]),
                    HasPendingChange = reader["haspendingchange"] != DBNull.Value && Convert.ToBoolean(reader["haspendingchange"]),
                    HasApprovedChange = Convert.ToBoolean(reader["hasapprovedchange"]),
                    TotalAmount = reader["totalamount"] == DBNull.Value ? 0 : Convert.ToDecimal(reader["totalamount"]),
                    IsPaid = reader["ispaid"] != DBNull.Value && Convert.ToBoolean( reader["ispaid"]),
                });
            }

            return bookings;
        }

        public static List<StallBookingPayerItem> GetPayersForStallBooking(int stallBookingId)
        {
            List<StallBookingPayerItem> payers = new List<StallBookingPayerItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand("SELECT * FROM usp_getpayersforstallbooking(@stallBookingId)", conn);
            cmd.Parameters.AddWithValue("@stallBookingId", stallBookingId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                payers.Add(new StallBookingPayerItem
                {
                    StallBookingId = Convert.ToInt32(reader["stallbookingid"]),
                    BillId = Convert.ToInt32(reader["billid"]),
                    payerPersonId = Convert.ToInt32(reader["payerPersonId"]),
                    PayerFullName = reader["payerfullname"]?.ToString() ?? string.Empty,
                    AmountToPay = Convert.ToDecimal(reader["amounttopay"]),
                    DateOpened = Convert.ToDateTime(reader["dateopened"]),
                    DateClosed = reader["dateclosed"] == DBNull.Value ? null : Convert.ToDateTime(reader["dateclosed"])
                });
            }

            return payers;
        }

        public static List<StallBookingPayerItem> GetAllStallBookingPayersForCompetitionAndRanch(
            int competitionId,
            int ranchId
        )
        {
            List<StallBookingPayerItem> payers = new List<StallBookingPayerItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_getallstallbookingpayersforcompetitionandranch(@competitionId, @ranchId)",
                conn
            );

            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();

            while (reader.Read())
            {
                payers.Add(new StallBookingPayerItem
                {
                    StallBookingId = Convert.ToInt32(reader["stallbookingid"]),

                    BillId = Convert.ToInt32(reader["billid"]),

                    payerPersonId = Convert.ToInt32(reader["paidbypersonid"]),

                    PayerFullName = reader["payerfullname"]?.ToString() ?? string.Empty,

                    AmountToPay = Convert.ToDecimal(reader["amounttopay"]),

                    DateOpened = Convert.ToDateTime(reader["dateopened"]),

                    DateClosed = reader["dateclosed"] == DBNull.Value
                        ? null
                        : Convert.ToDateTime(reader["dateclosed"])
                });
            }

            return payers;
        }

        public static List<int> CreateTackStallBookings(CreateTackStallBookingsRequest request)
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_createtackstallbookings(" +
                "@competitionId, " +
                "@orderedBySystemUserId, " +
                "@priceCatalogId, " +
                "@notes::text, " +
                "@ranchId, " +
                "@startDate::date, " +
                "@endDate::date, " +
                "@quantity, " +
                "@payers::jsonb)",
                conn);

            cmd.Parameters.AddWithValue("@competitionId", request.CompetitionId);
            cmd.Parameters.AddWithValue("@orderedBySystemUserId", request.OrderedBySystemUserId);
            cmd.Parameters.AddWithValue("@priceCatalogId", request.PriceCatalogId);
            cmd.Parameters.AddWithValue("@notes", (object?)request.Notes ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@ranchId", request.RanchId);
            cmd.Parameters.Add("@startDate", NpgsqlDbType.Date).Value = request.StartDate.Date;
            cmd.Parameters.Add("@endDate", NpgsqlDbType.Date).Value = request.EndDate.Date;
            cmd.Parameters.AddWithValue("@quantity", request.Quantity);

            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            string payersJson = JsonSerializer.Serialize(request.Payers, jsonOptions);
            cmd.Parameters.Add("@payers", NpgsqlDbType.Jsonb).Value = payersJson;

            List<int> createdIds = new List<int>();

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                createdIds.Add(Convert.ToInt32(reader["createdstallbookingid"]));
            }

            return createdIds;
        }

        public static int CreateStallBookingCancelRequest(
            int stallBookingId,
            int ranchId
        )
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT usp_createstallbookingcancelrequest(@stallBookingId, @ranchId)",
                conn
            );

            cmd.Parameters.AddWithValue("@stallBookingId", stallBookingId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            object? result = cmd.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create stall booking cancellation request.");
            }

            return Convert.ToInt32(result);
        }

        public static int CreateStallBookingChangeRequest(
            CreateStallBookingChangeRequest request,
            int orderedBySystemUserId
        )
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                @"SELECT usp_createstallbookingchangerequest(
                    @originalStallBookingId,
                    @ranchId,
                    @orderedBySystemUserId,
                    @newStartDate::date,
                    @newEndDate::date,
                    @notes::text
                )",
                conn
            );

            cmd.Parameters.AddWithValue(
                "@originalStallBookingId",
                request.OriginalStallBookingId
            );

            cmd.Parameters.AddWithValue(
                "@ranchId",
                request.RanchId
            );

            cmd.Parameters.AddWithValue(
                "@orderedBySystemUserId",
                orderedBySystemUserId
            );

            cmd.Parameters.Add(
                "@newStartDate",
                NpgsqlDbType.Date
            ).Value = request.NewStartDate.Date;

            cmd.Parameters.Add(
                "@newEndDate",
                NpgsqlDbType.Date
            ).Value = request.NewEndDate.Date;

            cmd.Parameters.AddWithValue(
                "@notes",
                (object?)request.Notes ?? DBNull.Value
            );

            object? result = cmd.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create stall booking change request.");
            }

            return Convert.ToInt32(result);
        }

        public static int CancelStallBookingByPayer(int stallBookingId, int payerPersonId)
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                @"SELECT public.usp_cancelstallbookingbypayer(
                    p_stallbookingid := @stallBookingId,
                    p_payerpersonid  := @payerPersonId
                );",
                conn
            );

            cmd.Parameters.AddWithValue("@stallBookingId", stallBookingId);
            cmd.Parameters.AddWithValue("@payerPersonId", payerPersonId);

            object? result = cmd.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create payer stall cancel request");
            }

            return Convert.ToInt32(result);
        }

        public static int CreateStallChangeRequestByPayer(int stallBookingId, int payerPersonId)
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                @"SELECT public.usp_createstallchangerequestbypayer(
                    p_stallbookingid := @stallBookingId,
                    p_payerpersonid  := @payerPersonId
                );",
                conn
            );

            cmd.Parameters.AddWithValue("@stallBookingId", stallBookingId);
            cmd.Parameters.AddWithValue("@payerPersonId", payerPersonId);

            object? result = cmd.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create payer stall change request");
            }

            return Convert.ToInt32(result);
        }

        public static int SecretaryDeleteStallBooking(int stallBookingId, int secretarySystemUserId)
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                @"SELECT public.usp_secretarydeletestallbooking(
                    p_stallbookingid        := @stallBookingId,
                    p_secretarysystemuserid := @secretaryId
                );",
                conn
            );

            cmd.Parameters.AddWithValue("@stallBookingId", stallBookingId);
            cmd.Parameters.AddWithValue("@secretaryId", secretarySystemUserId);

            object? result = cmd.ExecuteScalar();
            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to delete stall booking");
            }
            return Convert.ToInt32(result);
        }

        public static void SecretaryUpdateStallBooking(
            int stallBookingId,
            int secretarySystemUserId,
            DateTime newStartDate,
            DateTime newEndDate,
            string? newNotes,
            bool? isForTack,
            int? horseId
        )
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                @"SELECT public.usp_secretaryupdatestallbooking(
                    p_stallbookingid        := @stallBookingId,
                    p_secretarysystemuserid := @secretaryId,
                    p_newstartdate          := @newStartDate::date,
                    p_newenddate            := @newEndDate::date,
                    p_newnotes              := @newNotes,
                    p_isfortack             := @isForTack,
                    p_horseid               := @horseId
                );",
                conn
            );

            cmd.Parameters.AddWithValue("@stallBookingId", stallBookingId);
            cmd.Parameters.AddWithValue("@secretaryId", secretarySystemUserId);
            cmd.Parameters.Add("@newStartDate", NpgsqlDbType.Date).Value = newStartDate.Date;
            cmd.Parameters.Add("@newEndDate", NpgsqlDbType.Date).Value = newEndDate.Date;
            cmd.Parameters.AddWithValue("@newNotes", (object?)newNotes ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@isForTack", (object?)isForTack ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@horseId", (object?)horseId ?? DBNull.Value);

            cmd.ExecuteNonQuery();
        }

        public static int SecretaryCreateStallBookingForPayer(
            int competitionId,
            int secretarySystemUserId,
            int payerPersonId,
            int? horseId,
            DateTime startDate,
            DateTime endDate,
            bool isForTack,
            short productId,
            string? notes
        )
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand(
                @"SELECT public.usp_secretarycreatestallbookingforpayer(
                    p_competitionid         := @competitionId,
                    p_secretarysystemuserid := @secretaryId,
                    p_payerpersonid         := @payerId,
                    p_horseid               := @horseId,
                    p_startdate             := @startDate::date,
                    p_enddate               := @endDate::date,
                    p_isfortack             := @isForTack,
                    p_productid             := @productId,
                    p_notes                 := @notes
                );",
                conn
            );

            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@secretaryId", secretarySystemUserId);
            cmd.Parameters.AddWithValue("@payerId", payerPersonId);
            cmd.Parameters.AddWithValue("@horseId", (object?)horseId ?? DBNull.Value);
            cmd.Parameters.Add("@startDate", NpgsqlDbType.Date).Value = startDate.Date;
            cmd.Parameters.Add("@endDate", NpgsqlDbType.Date).Value = endDate.Date;
            cmd.Parameters.AddWithValue("@isForTack", isForTack);
            cmd.Parameters.Add("@productId", NpgsqlDbType.Smallint).Value = productId;
            cmd.Parameters.AddWithValue("@notes", (object?)notes ?? DBNull.Value);

            object? result = cmd.ExecuteScalar();
            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create stall booking");
            }
            return Convert.ToInt32(result);
        }

    }
}