using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.DAL
{
    public class EntryDAL : DBServices
    {
        // Builds the public.usp_insertentry call using explicit PostgreSQL named
        // argument notation, deliberately NOT the generic positional helper
        // CreateCommandWithStoredProcedure.
        //
        // WHY: that helper emits "SELECT * FROM fn(@p1, @p2, ...)" and binds
        // strictly by Dictionary insertion order - the dictionary keys only pick
        // an NpgsqlDbType, they never reach the SQL. The dictionary this method
        // used to build listed the payer sixth and the coach seventh, while the
        // live function takes p_coachfederationmemberid sixth and
        // p_paidbypersonid seventh, so the two were crossed on the wire: the
        // payer was written to servicerequest.coachfederationmemberid, and the
        // coach to bill.paidbypersonid and billcharge.paidbypersonid. Because
        // federationmember.federationmemberid is itself a person.personid
        // (fk_federationmember_person), every guard and foreign key still passed
        // whenever the payer happened to be a federation member, so the swap was
        // silent. A null coach additionally left p_paidbypersonid null, which
        // made the function raise 'Payer not found' and broke every no-coach
        // registration outright.
        //
        // Named arguments remove the dependency on argument order entirely. That
        // matters here specifically: this DAL's order never changed since it was
        // written - the deployed function's argument order was changed underneath
        // it - so an order-based fix would leave the same trap in place. Same
        // notation as PaidTimeRequestDAL.CreatePaidTimeRequest.
        //
        // public static (not private) so it can be unit tested with no database,
        // per the project convention used by PaidTimeRequest.BuildVerifiedApplyPlan
        // and PredictionService.ComputePrediction - instead of InternalsVisibleTo.
        public static NpgsqlCommand BuildInsertEntryCommand(
            CreateEntryRequest request,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand command = new NpgsqlCommand(@"
                SELECT public.usp_insertentry(
                    p_classincompid           := @classInCompId,
                    p_orderedbysystemuserid   := @orderedBySystemUserId,
                    p_ranchid                 := @ranchId,
                    p_horseid                 := @horseId,
                    p_riderfederationmemberid := @riderFederationMemberId,
                    p_coachfederationmemberid := @coachFederationMemberId,
                    p_paidbypersonid          := @paidByPersonId,
                    p_prizerecipientname      := @prizeRecipientName
                );", connection);

            command.Parameters.Add("@classInCompId", NpgsqlDbType.Integer).Value =
                request.ClassInCompId;

            command.Parameters.Add("@orderedBySystemUserId", NpgsqlDbType.Integer).Value =
                request.OrderedBySystemUserId;

            command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value =
                request.RanchId;

            command.Parameters.Add("@horseId", NpgsqlDbType.Integer).Value =
                request.HorseId;

            command.Parameters.Add("@riderFederationMemberId", NpgsqlDbType.Integer).Value =
                request.RiderFederationMemberId;

            // Nullable by design: the live function skips its coach existence
            // check when this argument is null, and the payer is unaffected.
            command.Parameters.Add("@coachFederationMemberId", NpgsqlDbType.Integer).Value =
                request.CoachFederationMemberId.HasValue
                    ? (object)request.CoachFederationMemberId.Value
                    : DBNull.Value;

            command.Parameters.Add("@paidByPersonId", NpgsqlDbType.Integer).Value =
                request.PaidByPersonId;

            // p_prizerecipientname is character varying in the live function.
            // Null stays null; an empty string is still sent as an empty string,
            // matching what the previous parameter builder did.
            command.Parameters.Add("@prizeRecipientName", NpgsqlDbType.Varchar).Value =
                (object?)request.PrizeRecipientName ?? DBNull.Value;

            return command;
        }

        public int InsertEntry(CreateEntryRequest request)
        {
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = BuildInsertEntryCommand(request, connection);

                object? result = command.ExecuteScalar();

                if (result == null || result == DBNull.Value)
                {
                    throw new Exception("Failed to create entry");
                }

                return Convert.ToInt32(result);
            }
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule/race guard raised inside usp_insertentry. Surface
                // its exact message to the user; the controller maps
                // ValidationException to 409 Conflict for this endpoint.
                throw new BL.ValidationException(ex.MessageText);
            }
        }

        // Stage B: builds the usp_admincreateentry call. Named-argument
        // notation, same reasoning as BuildInsertEntryCommand above -- never
        // the positional CreateCommandWithStoredProcedure helper for a new
        // proc with this many parameters. Public static for the same
        // no-database unit-testability reason.
        // personId is a separate parameter, deliberately not a field on
        // AdminCreateEntryRequest -- see that DTO's header comment.
        public static NpgsqlCommand BuildAdminCreateEntryCommand(
            AdminCreateEntryRequest request,
            int personId,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand command = new NpgsqlCommand(@"
                SELECT *
                FROM public.usp_admincreateentry(
                    p_operationid             := @operationId,
                    p_personid                := @personId,
                    p_competitionid           := @competitionId,
                    p_ranchid                 := @ranchId,
                    p_classincompid           := @classInCompId,
                    p_horseid                 := @horseId,
                    p_riderfederationmemberid := @riderFederationMemberId,
                    p_coachfederationmemberid := @coachFederationMemberId,
                    p_paidbypersonid          := @paidByPersonId,
                    p_prizerecipientname      := @prizeRecipientName
                );", connection);

            command.Parameters.Add("@operationId", NpgsqlDbType.Text).Value =
                request.OperationId;

            command.Parameters.Add("@personId", NpgsqlDbType.Integer).Value =
                personId;

            command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value =
                request.CompetitionId;

            command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value =
                request.RanchId;

            command.Parameters.Add("@classInCompId", NpgsqlDbType.Integer).Value =
                request.ClassInCompId;

            command.Parameters.Add("@horseId", NpgsqlDbType.Integer).Value =
                request.HorseId;

            command.Parameters.Add("@riderFederationMemberId", NpgsqlDbType.Integer).Value =
                request.RiderFederationMemberId;

            command.Parameters.Add("@coachFederationMemberId", NpgsqlDbType.Integer).Value =
                request.CoachFederationMemberId.HasValue
                    ? (object)request.CoachFederationMemberId.Value
                    : DBNull.Value;

            command.Parameters.Add("@paidByPersonId", NpgsqlDbType.Integer).Value =
                request.PaidByPersonId;

            command.Parameters.Add("@prizeRecipientName", NpgsqlDbType.Varchar).Value =
                (object?)request.PrizeRecipientName ?? DBNull.Value;

            return command;
        }

        public AdminCreateEntryResult AdminCreateEntry(AdminCreateEntryRequest request, int personId)
        {
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = BuildAdminCreateEntryCommand(request, personId, connection);

                using NpgsqlDataReader reader = command.ExecuteReader();

                if (!reader.Read())
                {
                    throw new Exception("usp_admincreateentry returned no row");
                }

                return new AdminCreateEntryResult
                {
                    ResultType = reader["resulttype"].ToString() ?? string.Empty,
                    EntryId = Convert.ToInt32(reader["entryid"]),
                    CreateEntryRequestId = reader["createentryrequestid"] == DBNull.Value
                        ? null
                        : Convert.ToInt32(reader["createentryrequestid"])
                };
            }
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule guard raised inside usp_admincreateentry
                // (idempotency mismatch, authorization failure, or any of the
                // reused usp_insertentry validations). Same convention as
                // InsertEntry above -- surfaced verbatim, mapped to 409 by
                // the controller.
                throw new BL.ValidationException(ex.MessageText);
            }
        }

        public List<PaidTimeCandidateItem> GetPaidTimeCandidatesByRanch(int competitionId, int ranchId)
        {
            List<PaidTimeCandidateItem> result = new List<PaidTimeCandidateItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT *
                        FROM public.usp_getpaidtimecandidatesbyranch(
                            p_competitionid := @competitionId,
                            p_ranchid       := @ranchId
                        );", connection))
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;
                        command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value = ranchId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                result.Add(new PaidTimeCandidateItem
                                {
                                    EntryId = Convert.ToInt32(reader["EntryId"]),
                                    ClassInCompId = Convert.ToInt32(reader["ClassInCompId"]),
                                    HorseId = Convert.ToInt32(reader["HorseId"]),
                                    HorseName = reader["HorseName"]?.ToString() ?? string.Empty,
                                    BarnName = reader["BarnName"] == DBNull.Value
                                        ? null
                                        : reader["BarnName"].ToString(),
                                    CoachFederationMemberId = Convert.ToInt32(reader["CoachFederationMemberId"]),
                                    CoachName = reader["CoachName"]?.ToString() ?? string.Empty,
                                    RiderFederationMemberId = Convert.ToInt32(reader["RiderFederationMemberId"]),
                                    RiderName = reader["RiderName"]?.ToString() ?? string.Empty,
                                    PaidByPersonId = Convert.ToInt32(reader["PaidByPersonId"]),
                                    PayerName = reader["PayerName"]?.ToString() ?? string.Empty
                                });
                            }
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }

            return result;
        }

        // HostSecretary Paid-Time creation (Slice B, 2026-08-07): additive
        // sibling of GetPaidTimeCandidatesByRanch above, which is shared with
        // the mobile RanchAdmin self-service flow and stays untouched. This
        // one is competition-scoped only, so a HostSecretary can create a
        // paid-time request on behalf of any participating ranch's
        // horse/rider/coach/payer combination.
        public List<PaidTimeCandidateForCompetitionItem> GetPaidTimeCandidatesForCompetition(int competitionId)
        {
            List<PaidTimeCandidateForCompetitionItem> result = new List<PaidTimeCandidateForCompetitionItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT *
                        FROM public.usp_getpaidtimecandidatesforcompetition(
                            p_competitionid := @competitionId
                        );", connection))
                    {
                        command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;

                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                result.Add(new PaidTimeCandidateForCompetitionItem
                                {
                                    EntryId = Convert.ToInt32(reader["EntryId"]),
                                    ClassInCompId = Convert.ToInt32(reader["ClassInCompId"]),
                                    HorseId = Convert.ToInt32(reader["HorseId"]),
                                    HorseName = reader["HorseName"]?.ToString() ?? string.Empty,
                                    BarnName = reader["BarnName"] == DBNull.Value
                                        ? null
                                        : reader["BarnName"].ToString(),
                                    RanchId = Convert.ToInt32(reader["RanchId"]),
                                    RanchName = reader["RanchName"]?.ToString() ?? string.Empty,
                                    CoachFederationMemberId = Convert.ToInt32(reader["CoachFederationMemberId"]),
                                    CoachName = reader["CoachName"]?.ToString() ?? string.Empty,
                                    RiderFederationMemberId = Convert.ToInt32(reader["RiderFederationMemberId"]),
                                    RiderName = reader["RiderName"]?.ToString() ?? string.Empty,
                                    PaidByPersonId = Convert.ToInt32(reader["PaidByPersonId"]),
                                    PayerName = reader["PayerName"]?.ToString() ?? string.Empty
                                });
                            }
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }

            return result;
        }

        public List<MyCompetitionEntryItem> GetMyCompetitionEntries(
    int competitionId,
    int orderedBySystemUserId)
        {
            List<MyCompetitionEntryItem> result =
                new List<MyCompetitionEntryItem>();

            try
            {
                using (NpgsqlConnection connection =
                       Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command =
                           new NpgsqlCommand(@"
                SELECT *
                FROM public.usp_getmycompetitionentries(
                    p_competitionid := @competitionId,
                    p_orderedbysystemuserid := @orderedBySystemUserId
                );", connection))
                    {
                        command.Parameters.Add(
                            "@competitionId",
                            NpgsqlDbType.Integer
                        ).Value = competitionId;

                        command.Parameters.Add(
                            "@orderedBySystemUserId",
                            NpgsqlDbType.Integer
                        ).Value = orderedBySystemUserId;

                        using (NpgsqlDataReader reader =
                               command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                result.Add(new MyCompetitionEntryItem
                                {
                                    EntryId =
                                        Convert.ToInt32(reader["entryid"]),

                                    ClassInCompId =
                                        Convert.ToInt32(reader["classincompid"]),

                                    ClassName =
                                        reader["classname"]?.ToString()
                                        ?? string.Empty,

                                    ClassDate =
                                        Convert.ToDateTime(reader["classdate"]),

                                    HorseName =
                                        reader["horsename"]?.ToString()
                                        ?? string.Empty,

                                    BarnName =
                                        reader["barnname"] == DBNull.Value
                                            ? null
                                            : reader["barnname"].ToString(),

                                    RiderName =
                                        reader["ridername"]?.ToString()
                                        ?? string.Empty,

                                    CoachName =
                                        reader["coachname"] == DBNull.Value
                                            ? null
                                            : reader["coachname"].ToString(),

                                    PayerName =
                                        reader["payername"]?.ToString()
                                        ?? string.Empty,

                                    PrizeRecipientName =
                                        reader["prizerecipientname"] == DBNull.Value
                                            ? null
                                            : reader["prizerecipientname"].ToString(),

                                    OrganizerCost =
                                        Convert.ToDecimal(reader["organizercost"]),

                                    FederationCost =
                                        Convert.ToDecimal(reader["federationcost"]),

                                    FineAmount =
                                        Convert.ToDecimal(reader["fineamount"]),

                                    AmountToPay =
                                        Convert.ToDecimal(reader["amounttopay"]),

                                    IsPaid =
                                        Convert.ToBoolean(reader["ispaid"]),

                                    DrawOrder =
                                        reader["draworder"] == DBNull.Value
                                            ? null
                                            : Convert.ToInt16(reader["draworder"]),

                                    CreatedAt =
                                        Convert.ToDateTime(reader["createdat"]),

                                    HorseId =
                                        Convert.ToInt32(reader["horseid"]),

                                    RiderFederationMemberId =
                                        Convert.ToInt32(
                                            reader["riderfederationmemberid"]
                                        ),

                                    CoachFederationMemberId =
                                        reader["coachfederationmemberid"] == DBNull.Value
                                            ? null
                                            : Convert.ToInt32(
                                                reader["coachfederationmemberid"]
                                            )
                                });
                            }
                        }
                    }

                    LoadMyCompetitionEntryStatusFlags(
                        connection,
                        competitionId,
                        orderedBySystemUserId,
                        result
                    );
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(
                    $"Database error: {ex.Message}"
                );
            }

            return result;
        }

        private void LoadMyCompetitionEntryStatusFlags(
            NpgsqlConnection connection,
            int competitionId,
            int orderedBySystemUserId,
            List<MyCompetitionEntryItem> entries)
        {
            if (entries == null || entries.Count == 0)
            {
                return;
            }

            Dictionary<int, MyCompetitionEntryItem> byId =
                entries.ToDictionary(e => e.EntryId);

            try
            {
                using NpgsqlCommand command = new NpgsqlCommand(@"
                    SELECT *
                    FROM public.usp_getmycompetitionentrystatusflags(
                        p_competitionid := @competitionId,
                        p_orderedbysystemuserid := @orderedBySystemUserId
                    );", connection);

                command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value =
                    competitionId;
                command.Parameters.Add("@orderedBySystemUserId", NpgsqlDbType.Integer).Value =
                    orderedBySystemUserId;

                using NpgsqlDataReader reader = command.ExecuteReader();
                while (reader.Read())
                {
                    int entryId = Convert.ToInt32(reader["entryid"]);

                    if (!byId.TryGetValue(entryId, out MyCompetitionEntryItem? item) ||
                        item == null)
                    {
                        continue;
                    }

                    item.EntryStatus =
                        reader["entrystatus"] == DBNull.Value
                            ? "Active"
                            : reader["entrystatus"].ToString() ?? "Active";

                    item.IsCancelledAfterStart =
                        reader["iscancelledafterstart"] != DBNull.Value &&
                        Convert.ToBoolean(reader["iscancelledafterstart"]);

                    item.HasPendingCancellation =
                        reader["haspendingcancellation"] != DBNull.Value &&
                        Convert.ToBoolean(reader["haspendingcancellation"]);

                    item.HasPendingChange =
                        reader["haspendingchange"] != DBNull.Value &&
                        Convert.ToBoolean(reader["haspendingchange"]);
                }
            }
            catch (PostgresException pgEx) when (pgEx.SqlState == "42883")
            {
                // Companion SP not yet deployed in Supabase — keep DTO defaults
                // (Active / false). Card UI shows no status badge, normal price,
                // edit/cancel buttons active. Run 136_usp_GetMyCompetitionEntries_AddStatusFlags.sql
                // in Supabase to activate the feature.
            }
        }

        public List<PastCompetitionWithEntriesItem> GetMyPastCompetitionsWithEntries(
            int orderedBySystemUserId,
            int excludeCompetitionId)
        {
            List<PastCompetitionWithEntriesItem> result =
                new List<PastCompetitionWithEntriesItem>();

            try
            {
                using NpgsqlConnection connection = Connect("DefaultConnection");
                connection.Open();

                using NpgsqlCommand command = new NpgsqlCommand(@"
                    SELECT *
                    FROM public.usp_getmypastcompetitionswithentries(
                        p_orderedbysystemuserid := @orderedBySystemUserId,
                        p_excludecompetitionid  := @excludeCompetitionId
                    );", connection);

                command.Parameters.Add("@orderedBySystemUserId", NpgsqlDbType.Integer).Value =
                    orderedBySystemUserId;
                command.Parameters.Add("@excludeCompetitionId", NpgsqlDbType.Integer).Value =
                    excludeCompetitionId;

                using NpgsqlDataReader reader = command.ExecuteReader();
                while (reader.Read())
                {
                    result.Add(new PastCompetitionWithEntriesItem
                    {
                        CompetitionId = Convert.ToInt32(reader["competitionid"]),
                        CompetitionName = reader["competitionname"]?.ToString() ?? string.Empty,
                        CompetitionStartDate = Convert.ToDateTime(reader["competitionstartdate"]),
                        CompetitionEndDate = Convert.ToDateTime(reader["competitionenddate"]),
                        HostRanchName = reader["hostranchname"]?.ToString() ?? string.Empty,
                        EntryCount = Convert.ToInt32(reader["entrycount"])
                    });
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }

            return result;
        }

        public List<DuplicatableEntryItem> GetDuplicatableEntriesFromCompetition(
            int sourceCompetitionId,
            int targetCompetitionId,
            int orderedBySystemUserId)
        {
            List<DuplicatableEntryItem> result = new List<DuplicatableEntryItem>();

            try
            {
                using NpgsqlConnection connection = Connect("DefaultConnection");
                connection.Open();

                using NpgsqlCommand command = new NpgsqlCommand(@"
                    SELECT *
                    FROM public.usp_getduplicatableentriesfromcompetition(
                        p_sourcecompetitionid   := @sourceCompetitionId,
                        p_targetcompetitionid   := @targetCompetitionId,
                        p_orderedbysystemuserid := @orderedBySystemUserId
                    );", connection);

                command.Parameters.Add("@sourceCompetitionId", NpgsqlDbType.Integer).Value =
                    sourceCompetitionId;
                command.Parameters.Add("@targetCompetitionId", NpgsqlDbType.Integer).Value =
                    targetCompetitionId;
                command.Parameters.Add("@orderedBySystemUserId", NpgsqlDbType.Integer).Value =
                    orderedBySystemUserId;

                using NpgsqlDataReader reader = command.ExecuteReader();
                while (reader.Read())
                {
                    result.Add(new DuplicatableEntryItem
                    {
                        SourceEntryId = Convert.ToInt32(reader["sourceentryid"]),
                        SourceClassInCompId = Convert.ToInt32(reader["sourceclassincompid"]),
                        SourceClassName = reader["sourceclassname"]?.ToString() ?? string.Empty,
                        SourceClassDate = reader["sourceclassdate"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["sourceclassdate"]),

                        TargetClassInCompId = reader["targetclassincompid"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["targetclassincompid"]),
                        TargetClassName = reader["targetclassname"] == DBNull.Value
                            ? null
                            : reader["targetclassname"].ToString(),
                        TargetClassDate = reader["targetclassdate"] == DBNull.Value
                            ? null
                            : Convert.ToDateTime(reader["targetclassdate"]),

                        HorseId = Convert.ToInt32(reader["horseid"]),
                        HorseName = reader["horsename"]?.ToString() ?? string.Empty,
                        BarnName = reader["barnname"] == DBNull.Value
                            ? null
                            : reader["barnname"].ToString(),

                        RiderFederationMemberId = Convert.ToInt32(reader["riderfederationmemberid"]),
                        RiderName = reader["ridername"]?.ToString() ?? string.Empty,

                        CoachFederationMemberId = reader["coachfederationmemberid"] == DBNull.Value
                            ? null
                            : Convert.ToInt32(reader["coachfederationmemberid"]),
                        CoachName = reader["coachname"] == DBNull.Value
                            ? null
                            : reader["coachname"].ToString(),

                        PaidByPersonId = Convert.ToInt32(reader["paidbypersonid"]),
                        PayerName = reader["payername"]?.ToString() ?? string.Empty,

                        PrizeRecipientName = reader["prizerecipientname"] == DBNull.Value
                            ? null
                            : reader["prizerecipientname"].ToString(),

                        AlreadyExists = reader["alreadyexists"] != DBNull.Value &&
                            Convert.ToBoolean(reader["alreadyexists"])
                    });
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }

            return result;
        }

        public List<SecretaryCompetitionEntryItem> GetSecretaryCompetitionEntries(int competitionId)
        {
            List<SecretaryCompetitionEntryItem> result =
                new List<SecretaryCompetitionEntryItem>();

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    Dictionary<string, object> paramDic =
                        new Dictionary<string, object>
                        {
                    { "@p_competitionid", competitionId }
                        };

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_getsecretarycompetitionentries",
                        connection,
                        paramDic))
                    {
                        using (NpgsqlDataReader reader = command.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                result.Add(new SecretaryCompetitionEntryItem
                                {
                                    EntryId = Convert.ToInt32(reader["entryid"]),

                                    ClassInCompId = Convert.ToInt32(reader["classincompid"]),

                                    CompetitionId = Convert.ToInt32(reader["competitionid"]),

                                    ClassName = reader["classname"]?.ToString()
                                        ?? string.Empty,

                                    ClassDate = reader["classdate"] == DBNull.Value
                                        ? null
                                        : Convert.ToDateTime(reader["classdate"]),

                                    StartTime = reader["starttime"] == DBNull.Value
                                        ? null
                                        : (TimeSpan?)reader["starttime"],

                                    OrderInDay = reader["orderinday"] == DBNull.Value
                                        ? null
                                        : Convert.ToInt16(reader["orderinday"]),

                                    DrawOrder = reader["draworder"] == DBNull.Value
                                        ? null
                                        : Convert.ToInt16(reader["draworder"]),

                                    HorseId = Convert.ToInt32(reader["horseid"]),

                                    HorseName = reader["horsename"]?.ToString()
                                        ?? string.Empty,

                                    BarnName = reader["barnname"] == DBNull.Value
                                        ? null
                                        : reader["barnname"].ToString(),

                                    HorseRanchId = Convert.ToInt32(reader["horseranchid"]),

                                    RiderFederationMemberId =
                                        Convert.ToInt32(reader["riderfederationmemberid"]),

                                    RiderName = reader["ridername"]?.ToString()
                                        ?? string.Empty,

                                    CoachFederationMemberId =
                                        reader["coachfederationmemberid"] == DBNull.Value
                                            ? null
                                            : Convert.ToInt32(reader["coachfederationmemberid"]),

                                    CoachName = reader["coachname"] == DBNull.Value
                                        ? null
                                        : reader["coachname"].ToString(),

                                    PaidByPersonId =
                                        Convert.ToInt32(reader["paidbypersonid"]),

                                    PayerName = reader["payername"]?.ToString()
                                        ?? string.Empty,

                                    PrizeRecipientName =
                                        reader["prizerecipientname"] == DBNull.Value
                                            ? null
                                            : reader["prizerecipientname"].ToString(),

                                    OrganizerCost =
                                        Convert.ToDecimal(reader["organizercost"]),

                                    FederationCost =
                                        Convert.ToDecimal(reader["federationcost"]),

                                    FineAmount =
                                        Convert.ToDecimal(reader["fineamount"]),

                                    AmountToPay =
                                        Convert.ToDecimal(reader["amounttopay"]),

                                    IsPaid =
                                        Convert.ToBoolean(reader["ispaid"]),

                                    CreatedAt =
                                        Convert.ToDateTime(reader["createdat"]),

                                    OrderedBySystemUserId =
                                        Convert.ToInt32(reader["orderedbysystemuserid"]),

                                    BillId =
                                        Convert.ToInt32(reader["billid"]),

                                    EntryStatus =
                                        reader["entrystatus"] == DBNull.Value
                                            ? "Active"
                                            : reader["entrystatus"].ToString() ?? "Active",

                                    IsCancelledAfterStart =
                                        reader["iscancelledafterstart"] != DBNull.Value &&
                                        Convert.ToBoolean(reader["iscancelledafterstart"])
                                });
                            }
                        }
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }

            return result;
        }

        public void UpdateClassEntriesDrawOrder(
           UpdateClassEntriesDrawOrderRequest request)
        {
            if (request.Entries == null || request.Entries.Count == 0)
            {
                throw new Exception("Entries list is empty");
            }

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    string entriesJson = System.Text.Json.JsonSerializer.Serialize(
                        request.Entries.Select(item => new
                        {
                            entryId = item.EntryId,
                            drawOrder = item.DrawOrder
                        })
                    );

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                            SELECT public.usp_updateclassentriesdraworder(
                                p_competitionid := @competitionId,
                                p_classincompid := @classInCompId,
                                p_entries       := @entries::jsonb
                            );", connection))
                    {
                        command.Parameters.Add(
                            "@competitionId",
                            NpgsqlDbType.Integer
                        ).Value = request.CompetitionId;

                        command.Parameters.Add(
                            "@classInCompId",
                            NpgsqlDbType.Integer
                        ).Value = request.ClassInCompId;

                        command.Parameters.Add(
                            "@entries",
                            NpgsqlDbType.Jsonb
                        ).Value = entriesJson;

                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateGroupEntriesDrawOrder(
          UpdateGroupEntriesDrawOrderRequest request)
        {
            if (request.Entries == null || request.Entries.Count == 0)
            {
                throw new Exception("Entries list is empty");
            }

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    string entriesJson = System.Text.Json.JsonSerializer.Serialize(
                        request.Entries.Select(item => new
                        {
                            entryId = item.EntryId,
                            drawOrder = item.DrawOrder
                        })
                    );

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                        SELECT public.usp_updategroupentriesdraworder(
                            p_competitionid := @competitionId,
                            p_classdate     := @classDate,
                            p_orderinday    := @orderInDay,
                            p_entries       := @entries
                        );", connection))
                    {
                        command.Parameters.Add(
                            "@competitionId",
                            NpgsqlDbType.Integer
                        ).Value = request.CompetitionId;

                        command.Parameters.Add(
                            "@classDate",
                            NpgsqlDbType.Date
                        ).Value = request.ClassDate.Date;

                        command.Parameters.Add(
                            "@orderInDay",
                            NpgsqlDbType.Smallint
                        ).Value = request.OrderInDay;

                        command.Parameters.Add(
                            "@entries",
                            NpgsqlDbType.Jsonb
                        ).Value = entriesJson;

                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void ClearGroupEntriesDrawOrder(
    ClearGroupEntriesDrawOrderRequest request)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = new NpgsqlCommand(@"
                SELECT public.usp_cleargroupentriesdraworder(
                    p_competitionid := @competitionId,
                    p_classdate     := @classDate,
                    p_orderinday    := @orderInDay
                );", connection))
                    {
                        command.Parameters.Add(
                            "@competitionId",
                            NpgsqlDbType.Integer
                        ).Value = request.CompetitionId;

                        command.Parameters.Add(
                            "@classDate",
                            NpgsqlDbType.Date
                        ).Value = request.ClassDate.Date;

                        command.Parameters.Add(
                            "@orderInDay",
                            NpgsqlDbType.Smallint
                        ).Value = request.OrderInDay;

                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int SecretaryDeleteEntry(int entryId, int secretarySystemUserId)
        {
            try
            {
                using NpgsqlConnection connection = Connect("DefaultConnection");
                connection.Open();

                using NpgsqlCommand command = new NpgsqlCommand(@"
                    SELECT public.usp_secretarydeleteentry(
                        p_entryid               := @entryId,
                        p_secretarysystemuserid := @secretaryId
                    );", connection);

                command.Parameters.Add("@entryId", NpgsqlDbType.Integer).Value = entryId;
                command.Parameters.Add("@secretaryId", NpgsqlDbType.Integer).Value = secretarySystemUserId;

                object? result = command.ExecuteScalar();
                if (result == null || result == DBNull.Value)
                {
                    throw new Exception("Failed to delete entry");
                }
                return Convert.ToInt32(result);
            }
            catch (PostgresException ex) when (ex.SqlState == "P0001")
            {
                // Business-rule/authorization guard raised inside
                // usp_secretarydeleteentry. The proc has no custom ERRCODE,
                // so Postgres's default RAISE EXCEPTION SQLSTATE (P0001) is
                // what's actually thrown -- same convention the RN001
                // siblings elsewhere in this file use. Message text is in
                // English at the DB layer; translate the known guard
                // phrases before surfacing them to the (Hebrew) UI.
                throw new BL.ValidationException(TranslateSecretaryDeleteEntryError(ex.MessageText));
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        // Fixed, exhaustive translation of usp_secretarydeleteentry's known
        // English guard messages. Anything unrecognized (including the
        // internal-invariant "Multiple Federation entry charges..." message,
        // which is a data-integrity signal, not a user-actionable business
        // rule) falls to the generic line rather than leaking English or an
        // internal detail to the secretary.
        private static string TranslateSecretaryDeleteEntryError(string message)
        {
            switch (message)
            {
                case "Entry not found":
                    return "ההרשמה לא נמצאה";
                case "Permission denied: not the host ranch secretary":
                    return "אין לך הרשאה לבצע פעולה זו";
                case "Entry already cancelled":
                    return "ההרשמה כבר בוטלה";
                case "A pending change request exists for this entry — resolve it first":
                    return "קיימת בקשת שינוי ממתינה עבור הרשמה זו — יש לטפל בה תחילה";
                case "Cannot delete a paid entry":
                    return "לא ניתן למחוק הרשמה ששולמה";
                default:
                    return "לא ניתן לבטל את ההרשמה";
            }
        }

        // Stage C: builds the usp_admineditentry call. Named-argument
        // notation, same reasoning as BuildInsertEntryCommand /
        // BuildAdminCreateEntryCommand above. Public static for the same
        // no-database unit-testability reason. personId is a separate
        // parameter, deliberately not a field on AdminEditEntryRequest --
        // see that DTO's header comment.
        public static NpgsqlCommand BuildAdminEditEntryCommand(
            AdminEditEntryRequest request,
            int personId,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand command = new NpgsqlCommand(@"
                SELECT *
                FROM public.usp_admineditentry(
                    p_personid                := @personId,
                    p_entryid                 := @entryId,
                    p_competitionid           := @competitionId,
                    p_ranchid                 := @ranchId,
                    p_classincompid           := @classInCompId,
                    p_horseid                 := @horseId,
                    p_riderfederationmemberid := @riderFederationMemberId,
                    p_coachfederationmemberid := @coachFederationMemberId,
                    p_prizerecipientname      := @prizeRecipientName
                );", connection);

            command.Parameters.Add("@personId", NpgsqlDbType.Integer).Value =
                personId;

            command.Parameters.Add("@entryId", NpgsqlDbType.Integer).Value =
                request.EntryId;

            command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value =
                request.CompetitionId;

            command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value =
                request.RanchId;

            command.Parameters.Add("@classInCompId", NpgsqlDbType.Integer).Value =
                request.ClassInCompId;

            command.Parameters.Add("@horseId", NpgsqlDbType.Integer).Value =
                request.HorseId;

            command.Parameters.Add("@riderFederationMemberId", NpgsqlDbType.Integer).Value =
                request.RiderFederationMemberId;

            command.Parameters.Add("@coachFederationMemberId", NpgsqlDbType.Integer).Value =
                request.CoachFederationMemberId.HasValue
                    ? (object)request.CoachFederationMemberId.Value
                    : DBNull.Value;

            command.Parameters.Add("@prizeRecipientName", NpgsqlDbType.Varchar).Value =
                (object?)request.PrizeRecipientName ?? DBNull.Value;

            return command;
        }

        public AdminEditEntryResult AdminEditEntry(AdminEditEntryRequest request, int personId)
        {
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = BuildAdminEditEntryCommand(request, personId, connection);

                using NpgsqlDataReader reader = command.ExecuteReader();

                if (!reader.Read())
                {
                    throw new Exception("usp_admineditentry returned no row");
                }

                return new AdminEditEntryResult
                {
                    ResultType = reader["resulttype"].ToString() ?? string.Empty,
                    EntryId = Convert.ToInt32(reader["entryid"]),
                    ChangeEntryRequestId = reader["changeentryrequestid"] == DBNull.Value
                        ? null
                        : Convert.ToInt32(reader["changeentryrequestid"])
                };
            }
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule/authorization guard raised inside
                // usp_admineditentry. Same convention as AdminCreateEntry
                // above -- surfaced verbatim, mapped to 409 by the controller.
                throw new BL.ValidationException(ex.MessageText);
            }
        }

        // Stage C: builds the usp_admincancelentry call. No request DTO --
        // route/query-param shape, same convention as SecretaryDeleteEntry
        // above.
        public static NpgsqlCommand BuildAdminCancelEntryCommand(
            int entryId,
            int personId,
            int competitionId,
            int ranchId,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand command = new NpgsqlCommand(@"
                SELECT *
                FROM public.usp_admincancelentry(
                    p_personid      := @personId,
                    p_entryid       := @entryId,
                    p_competitionid := @competitionId,
                    p_ranchid       := @ranchId
                );", connection);

            command.Parameters.Add("@personId", NpgsqlDbType.Integer).Value = personId;
            command.Parameters.Add("@entryId", NpgsqlDbType.Integer).Value = entryId;
            command.Parameters.Add("@competitionId", NpgsqlDbType.Integer).Value = competitionId;
            command.Parameters.Add("@ranchId", NpgsqlDbType.Integer).Value = ranchId;

            return command;
        }

        public AdminCancelEntryResult AdminCancelEntry(int entryId, int personId, int competitionId, int ranchId)
        {
            try
            {
                using var connection = Connect("DefaultConnection");
                connection.Open();

                using var command = BuildAdminCancelEntryCommand(entryId, personId, competitionId, ranchId, connection);

                using NpgsqlDataReader reader = command.ExecuteReader();

                if (!reader.Read())
                {
                    throw new Exception("usp_admincancelentry returned no row");
                }

                return new AdminCancelEntryResult
                {
                    ChangeEntryRequestId = Convert.ToInt32(reader["changeentryrequestid"]),
                    EntryStatus = reader["entrystatus"].ToString() ?? string.Empty
                };
            }
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule/authorization guard raised inside
                // usp_admincancelentry (or the 219/221 procs it composes
                // with). Same convention as AdminEditEntry above.
                throw new BL.ValidationException(ex.MessageText);
            }
        }

    }
}