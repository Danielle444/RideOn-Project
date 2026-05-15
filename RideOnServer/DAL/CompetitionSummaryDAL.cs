using Npgsql;
using NpgsqlTypes;
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
    }
}