using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.DAL
{
    public class EntryDAL : DBServices
    {
        public int InsertEntry(CreateEntryRequest request)
        {
            var paramDic = new Dictionary<string, object?>
            {
                { "@p_classincompid", request.ClassInCompId },
                { "@p_orderedbysystemuserid", request.OrderedBySystemUserId },
                { "@p_ranchid", request.RanchId },
                { "@p_horseid", request.HorseId },
                { "@p_riderfederationmemberid", request.RiderFederationMemberId },
                { "@p_paidbypersonid", request.PaidByPersonId },
                { "@p_coachfederationmemberid", request.CoachFederationMemberId },
                { "@p_prizerecipientname", request.PrizeRecipientName }
            };

            using var connection = Connect("DefaultConnection");
            connection.Open();

            using var command = CreateCommandWithStoredProcedure(
                "usp_insertentry",
                connection,
                paramDic
            );

            object? result = command.ExecuteScalar();

            if (result == null || result == DBNull.Value)
            {
                throw new Exception("Failed to create entry");
            }

            return Convert.ToInt32(result);
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



    }
}