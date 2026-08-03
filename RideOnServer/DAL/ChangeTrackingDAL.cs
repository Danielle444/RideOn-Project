using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.ChangeTracking;

namespace RideOnServer.DAL
{
    public class ChangeTrackingDAL : DBServices
    {
        public List<SecretaryChangeRequestItem>
            GetSecretaryCompetitionChangeRequests(
                int competitionId,
                int ranchId,
                string? status)
        {
            List<SecretaryChangeRequestItem> items =
                new List<SecretaryChangeRequestItem>();

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
                                from public.usp_getsecretarycompetitionchangerequests(
                                    @competitionId,
                                    @ranchId,
                                    @status
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

                        command.Parameters.Add(
                            "@status",
                            NpgsqlDbType.Text
                        ).Value =
                            string.IsNullOrWhiteSpace(status)
                                ? DBNull.Value
                                : status;

                        using (
                            NpgsqlDataReader reader =
                                command.ExecuteReader()
                        )
                        {
                            while (reader.Read())
                            {
                                SecretaryChangeRequestItem item =
                                    new SecretaryChangeRequestItem
                                    {
                                        RequestId =
                                            GetInt(reader, "RequestId"),

                                        RequestSource =
                                            GetString(
                                                reader,
                                                "RequestSource"
                                            ),

                                        RequestType =
                                            GetString(
                                                reader,
                                                "RequestType"
                                            ),

                                        CompetitionId =
                                            GetInt(
                                                reader,
                                                "CompetitionId"
                                            ),

                                        CompetitionName =
                                            GetString(
                                                reader,
                                                "CompetitionName"
                                            ),

                                        RequestDate =
                                            GetDateTime(
                                                reader,
                                                "RequestDate"
                                            ),

                                        RequestedByPersonId =
                                            GetInt(
                                                reader,
                                                "RequestedByPersonId"
                                            ),

                                        RequestedByName =
                                            GetString(
                                                reader,
                                                "RequestedByName"
                                            ),

                                        EntityType =
                                            GetString(
                                                reader,
                                                "EntityType"
                                            ),

                                        EntityName =
                                            GetString(
                                                reader,
                                                "EntityName"
                                            ),

                                        BeforeText =
                                            GetString(
                                                reader,
                                                "BeforeText"
                                            ),

                                        AfterText =
                                            GetString(
                                                reader,
                                                "AfterText"
                                            ),

                                        Status =
                                            GetString(
                                                reader,
                                                "Status"
                                            ),

                                        IsCancelled =
                                            GetBool(
                                                reader,
                                                "IsCancelled"
                                            ),

                                        OriginalEntityId =
                                            GetInt(
                                                reader,
                                                "OriginalEntityId"
                                            ),

                                        NewEntityId =
                                            GetNullableInt(
                                                reader,
                                                "NewEntityId"
                                            ),

                                        FineId =
                                            GetNullableInt(
                                                reader,
                                                "FineId"
                                            ),

                                        FineAmountSnapshot =
                                            GetNullableDecimal(
                                                reader,
                                                "FineAmountSnapshot"
                                            ),

                                        AmountBefore =
                                            GetDecimal(
                                                reader,
                                                "AmountBefore"
                                            ),

                                        AmountAfter =
                                            GetDecimal(
                                                reader,
                                                "AmountAfter"
                                            )
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

        // Named PostgreSQL argument notation (p_x := @x), not positional
        // Dictionary/CreateCommandWithStoredProcedure binding - same builder-
        // method pattern as ChangeEntryRequestDAL.BuildInsertChangeEntryRequestSecuredCommand,
        // so command construction can be unit tested with a null connection,
        // no DB access required.
        //
        // Calls the SECURED answer function only (usp_answerchangeentryrequestsecured,
        // 221). The old 4-argument public.usp_answerchangeentryrequest (210) is
        // deliberately left untouched and uncalled from here - see 210's and
        // 221's own headers for why it stays deployed for now.
        public static NpgsqlCommand BuildAnswerChangeEntryRequestSecuredCommand(
            int requestId,
            string answerStatus,
            int answeredBySystemUserId,
            int competitionId,
            string? notes,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand command = new NpgsqlCommand(
                @"
                select public.usp_answerchangeentryrequestsecured(
                    p_changeentryrequestid   := @requestId,
                    p_answerstatus           := @answerStatus,
                    p_answeredbysystemuserid := @answeredBySystemUserId,
                    p_competitionid          := @competitionId,
                    p_notes                  := @notes
                );",
                connection
            );

            command.Parameters.Add(
                "@requestId",
                NpgsqlDbType.Integer
            ).Value = requestId;

            command.Parameters.Add(
                "@answerStatus",
                NpgsqlDbType.Text
            ).Value = answerStatus;

            command.Parameters.Add(
                "@answeredBySystemUserId",
                NpgsqlDbType.Integer
            ).Value = answeredBySystemUserId;

            command.Parameters.Add(
                "@competitionId",
                NpgsqlDbType.Integer
            ).Value = competitionId;

            command.Parameters.Add(
                "@notes",
                NpgsqlDbType.Text
            ).Value =
                string.IsNullOrWhiteSpace(notes)
                    ? DBNull.Value
                    : notes;

            return command;
        }

        // Same builder-method pattern as above, calling the SECURED product
        // answer function only (usp_answerproductchangerequestsecured, 222).
        // The old 4-argument public.usp_answerproductchangerequest (211) is
        // deliberately left untouched and uncalled from here.
        public static NpgsqlCommand BuildAnswerProductChangeRequestSecuredCommand(
            int requestId,
            string answerStatus,
            int answeredBySystemUserId,
            int competitionId,
            string? notes,
            NpgsqlConnection? connection)
        {
            NpgsqlCommand command = new NpgsqlCommand(
                @"
                select public.usp_answerproductchangerequestsecured(
                    p_productchangerequestid := @requestId,
                    p_answerstatus           := @answerStatus,
                    p_answeredbysystemuserid := @answeredBySystemUserId,
                    p_competitionid          := @competitionId,
                    p_notes                  := @notes
                );",
                connection
            );

            command.Parameters.Add(
                "@requestId",
                NpgsqlDbType.Integer
            ).Value = requestId;

            command.Parameters.Add(
                "@answerStatus",
                NpgsqlDbType.Text
            ).Value = answerStatus;

            command.Parameters.Add(
                "@answeredBySystemUserId",
                NpgsqlDbType.Integer
            ).Value = answeredBySystemUserId;

            command.Parameters.Add(
                "@competitionId",
                NpgsqlDbType.Integer
            ).Value = competitionId;

            command.Parameters.Add(
                "@notes",
                NpgsqlDbType.Text
            ).Value =
                string.IsNullOrWhiteSpace(notes)
                    ? DBNull.Value
                    : notes;

            return command;
        }

        public int AnswerSecretaryChangeRequest(
            AnswerChangeRequestRequest request)
        {
            try
            {
                using (
                    NpgsqlConnection connection =
                        Connect("DefaultConnection")
                )
                {
                    connection.Open();

                    NpgsqlCommand command;

                    if (request.RequestSource == "Entry")
                    {
                        command = BuildAnswerChangeEntryRequestSecuredCommand(
                            request.RequestId,
                            request.AnswerStatus,
                            request.AnsweredBySystemUserId,
                            request.CompetitionId,
                            request.Notes,
                            connection
                        );
                    }
                    else if (request.RequestSource == "Product")
                    {
                        command = BuildAnswerProductChangeRequestSecuredCommand(
                            request.RequestId,
                            request.AnswerStatus,
                            request.AnsweredBySystemUserId,
                            request.CompetitionId,
                            request.Notes,
                            connection
                        );
                    }
                    else
                    {
                        throw new Exception("Invalid RequestSource");
                    }

                    using (command)
                    {
                        object? result = command.ExecuteScalar();

                        if (result == null || result == DBNull.Value)
                        {
                            return request.RequestId;
                        }

                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public int GetHostSecretaryPendingChangeRequestsCount(
            int ranchId)
        {
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
                                select ""PendingCount""
                                from public.usp_gethostsecretarypendingchangerequestscount(
                                    @ranchId
                                );",
                                connection
                            )
                    )
                    {
                        command.Parameters.Add(
                            "@ranchId",
                            NpgsqlDbType.Integer
                        ).Value = ranchId;

                        object? result = command.ExecuteScalar();

                        if (result == null || result == DBNull.Value)
                        {
                            return 0;
                        }

                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception(ex.Message);
            }
        }

        public List<PendingChangeRequestsByCompetitionItem>
            GetHostSecretaryPendingChangeRequestsByCompetition(int ranchId)
        {
            List<PendingChangeRequestsByCompetitionItem> items =
                new List<PendingChangeRequestsByCompetitionItem>();

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
                                from public.usp_gethostsecretarypendingchangerequestsbycompetition(
                                    @ranchId
                                );",
                                connection
                            )
                    )
                    {
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
                                items.Add(
                                    new PendingChangeRequestsByCompetitionItem
                                    {
                                        CompetitionId =
                                            GetInt(reader, "CompetitionId"),

                                        CompetitionName =
                                            GetString(
                                                reader,
                                                "CompetitionName"
                                            ),

                                        PendingCount =
                                            GetInt(reader, "PendingCount")
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

        private static decimal? GetNullableDecimal(
            NpgsqlDataReader reader,
            string columnName)
        {
            int ordinal = reader.GetOrdinal(columnName);

            if (reader.IsDBNull(ordinal))
            {
                return null;
            }

            return reader.GetDecimal(ordinal);
        }
    }
}