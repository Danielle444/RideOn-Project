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
                                        Convert.ToInt32(reader["billid"])
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
    }
}