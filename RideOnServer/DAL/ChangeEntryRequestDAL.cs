using Npgsql;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ChangeEntryRequest;

namespace RideOnServer.DAL
{
    public class ChangeEntryRequestDAL : DBServices
    {
        // Named PostgreSQL argument notation (p_x := @x), not the positional
        // Dictionary/CreateCommandWithStoredProcedure helper - that helper binds
        // strictly by Dictionary insertion order and has already caused a real,
        // silent parameter-cross in this codebase (see EntryDAL.BuildInsertEntryCommand's
        // header and RideOnServer.Tests/EntryDalInsertEntryCommandTests.cs). This
        // mirrors that same builder-method pattern (and the style
        // CancelEntryByPayer, below, already uses) so command construction can be
        // unit tested with a null connection, with no DB access required.
        //
        // Calls the SECURED mutation function only (usp_insertchangeentryrequestsecured,
        // 219). The old 6-argument public.usp_insertchangeentryrequest (213) is
        // deliberately left untouched and uncalled from here - see 213's own
        // header and 219's header for why it stays deployed for now.
        public static NpgsqlCommand BuildInsertChangeEntryRequestSecuredCommand(
            int originalEntryId,
            int? newEntryId,
            bool isCancelled,
            int? fineId,
            decimal? fineAmountSnapshot,
            int personId,
            int competitionId,
            NpgsqlConnection? connection
        )
        {
            NpgsqlCommand command = new NpgsqlCommand(@"
                SELECT public.usp_insertchangeentryrequestsecured(
                    originalentryid_param    := @originalEntryId,
                    newentryid_param         := @newEntryId,
                    status_param             := @status,
                    iscancelled_param        := @isCancelled,
                    fineid_param             := @fineId,
                    fineamountsnapshot_param := @fineAmountSnapshot,
                    personid_param           := @personId,
                    competitionid_param      := @competitionId
                );", connection);

            command.Parameters.Add("@originalEntryId", NpgsqlTypes.NpgsqlDbType.Integer).Value = originalEntryId;

            command.Parameters.Add("@newEntryId", NpgsqlTypes.NpgsqlDbType.Integer).Value =
                newEntryId == null ? DBNull.Value : newEntryId;

            command.Parameters.Add("@status", NpgsqlTypes.NpgsqlDbType.Text).Value = "Pending";

            command.Parameters.Add("@isCancelled", NpgsqlTypes.NpgsqlDbType.Boolean).Value = isCancelled;

            command.Parameters.Add("@fineId", NpgsqlTypes.NpgsqlDbType.Integer).Value =
                fineId == null ? DBNull.Value : fineId;

            command.Parameters.Add("@fineAmountSnapshot", NpgsqlTypes.NpgsqlDbType.Numeric).Value =
                fineAmountSnapshot == null ? DBNull.Value : fineAmountSnapshot;

            command.Parameters.Add("@personId", NpgsqlTypes.NpgsqlDbType.Integer).Value = personId;

            command.Parameters.Add("@competitionId", NpgsqlTypes.NpgsqlDbType.Integer).Value = competitionId;

            return command;
        }

        public int InsertChangeEntryRequest(
            int originalEntryId,
            int? newEntryId,
            bool isCancelled,
            int? fineId,
            decimal? fineAmountSnapshot,
            int personId,
            int competitionId
        )
        {
            try
            {
                using NpgsqlConnection connection = Connect("DefaultConnection");
                connection.Open();

                using NpgsqlCommand command = BuildInsertChangeEntryRequestSecuredCommand(
                    originalEntryId,
                    newEntryId,
                    isCancelled,
                    fineId,
                    fineAmountSnapshot,
                    personId,
                    competitionId,
                    connection
                );

                object result = command.ExecuteScalar()!;

                return Convert.ToInt32(result);
            }
            catch (PostgresException ex) when (ex.SqlState == "RN001")
            {
                // Business-rule/race guard raised inside usp_insertchangeentryrequestsecured.
                // Surface its exact message to the user; the controller maps
                // ValidationException to 409 Conflict for this endpoint.
                throw new BL.ValidationException(ex.MessageText);
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        // Same builder-method pattern as above, for the read-only lookup (218).
        public static NpgsqlCommand BuildGetAuthorizationContextCommand(
            int originalEntryId,
            int? newEntryId,
            int competitionId,
            int personId,
            NpgsqlConnection? connection
        )
        {
            NpgsqlCommand command = new NpgsqlCommand(@"
                SELECT *
                FROM public.usp_getchangeentryrequestauthorizationcontext(
                    p_originalentryid := @originalEntryId,
                    p_newentryid      := @newEntryId,
                    p_competitionid   := @competitionId,
                    p_personid        := @personId
                );", connection);

            command.Parameters.Add("@originalEntryId", NpgsqlTypes.NpgsqlDbType.Integer).Value = originalEntryId;

            command.Parameters.Add("@newEntryId", NpgsqlTypes.NpgsqlDbType.Integer).Value =
                newEntryId == null ? DBNull.Value : newEntryId;

            command.Parameters.Add("@competitionId", NpgsqlTypes.NpgsqlDbType.Integer).Value = competitionId;

            command.Parameters.Add("@personId", NpgsqlTypes.NpgsqlDbType.Integer).Value = personId;

            return command;
        }

        // Read-only authorization facts for POST /api/ChangeEntryRequests, sourced
        // from usp_getchangeentryrequestauthorizationcontext (218). Always returns
        // exactly one row (see 218's own header for why), so ExecuteReader here
        // will always find a row for a well-formed call.
        public ChangeEntryRequestAuthorizationContext GetAuthorizationContext(
            int originalEntryId,
            int? newEntryId,
            int competitionId,
            int personId
        )
        {
            try
            {
                using NpgsqlConnection connection = Connect("DefaultConnection");
                connection.Open();

                using NpgsqlCommand command = BuildGetAuthorizationContextCommand(
                    originalEntryId,
                    newEntryId,
                    competitionId,
                    personId,
                    connection
                );

                using NpgsqlDataReader reader = command.ExecuteReader();

                if (!reader.Read())
                {
                    throw new Exception("Authorization context query returned no rows");
                }

                return new ChangeEntryRequestAuthorizationContext
                {
                    EntryExists = Convert.ToBoolean(reader["entryexists"]),
                    ActualCompetitionId = reader["actualcompetitionid"] == DBNull.Value
                        ? null
                        : Convert.ToInt32(reader["actualcompetitionid"]),
                    HostRanchId = reader["hostranchid"] == DBNull.Value
                        ? null
                        : Convert.ToInt32(reader["hostranchid"]),
                    CompetitionEndDate = reader["competitionenddate"] == DBNull.Value
                        ? null
                        : Convert.ToDateTime(reader["competitionenddate"]),
                    IsCompetitionEnded = Convert.ToBoolean(reader["iscompetitionended"]),
                    IsRanchAdminInHostRanch = Convert.ToBoolean(reader["isranchadmininhostranch"]),
                    IsCreatedByAdmin = Convert.ToBoolean(reader["iscreatedbyadmin"]),
                    IsOwnedThroughManagedPayer = Convert.ToBoolean(reader["isownedthroughmanagedpayer"]),
                    IsWithinModelCScope = Convert.ToBoolean(reader["iswithinmodelcscope"]),
                    NewEntryExists = Convert.ToBoolean(reader["newentryexists"]),
                    NewEntryCompetitionId = reader["newentrycompetitionid"] == DBNull.Value
                        ? null
                        : Convert.ToInt32(reader["newentrycompetitionid"]),
                    NewEntryHostRanchId = reader["newentryhostranchid"] == DBNull.Value
                        ? null
                        : Convert.ToInt32(reader["newentryhostranchid"]),
                    NewEntryCreatedByAdmin = Convert.ToBoolean(reader["newentrycreatedbyadmin"])
                };
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public int CancelEntryByPayer(int entryId, int payerPersonId)
        {
            try
            {
                using NpgsqlConnection connection = Connect("DefaultConnection");
                connection.Open();

                using NpgsqlCommand command = new NpgsqlCommand(@"
                    SELECT public.usp_cancelentrybypayer(
                        p_entryid       := @entryId,
                        p_payerpersonid := @payerPersonId
                    );", connection);

                command.Parameters.Add("@entryId", NpgsqlTypes.NpgsqlDbType.Integer).Value = entryId;
                command.Parameters.Add("@payerPersonId", NpgsqlTypes.NpgsqlDbType.Integer).Value = payerPersonId;

                object? result = command.ExecuteScalar();

                if (result == null || result == DBNull.Value)
                {
                    throw new Exception("Failed to create payer cancel request");
                }

                return Convert.ToInt32(result);
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }
    }
}