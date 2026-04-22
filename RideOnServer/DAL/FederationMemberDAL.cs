using Npgsql;
using RideOnServer.BL.DTOs.FederationMembers;

namespace RideOnServer.DAL
{
    public class FederationMemberDAL : DBServices
    {
        public List<CompetitionFederationMemberListItem> GetCompetitionRidersByRanch(
            GetCompetitionFederationMembersFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", filters.CompetitionId },
                { "@RanchId", filters.RanchId },
                { "@SearchText", (object?)filters.SearchText ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetCompetitionRidersByRanch",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<CompetitionFederationMemberListItem> list =
                            new List<CompetitionFederationMemberListItem>();

                        while (reader.Read())
                        {
                            list.Add(new CompetitionFederationMemberListItem
                            {
                                FederationMemberId = Convert.ToInt32(reader["FederationMemberId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty
                            });
                        }

                        return list;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<CompetitionFederationMemberListItem> GetCompetitionTrainersByRanch(
            GetCompetitionFederationMembersFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", filters.CompetitionId },
                { "@RanchId", filters.RanchId },
                { "@SearchText", (object?)filters.SearchText ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetCompetitionTrainersByRanch",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<CompetitionFederationMemberListItem> list =
                            new List<CompetitionFederationMemberListItem>();

                        while (reader.Read())
                        {
                            list.Add(new CompetitionFederationMemberListItem
                            {
                                FederationMemberId = Convert.ToInt32(reader["FederationMemberId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty
                            });
                        }

                        return list;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<CompetitionFederationMemberListItem> GetRidersByRanch(
            GetRanchFederationMembersFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", filters.RanchId },
                { "@SearchText", (object?)filters.SearchText ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetRidersByRanch",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<CompetitionFederationMemberListItem> list =
                            new List<CompetitionFederationMemberListItem>();

                        while (reader.Read())
                        {
                            list.Add(new CompetitionFederationMemberListItem
                            {
                                FederationMemberId = Convert.ToInt32(reader["FederationMemberId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty
                            });
                        }

                        return list;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<CompetitionFederationMemberListItem> GetTrainersByRanch(
            GetRanchFederationMembersFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", filters.RanchId },
                { "@SearchText", (object?)filters.SearchText ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetTrainersByRanch",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<CompetitionFederationMemberListItem> list =
                            new List<CompetitionFederationMemberListItem>();

                        while (reader.Read())
                        {
                            list.Add(new CompetitionFederationMemberListItem
                            {
                                FederationMemberId = Convert.ToInt32(reader["FederationMemberId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty
                            });
                        }

                        return list;
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