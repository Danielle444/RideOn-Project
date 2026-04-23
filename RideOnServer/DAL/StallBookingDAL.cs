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
                "@catalogItemId, " +
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
            cmd.Parameters.AddWithValue("@catalogItemId", request.CatalogItemId);

            cmd.Parameters.AddWithValue("@notes", (object?)request.Notes ?? DBNull.Value);

            cmd.Parameters.AddWithValue("@ranchId", request.RanchId);
            cmd.Parameters.AddWithValue("@horseId", request.HorseId);

            cmd.Parameters.Add("@startDate", NpgsqlDbType.Date).Value = request.CheckInDate.Date;
            cmd.Parameters.Add("@endDate", NpgsqlDbType.Date).Value = request.CheckOutDate.Date;

            cmd.Parameters.AddWithValue("@isForTack", request.IsForTack);

            string payersJson = JsonSerializer.Serialize(request.Payers);
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
                    CheckInDate = Convert.ToDateTime(reader["startdate"]),
                    CheckOutDate = Convert.ToDateTime(reader["enddate"]),
                    StallCompoundId = reader["compoundid"] == DBNull.Value ? null : Convert.ToInt16(reader["compoundid"]),
                    StallId = reader["stallid"] == DBNull.Value ? null : Convert.ToInt16(reader["stallid"]),
                    CatalogItemId = Convert.ToInt32(reader["catalogitemid"]),
                    ItemPrice = Convert.ToDecimal(reader["itemprice"]),
                    Notes = reader["notes"] == DBNull.Value ? null : reader["notes"].ToString(),
                    ApprovalDate = reader["approvaldate"] == DBNull.Value ? null : Convert.ToDateTime(reader["approvaldate"]),
                    IsCancelled = Convert.ToBoolean(reader["iscancelled"]),
                    HasApprovedChange = Convert.ToBoolean(reader["hasapprovedchange"])
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
                    PaidByPersonId = Convert.ToInt32(reader["paidbypersonid"]),
                    PayerFullName = reader["payerfullname"]?.ToString() ?? string.Empty,
                    AmountToPay = Convert.ToDecimal(reader["amounttopay"]),
                    DateOpened = Convert.ToDateTime(reader["dateopened"]),
                    DateClosed = reader["dateclosed"] == DBNull.Value ? null : Convert.ToDateTime(reader["dateclosed"])
                });
            }

            return payers;
        }

        public static List<StallBookingPayerItem> GetAllStallBookingPayersForCompetitionAndRanch(int competitionId, int ranchId)
        {
            List<StallBookingPayerItem> payers = new List<StallBookingPayerItem>();

            using NpgsqlConnection conn = DBServices.GetDefaultConnection();
            conn.Open();

            using NpgsqlCommand cmd = new NpgsqlCommand("SELECT * FROM usp_getallstallbookingpayersforcompetitionandranch(@competitionId, @ranchId)", conn);
            cmd.Parameters.AddWithValue("@competitionId", competitionId);
            cmd.Parameters.AddWithValue("@ranchId", ranchId);

            using NpgsqlDataReader reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                payers.Add(new StallBookingPayerItem
                {
                    StallBookingId = Convert.ToInt32(reader["stallbookingid"]),
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