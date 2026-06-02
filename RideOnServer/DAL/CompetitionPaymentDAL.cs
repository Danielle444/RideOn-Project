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

                                        DisplayRowKey = GetString(reader, "DisplayRowKey"),
                                        StallBookingId = GetNullableInt(reader, "StallBookingId"),

                                        DisplayDate = GetNullableDateTime(reader, "DisplayDate"),
                                        StartDate = GetNullableDateTime(reader, "StartDate"),
                                        EndDate = GetNullableDateTime(reader, "EndDate"),
                                        RequestedDeliveryTime = GetNullableDateTime(reader, "RequestedDeliveryTime"),

                                        MainName = GetString(reader, "MainName"),
                                        RiderName = GetNullableString(reader, "RiderName"),
                                        HorseName = GetNullableString(reader, "HorseName"),
                                        BarnName = GetNullableString(reader, "BarnName"),
                                        CoachName = GetNullableString(reader, "CoachName"),
                                        PayerName = GetString(reader, "PayerName"),
                                        OrderedByName = GetNullableString(reader, "OrderedByName"),

                                        StallTypeName = GetNullableString(reader, "StallTypeName"),
                                        StallNumber = GetNullableString(reader, "StallNumber"),
                                        CompoundName = GetNullableString(reader, "CompoundName"),
                                        BagQuantity = GetNullableInt(reader, "BagQuantity"),

                                        SplitPayersCount = GetNullableInt(reader, "SplitPayersCount"),
                                        SplitPaymentText = GetNullableString(reader, "SplitPaymentText"),
                                        SplitPayersJson = GetNullableString(reader, "SplitPayersJson"),
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
                        @chargeOwner,
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
                            "@chargeOwner",
                            NpgsqlDbType.Text
                        ).Value = request.ChargeOwner;

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

        public FederationExternalCreditItem CreateFederationExternalCredit(
    CreateFederationExternalCreditRequest request)
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
                    from public.usp_createfederationexternalcredit(
                        @competitionId,
                        @sourceType,
                        @externalReference,
                        @externalName,
                        @externalClubName,
                        @externalIdNumber,
                        @originalAmount,
                        @createdBySystemUserId,
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
                            "@sourceType",
                            NpgsqlDbType.Text
                        ).Value = request.SourceType;

                        command.Parameters.Add(
                            "@externalReference",
                            NpgsqlDbType.Text
                        ).Value =
                            request.ExternalReference == null
                                ? DBNull.Value
                                : request.ExternalReference;

                        command.Parameters.Add(
                            "@externalName",
                            NpgsqlDbType.Text
                        ).Value =
                            request.ExternalName == null
                                ? DBNull.Value
                                : request.ExternalName;

                        command.Parameters.Add(
                            "@externalClubName",
                            NpgsqlDbType.Text
                        ).Value =
                            request.ExternalClubName == null
                                ? DBNull.Value
                                : request.ExternalClubName;

                        command.Parameters.Add(
                            "@externalIdNumber",
                            NpgsqlDbType.Text
                        ).Value =
                            request.ExternalIdNumber == null
                                ? DBNull.Value
                                : request.ExternalIdNumber;

                        command.Parameters.Add(
                            "@originalAmount",
                            NpgsqlDbType.Numeric
                        ).Value = request.OriginalAmount;

                        command.Parameters.Add(
                            "@createdBySystemUserId",
                            NpgsqlDbType.Integer
                        ).Value = request.CreatedBySystemUserId;

                        command.Parameters.Add(
                            "@notes",
                            NpgsqlDbType.Text
                        ).Value =
                            request.Notes == null
                                ? DBNull.Value
                                : request.Notes;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                return new FederationExternalCreditItem
                                {
                                    FederationExternalCreditId = GetInt(reader, "FederationExternalCreditId"),
                                    CompetitionId = GetInt(reader, "CompetitionId"),
                                    SourceType = GetString(reader, "SourceType"),
                                    ExternalReference = GetNullableString(reader, "ExternalReference"),
                                    ExternalName = GetNullableString(reader, "ExternalName"),
                                    ExternalClubName = GetNullableString(reader, "ExternalClubName"),
                                    ExternalIdNumber = GetNullableString(reader, "ExternalIdNumber"),
                                    OriginalAmount = GetDecimal(reader, "OriginalAmount"),
                                    UsedAmount = GetDecimal(reader, "UsedAmount"),
                                    AvailableAmount = GetDecimal(reader, "AvailableAmount"),
                                    CreditStatus = GetString(reader, "CreditStatus"),
                                    UsageStatusLabel = null,
                                    CreatedAt = GetDateTime(reader, "CreatedAt"),
                                    Notes = GetNullableString(reader, "Notes")
                                };
                            }
                        }
                    }
                }

                throw new Exception("Federation external credit was not created");
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<FederationExternalCreditItem> SearchFederationExternalCredits(
            int competitionId,
            string? searchText,
            bool onlyAvailable)
        {
            List<FederationExternalCreditItem> items =
                new List<FederationExternalCreditItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_searchfederationexternalcredits(
                        @competitionId,
                        @searchText,
                        @onlyAvailable
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
                            "@searchText",
                            NpgsqlDbType.Text
                        ).Value =
                            searchText == null
                                ? DBNull.Value
                                : searchText;

                        command.Parameters.Add(
                            "@onlyAvailable",
                            NpgsqlDbType.Boolean
                        ).Value = onlyAvailable;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new FederationExternalCreditItem
                                    {
                                        FederationExternalCreditId = GetInt(reader, "FederationExternalCreditId"),
                                        CompetitionId = GetInt(reader, "CompetitionId"),
                                        SourceType = GetString(reader, "SourceType"),
                                        ExternalReference = GetNullableString(reader, "ExternalReference"),
                                        ExternalName = GetNullableString(reader, "ExternalName"),
                                        ExternalClubName = GetNullableString(reader, "ExternalClubName"),
                                        ExternalIdNumber = GetNullableString(reader, "ExternalIdNumber"),
                                        OriginalAmount = GetDecimal(reader, "OriginalAmount"),
                                        UsedAmount = GetDecimal(reader, "UsedAmount"),
                                        AvailableAmount = GetDecimal(reader, "AvailableAmount"),
                                        CreditStatus = GetString(reader, "CreditStatus"),
                                        UsageStatusLabel = GetNullableString(reader, "UsageStatusLabel"),
                                        CreatedAt = GetDateTime(reader, "CreatedAt"),
                                        Notes = GetNullableString(reader, "Notes")
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

        public AllocateFederationCreditResponse AllocateFederationCreditToCharge(
            AllocateFederationCreditRequest request)
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
                    from public.usp_allocatefederationcredittocharge(
                        @federationExternalCreditId,
                        @billChargeId,
                        @allocatedAmount,
                        @allocatedBySystemUserId,
                        @notes
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add(
                            "@federationExternalCreditId",
                            NpgsqlDbType.Integer
                        ).Value = request.FederationExternalCreditId;

                        command.Parameters.Add(
                            "@billChargeId",
                            NpgsqlDbType.Integer
                        ).Value = request.BillChargeId;

                        command.Parameters.Add(
                            "@allocatedAmount",
                            NpgsqlDbType.Numeric
                        ).Value = request.AllocatedAmount;

                        command.Parameters.Add(
                            "@allocatedBySystemUserId",
                            NpgsqlDbType.Integer
                        ).Value = request.AllocatedBySystemUserId;

                        command.Parameters.Add(
                            "@notes",
                            NpgsqlDbType.Text
                        ).Value =
                            request.Notes == null
                                ? DBNull.Value
                                : request.Notes;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            if (reader.Read())
                            {
                                return new AllocateFederationCreditResponse
                                {
                                    FederationCreditAllocationId = GetInt(reader, "FederationCreditAllocationId"),
                                    FederationExternalCreditId = GetInt(reader, "FederationExternalCreditId"),
                                    BillChargeId = GetInt(reader, "BillChargeId"),
                                    EntryId = GetNullableInt(reader, "EntryId"),
                                    AllocatedAmount = GetDecimal(reader, "AllocatedAmount"),
                                    CreditUsedAmount = GetDecimal(reader, "CreditUsedAmount"),
                                    CreditAvailableAmount = GetDecimal(reader, "CreditAvailableAmount"),
                                    CreditStatus = GetString(reader, "CreditStatus"),
                                    BillChargeAmount = GetDecimal(reader, "BillChargeAmount"),
                                    BillChargeCoveredAmount = GetDecimal(reader, "BillChargeCoveredAmount"),
                                    BillChargeStatus = GetString(reader, "BillChargeStatus")
                                };
                            }
                        }
                    }
                }

                throw new Exception("Federation credit allocation was not created");
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<FederationCreditAllocationItem> GetFederationCreditAllocations(
            int federationExternalCreditId)
        {
            List<FederationCreditAllocationItem> items =
                new List<FederationCreditAllocationItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getfederationcreditallocations(
                        @federationExternalCreditId
                    );",
                            connection
                        )
                    )
                    {
                        command.Parameters.Add(
                            "@federationExternalCreditId",
                            NpgsqlDbType.Integer
                        ).Value = federationExternalCreditId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                items.Add(
                                    new FederationCreditAllocationItem
                                    {
                                        FederationCreditAllocationId = GetInt(reader, "FederationCreditAllocationId"),
                                        FederationExternalCreditId = GetInt(reader, "FederationExternalCreditId"),
                                        BillChargeId = GetInt(reader, "BillChargeId"),
                                        EntryId = GetNullableInt(reader, "EntryId"),
                                        AllocatedAmount = GetDecimal(reader, "AllocatedAmount"),
                                        AllocatedAt = GetDateTime(reader, "AllocatedAt"),
                                        AllocationNotes = GetNullableString(reader, "AllocationNotes"),

                                        BillId = GetInt(reader, "BillId"),
                                        PayerPersonId = GetInt(reader, "PaidByPersonId"),
                                        PayerFullName = GetString(reader, "PayerFullName"),

                                        RiderFederationMemberId = GetNullableInt(reader, "RiderFederationMemberId"),
                                        RiderFullName = GetNullableString(reader, "RiderFullName"),

                                        HorseId = GetNullableInt(reader, "HorseId"),
                                        HorseName = GetNullableString(reader, "HorseName"),

                                        ClassInCompId = GetNullableInt(reader, "ClassInCompId"),
                                        ClassName = GetNullableString(reader, "ClassName"),
                                        ClassDateTime = GetNullableDateTime(reader, "ClassDateTime"),

                                        BillChargeAmount = GetDecimal(reader, "BillChargeAmount"),
                                        BillChargeStatus = GetString(reader, "BillChargeStatus")
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

        public FederationCoverageStatusItem GetFederationCoverageStatusForPayer(
            int competitionId,
            int payerPersonId)
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
                    from public.usp_getfederationcoveragestatusforpayer(
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
                            if (reader.Read())
                            {
                                return new FederationCoverageStatusItem
                                {
                                    CompetitionId = GetInt(reader, "CompetitionId"),
                                    PayerPersonId = GetInt(reader, "PaidByPersonId"),
                                    PayerFullName = GetString(reader, "PayerFullName"),
                                    TotalFederationAmount = GetDecimal(reader, "TotalFederationAmount"),
                                    CoveredFederationAmount = GetDecimal(reader, "CoveredFederationAmount"),
                                    MissingFederationAmount = GetDecimal(reader, "MissingFederationAmount"),
                                    TotalChargesCount = GetInt(reader, "TotalChargesCount"),
                                    FullyCoveredChargesCount = GetInt(reader, "FullyCoveredChargesCount"),
                                    PartiallyCoveredChargesCount = GetInt(reader, "PartiallyCoveredChargesCount"),
                                    UncoveredChargesCount = GetInt(reader, "UncoveredChargesCount"),
                                    CoverageStatus = GetString(reader, "CoverageStatus")
                                };
                            }
                        }
                    }
                }

                throw new Exception("Federation coverage status was not found");
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<FederationChargeCoverageItem> GetFederationChargesForPayer(
            int competitionId,
            int payerPersonId)
        {
            List<FederationChargeCoverageItem> items =
                new List<FederationChargeCoverageItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (
                        NpgsqlCommand command = new NpgsqlCommand(
                            @"
                    select *
                    from public.usp_getfederationchargesforpayer(
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
                                    new FederationChargeCoverageItem
                                    {
                                        BillChargeId = GetInt(reader, "BillChargeId"),
                                        BillId = GetInt(reader, "BillId"),
                                        CompetitionId = GetInt(reader, "CompetitionId"),
                                        PayerPersonId = GetInt(reader, "PaidByPersonId"),
                                        PayerFullName = GetString(reader, "PayerFullName"),

                                        EntryId = GetInt(reader, "EntryId"),
                                        ClassInCompId = GetInt(reader, "ClassInCompId"),
                                        ClassName = GetString(reader, "ClassName"),
                                        ClassDateTime = GetNullableDateTime(reader, "ClassDateTime"),

                                        RiderFederationMemberId = GetNullableInt(reader, "RiderFederationMemberId"),
                                        RiderFullName = GetNullableString(reader, "RiderFullName"),

                                        HorseId = GetNullableInt(reader, "HorseId"),
                                        HorseName = GetNullableString(reader, "HorseName"),

                                        ChargeAmount = GetDecimal(reader, "ChargeAmount"),
                                        CoveredAmount = GetDecimal(reader, "CoveredAmount"),
                                        MissingAmount = GetDecimal(reader, "MissingAmount"),
                                        ChargeStatus = GetString(reader, "ChargeStatus"),
                                        CoverageStatus = GetString(reader, "CoverageStatus")
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

        public ValidateFederationCoverageResponse ValidateFederationCoverageBeforeOrganizerPayment(
            int competitionId,
            int payerPersonId)
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
                    from public.usp_validatefederationcoveragebeforeorganizerpayment(
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
                            if (reader.Read())
                            {
                                return new ValidateFederationCoverageResponse
                                {
                                    CanProceed = GetBool(reader, "CanProceed"),
                                    CompetitionId = GetInt(reader, "CompetitionId"),
                                    PayerPersonId = GetInt(reader, "PaidByPersonId"),
                                    PayerFullName = GetString(reader, "PayerFullName"),
                                    TotalFederationAmount = GetDecimal(reader, "TotalFederationAmount"),
                                    CoveredFederationAmount = GetDecimal(reader, "CoveredFederationAmount"),
                                    MissingFederationAmount = GetDecimal(reader, "MissingFederationAmount"),
                                    Message = GetString(reader, "Message")
                                };
                            }
                        }
                    }
                }

                throw new Exception("Federation validation response was not found");
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public FederationExcelImportResult ImportFederationExcelCredits(
    List<FederationExcelCreditImportRow> rows)
        {
            FederationExcelImportResult result = new FederationExcelImportResult();

            if (rows == null || rows.Count == 0)
            {
                result.Message = "לא נמצאו שורות לייבוא";
                return result;
            }

            result.TotalRows = rows.Count;

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    foreach (FederationExcelCreditImportRow row in rows)
                    {
                        try
                        {
                            if (row.OriginalAmount <= 0)
                            {
                                result.SkippedZeroAmountCount++;
                                continue;
                            }

                            bool exists = FederationExcelCreditExists(
                                connection,
                                row
                            );

                            if (exists)
                            {
                                result.SkippedDuplicatesCount++;
                                continue;
                            }

                            using (
                                NpgsqlCommand command = new NpgsqlCommand(
                                    @"
                            insert into public.federationexternalcredit
                            (
                                competitionid,
                                sourcetype,
                                externalreference,
                                externalname,
                                externalclubname,
                                externalidnumber,
                                originalamount,
                                usedamount,
                                availableamount,
                                creditstatus,
                                importfingerprint,
                                rawdatajson,
                                createdbysystemuserid,
                                notes
                            )
                            values
                            (
                                @competitionId,
                                @sourceType,
                                @externalReference,
                                @externalName,
                                @externalClubName,
                                @externalIdNumber,
                                @originalAmount,
                                0,
                                @originalAmount,
                                'Available',
                                @importFingerprint,
                                @rawDataJson::jsonb,
                                @createdBySystemUserId,
                                @notes
                            );",
                                    connection
                                )
                            )
                            {
                                command.Parameters.Add(
                                    "@competitionId",
                                    NpgsqlDbType.Integer
                                ).Value = row.CompetitionId;

                                command.Parameters.Add(
                                    "@sourceType",
                                    NpgsqlDbType.Text
                                ).Value = row.SourceType;

                                command.Parameters.Add(
                                    "@externalReference",
                                    NpgsqlDbType.Text
                                ).Value =
                                    row.ExternalReference == null
                                        ? DBNull.Value
                                        : row.ExternalReference;

                                command.Parameters.Add(
                                    "@externalName",
                                    NpgsqlDbType.Text
                                ).Value =
                                    row.ExternalName == null
                                        ? DBNull.Value
                                        : row.ExternalName;

                                command.Parameters.Add(
                                    "@externalClubName",
                                    NpgsqlDbType.Text
                                ).Value =
                                    row.ExternalClubName == null
                                        ? DBNull.Value
                                        : row.ExternalClubName;

                                command.Parameters.Add(
                                    "@externalIdNumber",
                                    NpgsqlDbType.Text
                                ).Value =
                                    row.ExternalIdNumber == null
                                        ? DBNull.Value
                                        : row.ExternalIdNumber;

                                command.Parameters.Add(
                                    "@originalAmount",
                                    NpgsqlDbType.Numeric
                                ).Value = row.OriginalAmount;

                                command.Parameters.Add(
                                    "@importFingerprint",
                                    NpgsqlDbType.Text
                                ).Value = row.ImportFingerprint;

                                command.Parameters.Add(
                                    "@rawDataJson",
                                    NpgsqlDbType.Jsonb
                                ).Value = string.IsNullOrWhiteSpace(row.RawDataJson)
                                    ? "{}"
                                    : row.RawDataJson;

                                command.Parameters.Add(
                                    "@createdBySystemUserId",
                                    NpgsqlDbType.Integer
                                ).Value = row.CreatedBySystemUserId;

                                command.Parameters.Add(
                                    "@notes",
                                    NpgsqlDbType.Text
                                ).Value =
                                    row.Notes == null
                                        ? DBNull.Value
                                        : row.Notes;

                                command.ExecuteNonQuery();

                                result.ImportedCreditsCount++;
                            }
                        }
                        catch (Exception ex)
                        {
                            result.FailedRowsCount++;

                            result.Errors.Add(
                                "שורה " + row.RowNumber + ": " + ex.Message
                            );
                        }
                    }
                }

                result.Message = "ייבוא אקסל התאחדות הסתיים בהצלחה";

                return result;
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        private static bool FederationExcelCreditExists(
    NpgsqlConnection connection,
    FederationExcelCreditImportRow row)
        {
            using (
                NpgsqlCommand command = new NpgsqlCommand(
                    @"
            select exists
            (
                select 1
                from public.federationexternalcredit fec
                where fec.competitionid = @competitionId
                  and fec.sourcetype = 'ExcelReceipt'
                  and
                  (
                      fec.importfingerprint = @importFingerprint
                      or
                      (
                          coalesce(fec.externalreference, '') =
                              coalesce(@externalReference, '')
                          and coalesce(fec.externalidnumber, '') =
                              coalesce(@externalIdNumber, '')
                          and fec.originalamount = @originalAmount
                      )
                  )
            );",
                    connection
                )
            )
            {
                command.Parameters.Add(
                    "@competitionId",
                    NpgsqlDbType.Integer
                ).Value = row.CompetitionId;

                command.Parameters.Add(
                    "@importFingerprint",
                    NpgsqlDbType.Text
                ).Value = row.ImportFingerprint;

                command.Parameters.Add(
                    "@externalReference",
                    NpgsqlDbType.Text
                ).Value =
                    row.ExternalReference == null
                        ? DBNull.Value
                        : row.ExternalReference;

                command.Parameters.Add(
                    "@externalIdNumber",
                    NpgsqlDbType.Text
                ).Value =
                    row.ExternalIdNumber == null
                        ? DBNull.Value
                        : row.ExternalIdNumber;

                command.Parameters.Add(
                    "@originalAmount",
                    NpgsqlDbType.Numeric
                ).Value = row.OriginalAmount;

                object result = command.ExecuteScalar()!;

                return Convert.ToBoolean(result);
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