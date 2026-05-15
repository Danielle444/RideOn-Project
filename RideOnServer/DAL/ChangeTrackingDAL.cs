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

                        using (NpgsqlDataReader reader =
                            command.ExecuteReader())
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