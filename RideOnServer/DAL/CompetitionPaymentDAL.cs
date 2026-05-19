using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.CompetitionPayments;

namespace RideOnServer.DAL
{
    public class CompetitionPaymentDAL : DBServices
    {
        public List<CompetitionPayerPaymentSummaryItem>
            GetPayersPaymentSummary(int competitionId)
        {
            List<CompetitionPayerPaymentSummaryItem> items =
                new List<CompetitionPayerPaymentSummaryItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                            select *
                            from public.usp_getcompetitionpayerspaymentsummary(
                                @competitionId
                            );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add(
                            "@competitionId",
                            NpgsqlDbType.Integer
                        ).Value = competitionId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionPayerPaymentSummaryItem
                                    {
                                        BillId = GetInt(reader, "BillId"),
                                        PayerPersonId = GetInt(reader, "PayerPersonId"),
                                        PayerName = GetString(reader, "PayerName"),
                                        TotalAmount = GetDecimal(reader, "TotalAmount"),
                                        PaidAmount = GetDecimal(reader, "PaidAmount"),
                                        UnpaidAmount = GetDecimal(reader, "UnpaidAmount"),
                                        PaymentStatus = GetString(reader, "PaymentStatus"),
                                        LastUpdatedAt = GetDateTime(reader, "LastUpdatedAt")
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

        public List<CompetitionPayerAccountSummaryItem>
            GetPayerAccountSummary(
                int competitionId,
                int payerPersonId)
        {
            List<CompetitionPayerAccountSummaryItem> items =
                new List<CompetitionPayerAccountSummaryItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                            select *
                            from public.usp_getcompetitionpayeraccountsummary(
                                @competitionId,
                                @payerPersonId
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
                            "@payerPersonId",
                            NpgsqlDbType.Integer
                        ).Value = payerPersonId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionPayerAccountSummaryItem
                                    {
                                        BillId = GetInt(reader, "BillId"),
                                        PayerPersonId = GetInt(reader, "PayerPersonId"),
                                        PayerName = GetString(reader, "PayerName"),
                                        ChargeOwner = GetString(reader, "ChargeOwner"),
                                        TotalAmount = GetDecimal(reader, "TotalAmount"),
                                        PaidAmount = GetDecimal(reader, "PaidAmount"),
                                        UnpaidAmount = GetDecimal(reader, "UnpaidAmount"),
                                        PaymentStatus = GetString(reader, "PaymentStatus")
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

        public List<CompetitionPayerCategorySummaryItem>
            GetPayerCategorySummary(
                int competitionId,
                int payerPersonId)
        {
            List<CompetitionPayerCategorySummaryItem> items =
                new List<CompetitionPayerCategorySummaryItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                            select *
                            from public.usp_getcompetitionpayercategorysummary(
                                @competitionId,
                                @payerPersonId
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
                            "@payerPersonId",
                            NpgsqlDbType.Integer
                        ).Value = payerPersonId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionPayerCategorySummaryItem
                                    {
                                        ChargeOwner = GetString(reader, "ChargeOwner"),
                                        CategoryKey = GetString(reader, "CategoryKey"),
                                        CategoryName = GetString(reader, "CategoryName"),
                                        ChargeCount = GetInt(reader, "ChargeCount"),
                                        TotalAmount = GetDecimal(reader, "TotalAmount"),
                                        PaidAmount = GetDecimal(reader, "PaidAmount"),
                                        UnpaidAmount = GetDecimal(reader, "UnpaidAmount"),
                                        PaymentStatus = GetString(reader, "PaymentStatus")
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

        public List<CompetitionPayerChargeItem>
            GetPayerCharges(
                int competitionId,
                int payerPersonId,
                string? chargeOwner,
                string? categoryKey)
        {
            List<CompetitionPayerChargeItem> items =
                new List<CompetitionPayerChargeItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                            select *
                            from public.usp_getcompetitionpayercharges(
                                @competitionId,
                                @payerPersonId,
                                @chargeOwner,
                                @categoryKey
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
                            "@payerPersonId",
                            NpgsqlDbType.Integer
                        ).Value = payerPersonId;

                        command.Parameters.Add(
                            "@chargeOwner",
                            NpgsqlDbType.Text
                        ).Value = chargeOwner == null ? DBNull.Value : chargeOwner;

                        command.Parameters.Add(
                            "@categoryKey",
                            NpgsqlDbType.Text
                        ).Value = categoryKey == null ? DBNull.Value : categoryKey;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new CompetitionPayerChargeItem
                                    {
                                        BillChargeId = GetInt(reader, "BillChargeId"),
                                        BillId = GetInt(reader, "BillId"),
                                        ChargeOwner = GetString(reader, "ChargeOwner"),
                                        CategoryKey = GetString(reader, "CategoryKey"),
                                        SourceType = GetString(reader, "SourceType"),
                                        SourceId = GetInt(reader, "SourceId"),
                                        DisplayDate = GetNullableDateTime(reader, "DisplayDate"),
                                        StartDate = GetNullableDateTime(reader, "StartDate"),
                                        EndDate = GetNullableDateTime(reader, "EndDate"),
                                        MainName = GetString(reader, "MainName"),
                                        RiderName = GetNullableString(reader, "RiderName"),
                                        HorseName = GetNullableString(reader, "HorseName"),
                                        BarnName = GetNullableString(reader, "BarnName"),
                                        CoachName = GetNullableString(reader, "CoachName"),
                                        PayerName = GetString(reader, "PayerName"),
                                        StallTypeName = GetNullableString(reader, "StallTypeName"),
                                        StallNumber = GetNullableString(reader, "StallNumber"),
                                        CompoundName = GetNullableString(reader, "CompoundName"),
                                        BagQuantity = GetNullableInt(reader, "BagQuantity"),
                                        SplitPayersCount = GetNullableInt(reader, "SplitPayersCount"),
                                        SplitPaymentText = GetNullableString(reader, "SplitPaymentText"),
                                        StallAssignmentText = GetNullableString(reader, "StallAssignmentText"),
                                        AmountToPay = GetDecimal(reader, "AmountToPay"),
                                        ChargeStatus = GetString(reader, "ChargeStatus"),
                                        PaymentBatchId = GetNullableInt(reader, "PaymentBatchId"),
                                        InvoiceNumber = GetNullableString(reader, "InvoiceNumber"),
                                        CanSelectForPayment = GetBool(reader, "CanSelectForPayment")
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

        public List<PaymentMethodItem> GetPaymentMethods()
        {
            List<PaymentMethodItem> items =
                new List<PaymentMethodItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                            select *
                            from public.usp_getpaymentmethods();",
                            connection
                        )
                    )
                    {
                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new PaymentMethodItem
                                    {
                                        PaymentMethodId = GetInt(reader, "PaymentMethodId"),
                                        PaymentMethodType = GetString(reader, "PaymentMethodType")
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

        public int CreateCompetitionPayment(
            CreateCompetitionPaymentRequest request)
        {
            try
            {
                string selectedChargesJson =
                    JsonSerializer.Serialize(
                        request.SelectedCharges.Select(
                            charge => new
                            {
                                billChargeId = charge.BillChargeId
                            }
                        )
                    );

                string paymentMethodsJson =
                    JsonSerializer.Serialize(
                        request.PaymentMethods.Select(
                            method => new
                            {
                                paymentMethodId = method.PaymentMethodId,
                                amount = method.Amount
                            }
                        )
                    );

                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                            select public.usp_createcompetitionpayerpayment(
                                @competitionId,
                                @payerPersonId,
                                @enteredBySystemUserId,
                                @invoiceNumber,
                                @selectedCharges::jsonb,
                                @paymentMethods::jsonb,
                                @notes
                            );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add(
                            "@competitionId",
                            NpgsqlDbType.Integer
                        ).Value = request.CompetitionId;

                        command.Parameters.Add(
                            "@payerPersonId",
                            NpgsqlDbType.Integer
                        ).Value = request.PayerPersonId;

                        command.Parameters.Add(
                            "@enteredBySystemUserId",
                            NpgsqlDbType.Integer
                        ).Value = request.EnteredBySystemUserId;

                        command.Parameters.Add(
                            "@invoiceNumber",
                            NpgsqlDbType.Text
                        ).Value = request.InvoiceNumber;

                        command.Parameters.Add(
                            "@selectedCharges",
                            NpgsqlDbType.Jsonb
                        ).Value = selectedChargesJson;

                        command.Parameters.Add(
                            "@paymentMethods",
                            NpgsqlDbType.Jsonb
                        ).Value = paymentMethodsJson;

                        command.Parameters.Add(
                            "@notes",
                            NpgsqlDbType.Text
                        ).Value =
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
    }
}