using Npgsql;
using NpgsqlTypes;
using System.Text.Json;
using RideOnServer.BL.DTOs.CompetitionSummary;

namespace RideOnServer.DAL
{
    public class CompetitionSummaryDAL : DBServices
    {
        public List<CompetitionSummaryCategoryItem> GetCompetitionSummaryByCategory(
            int competitionId,
            int ranchId)
        {
            List<CompetitionSummaryCategoryItem> items =
                new List<CompetitionSummaryCategoryItem>();

            try
            {
                using (
                    NpgsqlConnection connection =
                        Connect("DefaultConnection")
                )
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command =
                            new NpgsqlCommand(
                                @"
                                select *
                                from public.usp_getcompetitionsummarybycategory(
                                    @competitionId,
                                    @ranchId
                                );",
                                connection
                            )
                    )
                    {
                        command.Parameters.Add(
                            "@competitionId",
                            NpgsqlDbType.Integer
                        ).Value = competitionId;

                        command.Parameters.Add(
                            "@ranchId",
                            NpgsqlDbType.Integer
                        ).Value = ranchId;

                        using (
                            NpgsqlDataReader reader =
                                command.ExecuteReader()
                        )
                        {
                            while (reader.Read())
                            {
                                CompetitionSummaryCategoryItem item =
                                    new CompetitionSummaryCategoryItem
                                    {
                                        SectionKey =
                                            GetString(reader, "SectionKey"),

                                        CategoryKey =
                                            GetString(reader, "CategoryKey"),

                                        CategoryName =
                                            GetString(reader, "CategoryName"),

                                        Quantity =
                                            GetInt(reader, "Quantity"),

                                        ExpectedAmount =
                                            GetDecimal(reader, "ExpectedAmount"),

                                        PaidAmount =
                                            GetDecimal(reader, "PaidAmount"),

                                        UnpaidAmount =
                                            GetDecimal(reader, "UnpaidAmount")
                                    };

                                items.Add(item);
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        private static string GetString(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return string.Empty;
            }

            return reader.GetString(ordinal);
        }

        private static int GetInt(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return 0;
            }

            return reader.GetInt32(ordinal);
        }

        private static decimal GetDecimal(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return 0;
            }

            return reader.GetDecimal(ordinal);
        }

        public List<CompetitionSummaryClassDetailItem> GetCompetitionSummaryClassDetails(
            int competitionId,
            int ranchId,
            string sectionKey)
        {
            List<CompetitionSummaryClassDetailItem> items =
                new List<CompetitionSummaryClassDetailItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummaryclassdetails(
                        @competitionId,
                        @ranchId,
                        @sectionKey
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@sectionKey", NpgsqlDbType.Text)
                            .Value = sectionKey;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryClassDetailItem
                                    {
                                        ClassInCompId = GetInt(reader, "ClassInCompId"),
                                        ClassDate = GetDateTime(reader, "ClassDate"),
                                        StartTime = GetNullableTimeSpan(reader, "StartTime"),
                                        OrderInDay = GetNullableShort(reader, "OrderInDay"),
                                        ClassName = GetString(reader, "ClassName"),
                                        EntryCount = GetInt(reader, "EntryCount"),
                                        PaidCount = GetInt(reader, "PaidCount"),
                                        UnpaidCount = GetInt(reader, "UnpaidCount"),
                                        FineCount = GetInt(reader, "FineCount"),
                                        ExpectedAmount = GetDecimal(reader, "ExpectedAmount"),
                                        PaidAmount = GetDecimal(reader, "PaidAmount"),
                                        UnpaidAmount = GetDecimal(reader, "UnpaidAmount")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryClassEntryItem> GetCompetitionSummaryClassEntries(
            int competitionId,
            int ranchId,
            int classInCompId,
            string sectionKey)
        {
            List<CompetitionSummaryClassEntryItem> items =
                new List<CompetitionSummaryClassEntryItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                            select *
                            from public.usp_getcompetitionsummaryclassentries(
                                @competitionId,
                                @ranchId,
                                @classInCompId,
                                @sectionKey
                            );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@classInCompId", NpgsqlDbType.Integer)
                            .Value = classInCompId;

                        command.Parameters.Add("@sectionKey", NpgsqlDbType.Text)
                            .Value = sectionKey;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryClassEntryItem
                                    {
                                        EntryId = GetInt(reader, "EntryId"),
                                        DrawOrder = GetNullableShort(reader, "DrawOrder"),
                                        RiderName = GetString(reader, "RiderName"),
                                        HorseName = GetString(reader, "HorseName"),
                                        BarnName = GetNullableString(reader, "BarnName"),
                                        CoachName = GetNullableString(reader, "CoachName"),
                                        PayerName = GetString(reader, "PayerName"),
                                        PrizeRecipientName = GetNullableString(reader, "PrizeRecipientName"),
                                        FineName = GetNullableString(reader, "FineName"),
                                        FineAmount = GetDecimal(reader, "FineAmount"),
                                        IsPaid = GetBool(reader, "IsPaid"),
                                        Amount = GetDecimal(reader, "Amount")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        private static short? GetNullableShort(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return null;
            }

            return reader.GetInt16(ordinal);
        }

        private static string? GetNullableString(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return null;
            }

            return reader.GetString(ordinal);
        }

        private static DateTime GetDateTime(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return DateTime.MinValue;
            }

            return reader.GetDateTime(ordinal);
        }

        private static TimeSpan? GetNullableTimeSpan(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return null;
            }

            return reader.GetTimeSpan(ordinal);
        }

        private static bool GetBool(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return false;
            }

            return reader.GetBoolean(ordinal);
        }

        public List<CompetitionSummaryPaidTimeDetailItem> GetCompetitionSummaryPaidTimeDetails(
    int competitionId,
    int ranchId)
        {
            List<CompetitionSummaryPaidTimeDetailItem> items =
                new List<CompetitionSummaryPaidTimeDetailItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarypaidtimedetails(
                        @competitionId,
                        @ranchId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryPaidTimeDetailItem
                                    {
                                        PaidTimeSlotInCompId =
                                            GetInt(reader, "PaidTimeSlotInCompId"),

                                        SlotDate =
                                            GetDateTime(reader, "SlotDate"),

                                        StartTime =
                                            GetTimeSpan(reader, "StartTime"),

                                        EndTime =
                                            GetTimeSpan(reader, "EndTime"),

                                        ArenaName =
                                            GetString(reader, "ArenaName"),

                                        ProductId =
                                            GetShort(reader, "ProductId"),

                                        ProductName =
                                            GetString(reader, "ProductName"),

                                        DurationMinutes =
                                            GetInt(reader, "DurationMinutes"),

                                        RequestCount =
                                            GetInt(reader, "RequestCount"),

                                        PaidCount =
                                            GetInt(reader, "PaidCount"),

                                        UnpaidCount =
                                            GetInt(reader, "UnpaidCount"),

                                        ExpectedAmount =
                                            GetDecimal(reader, "ExpectedAmount"),

                                        PaidAmount =
                                            GetDecimal(reader, "PaidAmount"),

                                        UnpaidAmount =
                                            GetDecimal(reader, "UnpaidAmount")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryPaidTimeEntryItem> GetCompetitionSummaryPaidTimeEntries(
            int competitionId,
            int ranchId,
            int paidTimeSlotInCompId,
            short productId)
        {
            List<CompetitionSummaryPaidTimeEntryItem> items =
                new List<CompetitionSummaryPaidTimeEntryItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarypaidtimeentries(
                        @competitionId,
                        @ranchId,
                        @paidTimeSlotInCompId,
                        @productId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@paidTimeSlotInCompId", NpgsqlDbType.Integer)
                            .Value = paidTimeSlotInCompId;

                        command.Parameters.Add("@productId", NpgsqlDbType.Smallint)
                            .Value = productId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryPaidTimeEntryItem
                                    {
                                        PaidTimeRequestId =
                                            GetInt(reader, "PaidTimeRequestId"),

                                        SlotDate =
                                            GetDateTime(reader, "SlotDate"),

                                        StartTime =
                                            GetTimeSpan(reader, "StartTime"),

                                        EndTime =
                                            GetTimeSpan(reader, "EndTime"),

                                        ArenaName =
                                            GetString(reader, "ArenaName"),

                                        ProductName =
                                            GetString(reader, "ProductName"),

                                        DurationMinutes =
                                            GetInt(reader, "DurationMinutes"),

                                        RiderName =
                                            GetString(reader, "RiderName"),

                                        HorseName =
                                            GetString(reader, "HorseName"),

                                        BarnName =
                                            GetNullableString(reader, "BarnName"),

                                        CoachName =
                                            GetNullableString(reader, "CoachName"),

                                        PayerName =
                                            GetString(reader, "PayerName"),

                                        Status =
                                            GetString(reader, "Status"),

                                        IsPaid =
                                            GetBool(reader, "IsPaid"),

                                        Amount =
                                            GetDecimal(reader, "Amount")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryStallDetailItem> GetCompetitionSummaryStallDetails(
            int competitionId,
            int ranchId)
        {
            List<CompetitionSummaryStallDetailItem> items =
                new List<CompetitionSummaryStallDetailItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarystalldetails(
                        @competitionId,
                        @ranchId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryStallDetailItem
                                    {
                                        BookingRanchId =
                                            GetInt(reader, "BookingRanchId"),

                                        BookingRanchName =
                                            GetString(reader, "BookingRanchName"),

                                        ProductId =
                                            GetShort(reader, "ProductId"),

                                        ProductName =
                                            GetString(reader, "ProductName"),

                                        IsForTack =
                                            GetBool(reader, "IsForTack"),

                                        BookingCount =
                                            GetInt(reader, "BookingCount"),

                                        HorseCount =
                                            GetInt(reader, "HorseCount"),

                                        TackCount =
                                            GetInt(reader, "TackCount"),

                                        ExpectedAmount =
                                            GetDecimal(reader, "ExpectedAmount"),

                                        PaidAmount =
                                            GetDecimal(reader, "PaidAmount"),

                                        UnpaidAmount =
                                            GetDecimal(reader, "UnpaidAmount")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryStallEntryItem> GetCompetitionSummaryStallEntries(
            int competitionId,
            int ranchId,
            int bookingRanchId,
            short productId,
            bool isForTack)
        {
            List<CompetitionSummaryStallEntryItem> items =
                new List<CompetitionSummaryStallEntryItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarystallentries(
                        @competitionId,
                        @ranchId,
                        @bookingRanchId,
                        @productId,
                        @isForTack
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@bookingRanchId", NpgsqlDbType.Integer)
                            .Value = bookingRanchId;

                        command.Parameters.Add("@productId", NpgsqlDbType.Smallint)
                            .Value = productId;

                        command.Parameters.Add("@isForTack", NpgsqlDbType.Boolean)
                            .Value = isForTack;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryStallEntryItem
                                    {
                                        StallBookingId =
                                            GetInt(reader, "StallBookingId"),

                                        BookingRanchName =
                                            GetString(reader, "BookingRanchName"),

                                        ProductName =
                                            GetString(reader, "ProductName"),

                                        IsForTack =
                                            GetBool(reader, "IsForTack"),

                                        HorseName =
                                            GetNullableString(reader, "HorseName"),

                                        BarnName =
                                            GetNullableString(reader, "BarnName"),

                                        StartDate =
                                            GetDateTime(reader, "StartDate"),

                                        EndDate =
                                            GetDateTime(reader, "EndDate"),

                                        PayerNames =
                                            GetString(reader, "PayerNames"),

                                        IsPaid =
                                            GetBool(reader, "IsPaid"),

                                        ExpectedAmount =
                                            GetDecimal(reader, "ExpectedAmount"),

                                        PaidAmount =
                                            GetDecimal(reader, "PaidAmount"),

                                        UnpaidAmount =
                                            GetDecimal(reader, "UnpaidAmount")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryShavingsDetailItem> GetCompetitionSummaryShavingsDetails(
    int competitionId,
    int ranchId)
        {
            List<CompetitionSummaryShavingsDetailItem> items =
                new List<CompetitionSummaryShavingsDetailItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummaryshavingsdetails(
                        @competitionId,
                        @ranchId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryShavingsDetailItem
                                    {
                                        BookingRanchId =
                                            GetInt(reader, "BookingRanchId"),

                                        BookingRanchName =
                                            GetString(reader, "BookingRanchName"),

                                        OrderCount =
                                            GetInt(reader, "OrderCount"),

                                        StallCount =
                                            GetInt(reader, "StallCount"),

                                        BagQuantity =
                                            GetInt(reader, "BagQuantity"),

                                        ExpectedAmount =
                                            GetDecimal(reader, "ExpectedAmount"),

                                        PaidAmount =
                                            GetDecimal(reader, "PaidAmount"),

                                        UnpaidAmount =
                                            GetDecimal(reader, "UnpaidAmount")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryShavingsEntryItem> GetCompetitionSummaryShavingsEntries(
            int competitionId,
            int ranchId,
            int bookingRanchId)
        {
            List<CompetitionSummaryShavingsEntryItem> items =
                new List<CompetitionSummaryShavingsEntryItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummaryshavingsentries(
                        @competitionId,
                        @ranchId,
                        @bookingRanchId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@bookingRanchId", NpgsqlDbType.Integer)
                            .Value = bookingRanchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryShavingsEntryItem
                                    {
                                        ShavingsOrderId =
                                            GetInt(reader, "ShavingsOrderId"),

                                        BookingRanchName =
                                            GetString(reader, "BookingRanchName"),

                                        StallCount =
                                            GetInt(reader, "StallCount"),

                                        BagQuantity =
                                            GetInt(reader, "BagQuantity"),

                                        RequestedDeliveryTime =
                                            GetNullableDateTime(reader, "RequestedDeliveryTime"),

                                        DeliveryStatus =
                                            GetNullableString(reader, "DeliveryStatus"),

                                        HorseNames =
                                            GetString(reader, "HorseNames"),

                                        PayerNames =
                                            GetString(reader, "PayerNames"),

                                        IsPaid =
                                            GetBool(reader, "IsPaid"),

                                        ExpectedAmount =
                                            GetDecimal(reader, "ExpectedAmount"),

                                        PaidAmount =
                                            GetDecimal(reader, "PaidAmount"),

                                        UnpaidAmount =
                                            GetDecimal(reader, "UnpaidAmount")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryPaymentMethodBreakdownItem>
    GetPaymentMethodBreakdown(
        int competitionId,
        int ranchId,
        string chargeOwner)
        {
            List<CompetitionSummaryPaymentMethodBreakdownItem> items =
                new List<CompetitionSummaryPaymentMethodBreakdownItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarypaymentmethodbreakdown(
                        @competitionId,
                        @ranchId,
                        @chargeOwner
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@chargeOwner", NpgsqlDbType.Text)
                            .Value = chargeOwner;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryPaymentMethodBreakdownItem
                                    {
                                        PaymentMethodId =
                                            GetInt(reader, "PaymentMethodId"),

                                        PaymentMethodType =
                                            GetString(reader, "PaymentMethodType"),

                                        PaymentBatchCount =
                                            GetInt(reader, "PaymentBatchCount"),

                                        AmountPaid =
                                            GetDecimal(reader, "AmountPaid")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryPaymentBatchItem>
            GetPaymentBatches(
                int competitionId,
                int ranchId,
                string chargeOwner,
                int? paymentMethodId)
        {
            List<CompetitionSummaryPaymentBatchItem> items =
                new List<CompetitionSummaryPaymentBatchItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarypaymentbatches(
                        @competitionId,
                        @ranchId,
                        @chargeOwner,
                        @paymentMethodId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@chargeOwner", NpgsqlDbType.Text)
                            .Value = chargeOwner;

                        command.Parameters.Add("@paymentMethodId", NpgsqlDbType.Integer)
                            .Value = paymentMethodId == null
                                ? DBNull.Value
                                : paymentMethodId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryPaymentBatchItem
                                    {
                                        PaymentBatchId =
                                            GetInt(reader, "PaymentBatchId"),

                                        BillId =
                                            GetInt(reader, "BillId"),

                                        PayerPersonId =
                                            GetInt(reader, "PayerPersonId"),

                                        PayerName =
                                            GetString(reader, "PayerName"),

                                        InvoiceNumber =
                                            GetString(reader, "InvoiceNumber"),

                                        CreatedAt =
                                            GetDateTime(reader, "CreatedAt"),

                                        EnteredByName =
                                            GetNullableString(reader, "EnteredByName"),

                                        BatchTotalAmount =
                                            GetDecimal(reader, "BatchTotalAmount"),

                                        SelectedMethodAmount =
                                            GetDecimal(reader, "SelectedMethodAmount"),

                                        PaymentMethodsText =
                                            GetString(reader, "PaymentMethodsText")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryPaymentBatchMethodItem>
            GetPaymentBatchMethods(
                int competitionId,
                int ranchId,
                int paymentBatchId)
        {
            List<CompetitionSummaryPaymentBatchMethodItem> items =
                new List<CompetitionSummaryPaymentBatchMethodItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarypaymentbatchmethods(
                        @competitionId,
                        @ranchId,
                        @paymentBatchId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@paymentBatchId", NpgsqlDbType.Integer)
                            .Value = paymentBatchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryPaymentBatchMethodItem
                                    {
                                        PaymentId =
                                            GetInt(reader, "PaymentId"),

                                        PaymentBatchId =
                                            GetInt(reader, "PaymentBatchId"),

                                        PaymentMethodId =
                                            GetInt(reader, "PaymentMethodId"),

                                        PaymentMethodType =
                                            GetString(reader, "PaymentMethodType"),

                                        AmountPaid =
                                            GetDecimal(reader, "AmountPaid"),

                                        PaymentDate =
                                            GetDateTime(reader, "PaymentDate"),

                                        InvoiceNumber =
                                            GetNullableString(reader, "InvoiceNumber"),

                                        TransactionReference =
                                            GetNullableString(reader, "TransactionReference")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryPaymentBatchChargeItem>
            GetPaymentBatchCharges(
                int competitionId,
                int ranchId,
                int paymentBatchId)
        {
            List<CompetitionSummaryPaymentBatchChargeItem> items =
                new List<CompetitionSummaryPaymentBatchChargeItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarypaymentbatchcharges(
                        @competitionId,
                        @ranchId,
                        @paymentBatchId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        command.Parameters.Add("@paymentBatchId", NpgsqlDbType.Integer)
                            .Value = paymentBatchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryPaymentBatchChargeItem
                                    {
                                        BillChargeId =
                                            GetInt(reader, "BillChargeId"),

                                        ChargeOwner =
                                            GetString(reader, "ChargeOwner"),

                                        CategoryKey =
                                            GetString(reader, "CategoryKey"),

                                        SourceType =
                                            GetString(reader, "SourceType"),

                                        SourceId =
                                            GetInt(reader, "SourceId"),

                                        MainName =
                                            GetString(reader, "MainName"),

                                        ProductDetailsText =
                                            GetNullableString(reader, "ProductDetailsText"),

                                        RiderName =
                                            GetNullableString(reader, "RiderName"),

                                        HorseName =
                                            GetNullableString(reader, "HorseName"),

                                        BarnName =
                                            GetNullableString(reader, "BarnName"),

                                        AmountToPay =
                                            GetDecimal(reader, "AmountToPay"),

                                        Notes =
                                            GetNullableString(reader, "Notes")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<CompetitionSummaryCashDetailItem> GetCompetitionSummaryCashDetails(
            int competitionId,
            int ranchId)
        {
            List<CompetitionSummaryCashDetailItem> items =
                new List<CompetitionSummaryCashDetailItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitionsummarycashdetails(
                        @competitionId,
                        @ranchId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionSummaryCashDetailItem
                                    {
                                        PaymentId =
                                            GetInt(reader, "PaymentId"),

                                        BillId =
                                            GetInt(reader, "BillId"),

                                        PayerName =
                                            GetString(reader, "PayerName"),

                                        AmountPaid =
                                            GetDecimal(reader, "AmountPaid"),

                                        PaymentDate =
                                            GetDateTime(reader, "PaymentDate"),

                                        PaymentMethodType =
                                            GetString(reader, "PaymentMethodType"),

                                        TransactionReference =
                                            GetNullableString(reader, "TransactionReference"),

                                        EnteredByName =
                                            GetNullableString(reader, "EnteredByName")
                                    }
                                );
                            }
                        }
                    }
                }

                return items;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        private static short GetShort(
    NpgsqlDataReader reader,
    string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return 0;
            }

            return reader.GetInt16(ordinal);
        }

        public CompetitionCashDeskOverviewItem GetCashDeskOverview(
    int competitionId,
    int ranchId)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getcompetitioncashdeskoverview(
                        @competitionId,
                        @ranchId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = competitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = ranchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                return new CompetitionCashDeskOverviewItem
                                {
                                    CompetitionId =
                                        GetInt(reader, "CompetitionId"),

                                    RanchId =
                                        GetInt(reader, "RanchId"),

                                    ExpectedCashAmount =
                                        GetDecimal(reader, "ExpectedCashAmount"),

                                    TransferredToSafeAmount =
                                        GetDecimal(reader, "TransferredToSafeAmount"),

                                    CurrentCashInDeskAmount =
                                        GetDecimal(reader, "CurrentCashInDeskAmount"),

                                    LastCountId =
                                        GetNullableInt(reader, "LastCountId"),

                                    LastCountedAt =
                                        GetNullableDateTime(reader, "LastCountedAt"),

                                    LastCountedByName =
                                        GetNullableString(reader, "LastCountedByName"),

                                    LastCountedAmount =
                                        GetDecimal(reader, "LastCountedAmount"),

                                    LastDifferenceAmount =
                                        GetDecimal(reader, "LastDifferenceAmount"),

                                    LastSafeTransferAt =
                                        GetNullableDateTime(reader, "LastSafeTransferAt"),

                                    IsCountRequired =
                                        GetBool(reader, "IsCountRequired")
                                };
                            }
                        }
                    }
                }

                return new CompetitionCashDeskOverviewItem
                {
                    CompetitionId = competitionId,
                    RanchId = ranchId
                };
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public int SaveCashCount(
            SaveCompetitionCashCountRequest request)
        {
            try
            {
                string linesJson =
                    JsonSerializer.Serialize(
                        request.Lines.Select(
                            line => new
                            {
                                denominationValue = line.DenominationValue,
                                quantity = line.Quantity
                            }
                        )
                    );

                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select public.usp_savecompetitioncashcount(
                        @competitionId,
                        @ranchId,
                        @countedBySystemUserId,
                        @lines::jsonb,
                        @notes
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = request.CompetitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = request.RanchId;

                        command.Parameters.Add("@countedBySystemUserId", NpgsqlDbType.Integer)
                            .Value = request.CountedBySystemUserId;

                        command.Parameters.Add("@lines", NpgsqlDbType.Jsonb)
                            .Value = linesJson;

                        command.Parameters.Add("@notes", NpgsqlDbType.Text)
                            .Value =
                                request.Notes == null
                                    ? DBNull.Value
                                    : request.Notes;

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

        public int SaveCashSafeTransfer(
            SaveCompetitionCashSafeTransferRequest request)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select public.usp_savecompetitioncashsafetransfer(
                        @competitionId,
                        @ranchId,
                        @transferredBySystemUserId,
                        @amount,
                        @notes
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer)
                            .Value = request.CompetitionId;

                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer)
                            .Value = request.RanchId;

                        command.Parameters.Add("@transferredBySystemUserId", NpgsqlDbType.Integer)
                            .Value = request.TransferredBySystemUserId;

                        command.Parameters.Add("@amount", NpgsqlDbType.Numeric)
                            .Value = request.Amount;

                        command.Parameters.Add("@notes", NpgsqlDbType.Text)
                            .Value =
                                request.Notes == null
                                    ? DBNull.Value
                                    : request.Notes;

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

        private static int? GetNullableInt(
    NpgsqlDataReader reader,
    string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return null;
            }

            return reader.GetInt32(ordinal);
        }

        private static TimeSpan GetTimeSpan(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return TimeSpan.Zero;
            }

            return reader.GetTimeSpan(ordinal);
        }

        private static DateTime? GetNullableDateTime(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return null;
            }

            return reader.GetDateTime(ordinal);
        }
    }
}