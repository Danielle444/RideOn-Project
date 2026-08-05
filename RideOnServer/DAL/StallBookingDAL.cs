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
        // Ranch-model fix (Phase 2, 2026-08-05): command-building split out from
        // execution so it can be unit-tested without a DB connection (same
        // pattern as ChangeEntryRequestDAL.BuildInsertChangeEntryRequestSecuredCommand
        // -- an NpgsqlCommand can be constructed and inspected with a null
        // connection). request.RanchId is expected to already hold the
        // competition's HostRanchId by the time this is called -- the
        // Controller derives and overwrites it server-side before calling
        // CreateStallBooking; this method itself does not re-derive anything.
        // p_requestingranchid (the 11th, DEFAULT NULL, SP parameter) is
        // deliberately left unbound here: for a non-tack booking the SP
        // derives it itself from horse.ranchid, so no client-supplied value
        // is ever passed for it on this path.
        public static NpgsqlCommand BuildCreateStallBookingCommand(
            CreateStallBookingRequest request,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand cmd = new NpgsqlCommand(
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
                connection);

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

            return cmd;
        }

        public static int CreateStallBooking(CreateStallBookingRequest request)
        {
            try
            {
                using NpgsqlConnection conn = DBServices.GetDefaultConnection();
                conn.Open();

                using NpgsqlCommand cmd = BuildCreateStallBookingCommand(request, conn);

                object? result = cmd.ExecuteScalar();

                if (result == null || result == DBNull.Value)
                {
                    throw new Exception("Failed to create stall booking.");
                }

                return Convert.ToInt32(result);
            }
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule/race guard raised inside usp_createstallbooking.
                throw new BL.ValidationException(ex.MessageText);
            }
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

        // Ranch-model fix (Phase 2, 2026-08-05): command-building split out from
        // execution for DB-free testability (same rationale as
        // BuildCreateStallBookingCommand above). Adds the 10th SQL parameter,
        // @requestingRanchId, bound from request.RequestingRanchId -- required
        // by the corrected usp_createtackstallbookings (225), which has no
        // default for it (every call is a tack creation, so it's always
        // mandatory, unlike usp_createstallbooking's optional 11th parameter).
        // request.RanchId is expected to already hold the competition's
        // HostRanchId by the time this is called -- the Controller derives and
        // overwrites it server-side before calling CreateTackStallBookings.
        public static NpgsqlCommand BuildCreateTackStallBookingsCommand(
            CreateTackStallBookingsRequest request,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_createtackstallbookings(" +
                "@competitionId, " +
                "@orderedBySystemUserId, " +
                "@priceCatalogId, " +
                "@notes::text, " +
                "@ranchId, " +
                "@startDate::date, " +
                "@endDate::date, " +
                "@quantity, " +
                "@payers::jsonb, " +
                "@requestingRanchId)",
                connection);

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

            cmd.Parameters.AddWithValue("@requestingRanchId", request.RequestingRanchId);

            return cmd;
        }

        public static List<int> CreateTackStallBookings(CreateTackStallBookingsRequest request)
        {
            try
            {
                using NpgsqlConnection conn = DBServices.GetDefaultConnection();
                conn.Open();

                using NpgsqlCommand cmd = BuildCreateTackStallBookingsCommand(request, conn);

                List<int> createdIds = new List<int>();

                using NpgsqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    createdIds.Add(Convert.ToInt32(reader["createdstallbookingid"]));
                }

                return createdIds;
            }
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule/race guard raised inside usp_createtackstallbookings
                // (which delegates into usp_createstallbooking internally).
                throw new BL.ValidationException(ex.MessageText);
            }
        }

        // Ranch-model fix (Phase 2, 2026-08-05): backs the shavings-creation
        // Controller's requesting-ranch derivation. See
        // 233_usp_GetRequestingRanchIdsForStallBookings.sql's header for why
        // this needed a new proc (no existing GET path returns ranch data for
        // an arbitrary StallBookingId list without already requiring a ranch
        // as input, which is circular for this use case). Command-building is
        // split out for the same DB-free testability reason as the two
        // Build...Command methods above.
        public static NpgsqlCommand BuildGetRequestingRanchIdsForStallBookingsCommand(
            List<int> stallBookingIds,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand cmd = new NpgsqlCommand(
                "SELECT * FROM usp_getrequestingranchidsforstallbookings(@stallBookingIds)",
                connection);

            cmd.Parameters.Add("@stallBookingIds", NpgsqlDbType.Array | NpgsqlDbType.Integer)
                .Value = stallBookingIds.ToArray();

            return cmd;
        }

        // Returns a StallBookingId -> RequestingRanchId map for every supplied
        // id that resolves to an existing, non-tack stall booking. A supplied
        // id absent from the returned dictionary means "not found" (or tack,
        // which never has shavings) -- the caller is responsible for that
        // distinction and for the "exactly one distinct ranch" check; this
        // method is a plain lookup, not an authorization decision.
        public static Dictionary<int, int> GetRequestingRanchIdsForStallBookings(List<int> stallBookingIds)
        {
            Dictionary<int, int> result = new Dictionary<int, int>();

            if (stallBookingIds == null || stallBookingIds.Count == 0)
            {
                return result;
            }

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = BuildGetRequestingRanchIdsForStallBookingsCommand(stallBookingIds, conn);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                result[Convert.ToInt32(reader["stallbookingid"])] = Convert.ToInt32(reader["requestingranchid"]);
            }

            return result;
        }

        public static int CreateStallBookingCancelRequest(
            int stallBookingId,
            int ranchId
        )
        {
            try
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
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule/race guard raised inside usp_createstallbookingcancelrequest.
                throw new BL.ValidationException(ex.MessageText);
            }
        }

        public static int CreateStallBookingChangeRequest(
            CreateStallBookingChangeRequest request,
            int orderedBySystemUserId
        )
        {
            try
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
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule/race guard raised inside usp_createstallbookingchangerequest.
                throw new BL.ValidationException(ex.MessageText);
            }
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

        // Ranch-model fix (Phase 2, 2026-08-05): command-building split out for
        // DB-free testability. Adds p_requestingranchid, bound from the new
        // requestingRanchId parameter -- required by the corrected
        // usp_secretarycreatestallbookingforpayer (149) when p_isfortack is
        // true (no horse to derive it from server-side); left NULL for
        // non-tack, where the SP derives it itself from p_horseid.
        public static NpgsqlCommand BuildSecretaryCreateStallBookingForPayerCommand(
            int competitionId,
            int secretarySystemUserId,
            int payerPersonId,
            int? horseId,
            DateTime startDate,
            DateTime endDate,
            bool isForTack,
            short productId,
            string? notes,
            int? requestingRanchId,
            NpgsqlConnection? connection
        )
        {
            NpgsqlCommand cmd = new NpgsqlCommand(
                @"SELECT public.usp_secretarycreatestallbookingforpayer(
                    p_competitionid         := @competitionId,
                    p_secretarysystemuserid := @secretaryId,
                    p_payerpersonid         := @payerId,
                    p_horseid               := @horseId,
                    p_startdate             := @startDate::date,
                    p_enddate               := @endDate::date,
                    p_isfortack             := @isForTack,
                    p_productid             := @productId,
                    p_notes                 := @notes,
                    p_requestingranchid     := @requestingRanchId
                );",
                connection
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
            cmd.Parameters.AddWithValue("@requestingRanchId", (object?)requestingRanchId ?? DBNull.Value);

            return cmd;
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
            string? notes,
            int? requestingRanchId
        )
        {
            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = BuildSecretaryCreateStallBookingForPayerCommand(
                competitionId, secretarySystemUserId, payerPersonId, horseId,
                startDate, endDate, isForTack, productId, notes, requestingRanchId, conn);

            object? result = cmd.ExecuteScalar();
            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create stall booking");
            }
            return Convert.ToInt32(result);
        }

    }
}