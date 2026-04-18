using Npgsql;
using RideOnServer.BL.DTOs.Horses;

namespace RideOnServer.DAL
{
    public class HorseDAL : DBServices
    {
        public List<HorseListItem> GetHorsesByRanch(GetHorsesFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_ranchid", filters.RanchId },
                { "@p_search_text", (object?)filters.SearchText ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_gethorsesbyranch",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<HorseListItem> horses = new List<HorseListItem>();

                        while (reader.Read())
                        {
                            horses.Add(new HorseListItem
                            {
                                HorseId = Convert.ToInt32(reader["HorseId"]),
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString() ?? string.Empty,
                                HorseName = reader["HorseName"].ToString() ?? string.Empty,
                                BarnName = reader["BarnName"] == DBNull.Value ? null : reader["BarnName"].ToString(),
                                FederationNumber = reader["FederationNumber"] == DBNull.Value ? null : reader["FederationNumber"].ToString(),
                                ChipNumber = reader["ChipNumber"] == DBNull.Value ? null : reader["ChipNumber"].ToString(),
                                BirthYear = reader["BirthYear"] == DBNull.Value ? null : Convert.ToInt16(reader["BirthYear"]),
                                Gender = reader["Gender"] == DBNull.Value ? null : reader["Gender"].ToString()
                            });
                        }

                        return horses;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<CompetitionHorseListItem> GetHorsesForCompetition(GetCompetitionHorsesFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_competitionid", filters.CompetitionId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_gethorsesforcompetition",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<CompetitionHorseListItem> horses = new List<CompetitionHorseListItem>();

                        while (reader.Read())
                        {
                            CompetitionHorseListItem item = new CompetitionHorseListItem
                            {
                                HorseId = Convert.ToInt32(reader["HorseId"]),
                                HorseName = reader["HorseName"].ToString() ?? string.Empty,
                                BarnName = reader["BarnName"] == DBNull.Value ? null : reader["BarnName"].ToString(),
                                FederationNumber = reader["FederationNumber"] == DBNull.Value ? null : reader["FederationNumber"].ToString()
                            };

                            if (string.IsNullOrWhiteSpace(filters.SearchText) ||
                                item.HorseName.Contains(filters.SearchText, StringComparison.OrdinalIgnoreCase) ||
                                (!string.IsNullOrWhiteSpace(item.BarnName) &&
                                 item.BarnName.Contains(filters.SearchText, StringComparison.OrdinalIgnoreCase)) ||
                                (!string.IsNullOrWhiteSpace(item.FederationNumber) &&
                                 item.FederationNumber.Contains(filters.SearchText, StringComparison.OrdinalIgnoreCase)))
                            {
                                horses.Add(item);
                            }
                        }

                        return horses;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateHorseBarnName(UpdateHorseBarnNameRequest request)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_horseid", request.HorseId },
                { "@p_ranchid", request.RanchId },
                { "@p_barnname", (object?)request.BarnName ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_updatehorsebarnname",
                        connection,
                        paramDic))
                    {
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