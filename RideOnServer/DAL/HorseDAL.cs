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
                { "@p_competitionid", filters.CompetitionId },
                { "@p_ranchid", filters.RanchId }
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

        public List<HealthCertificateItem> GetHealthCertificatesForCompetition(int competitionId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@CompetitionId", competitionId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetHealthCertificatesForCompetition",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<HealthCertificateItem> list = new List<HealthCertificateItem>();

                        while (reader.Read())
                        {
                            list.Add(new HealthCertificateItem
                            {
                                HorseId = Convert.ToInt32(reader["HorseId"]),
                                HorseName = reader["HorseName"].ToString() ?? string.Empty,
                                BarnName = reader["BarnName"] as string,
                                HcPath = reader["HcPath"] as string,
                                HcUploadDate = reader["HcUploadDate"] as DateTime?,
                                HcApprovalStatus = reader["HcApprovalStatus"] as string,
                                HcApprovalDate = reader["HcApprovalDate"] == DBNull.Value
                                    ? null
                                    : DateOnly.FromDateTime(Convert.ToDateTime(reader["HcApprovalDate"])),
                                HcApproverSystemUserId = reader["HcApproverSystemUserId"] == DBNull.Value
                                    ? null
                                    : Convert.ToInt32(reader["HcApproverSystemUserId"])
                            });
                        }

                        return list;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHealthCertificatesForCompetition: {ex.Message}");
                throw;
            }
        }

        public void SaveHealthCertificate(int horseId, int competitionId, string hcPath, DateTime uploadDate)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@HorseId", horseId },
                { "@CompetitionId", competitionId },
                { "@HcPath", hcPath },
                { "@HcUploadDate", uploadDate }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_SaveHealthCertificate",
                        connection,
                        paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SaveHealthCertificate: {ex.Message}");
                throw;
            }
        }

        public void ApproveHealthCertificate(int horseId, int competitionId, int approverSystemUserId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@HorseId", horseId },
                { "@CompetitionId", competitionId },
                { "@HcApproverSystemUserId", approverSystemUserId },
                { "@HcApprovalDate", DateOnly.FromDateTime(DateTime.UtcNow) }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_ApproveHealthCertificate",
                        connection,
                        paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApproveHealthCertificate: {ex.Message}");
                throw;
            }
        }
    }
}