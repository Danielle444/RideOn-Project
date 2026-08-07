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

        // Bounded, real-horse-only sibling of GetHorsesByRanch. Calls
        // usp_getrealhorsesbyranch, which filters out horses with no federation
        // number and caps every result set at 200 rows. Same result shape as
        // usp_gethorsesbyranch, so the HorseListItem mapping is identical.
        public List<HorseListItem> GetRealHorsesByRanch(GetHorsesFiltersRequest filters)
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
                        "usp_getrealhorsesbyranch",
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

        // Ranch-model fix (Phase 2, 2026-08-05): single-horse ranch lookup used
        // by StallBookingsController to derive a horse's home/requesting ranch
        // server-side for authorization, instead of trusting a client-supplied
        // ranch value. Backed by usp_gethorseranchid (232) -- see that file's
        // header for why no existing method/proc already provided this.
        public int? GetHorseRanchId(int horseId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_horseid", horseId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_gethorseranchid",
                        connection,
                        paramDic))
                    {
                        object? result = command.ExecuteScalar();

                        if (result == null || result == DBNull.Value)
                        {
                            return null;
                        }

                        return Convert.ToInt32(result);
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

        public List<HealthCertificateItem> GetHealthCertificatesForCompetition(
            int competitionId,
            int ranchId
        )
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_competitionid", competitionId },
                { "@p_ranchid", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_gethealthcertificatesforcompetition",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<HealthCertificateItem> list = new List<HealthCertificateItem>();

                        while (reader.Read())
                        {
                            list.Add(ReadHealthCertificateItem(reader));
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

        // Competition-wide sibling of GetHealthCertificatesForCompetition, backed by
        // usp_gethealthcertificatesforhostedcompetition (repo file 184): the same
        // eight columns without the h.ranchid filter, so a HostSecretary of the
        // hosting ranch sees visiting ranches' horses too.
        //
        // Deliberately takes no ranch id. The read scope is decided by
        // HorsesController before either method is reached - never by a parameter a
        // caller could supply. One call, one round trip: nothing here iterates over
        // ranches.
        public List<HealthCertificateItem> GetHealthCertificatesForHostedCompetition(
            int competitionId
        )
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_competitionid", competitionId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_gethealthcertificatesforhostedcompetition",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<HealthCertificateItem> list = new List<HealthCertificateItem>();

                        while (reader.Read())
                        {
                            list.Add(ReadHealthCertificateItem(reader));
                        }

                        return list;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetHealthCertificatesForHostedCompetition: {ex.Message}");
                throw;
            }
        }

        // Shared by both health-certificate readers. The two stored procedures
        // return the same eight columns in the same order, so extracting this keeps
        // the mapping from drifting between them.
        private static HealthCertificateItem ReadHealthCertificateItem(NpgsqlDataReader reader)
        {
            return new HealthCertificateItem
            {
                HorseId = Convert.ToInt32(reader["HorseId"]),
                HorseName = reader["HorseName"].ToString() ?? string.Empty,
                BarnName = reader["BarnName"] == DBNull.Value
                    ? null
                    : reader["BarnName"].ToString(),

                HcPath = reader["HcPath"] == DBNull.Value
                    ? null
                    : reader["HcPath"].ToString(),

                HcUploadDate = reader["HcUploadDate"] == DBNull.Value
                    ? null
                    : Convert.ToDateTime(reader["HcUploadDate"]),

                HcApprovalStatus = reader["HcApprovalStatus"] == DBNull.Value
                    ? null
                    : reader["HcApprovalStatus"].ToString(),

                HcApprovalDate = reader["HcApprovalDate"] == DBNull.Value
                    ? null
                    : DateOnly.FromDateTime(Convert.ToDateTime(reader["HcApprovalDate"])),

                HcApproverSystemUserId = reader["HcApproverSystemUserId"] == DBNull.Value
                    ? null
                    : Convert.ToInt32(reader["HcApproverSystemUserId"]),

                HcRejectionReason = reader["HcRejectionReason"] == DBNull.Value
                    ? null
                    : reader["HcRejectionReason"].ToString(),

                HcRejectionDate = reader["HcRejectionDate"] == DBNull.Value
                    ? null
                    : DateOnly.FromDateTime(Convert.ToDateTime(reader["HcRejectionDate"])),

                HcRejectedBySystemUserId = reader["HcRejectedBySystemUserId"] == DBNull.Value
                    ? null
                    : Convert.ToInt32(reader["HcRejectedBySystemUserId"])
            };
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

        // Returns true only when usp_ApproveHealthCertificate actually updated one
        // eligible row (exact horse/competition match, status Pending, hcpath set
        // and non-blank) - see repo file 186. The four-entry dictionary order below
        // is the positional contract with the stored procedure's parameter order
        // (HorseId, CompetitionId, HcApproverSystemUserId, HcApprovalDate) and must
        // not change without changing the procedure to match.
        public bool ApproveHealthCertificate(int horseId, int competitionId, int approverSystemUserId)
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
                        object? result = command.ExecuteScalar();

                        if (result == null || result == DBNull.Value)
                        {
                            return false;
                        }

                        if (result is bool approved)
                        {
                            return approved;
                        }

                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ApproveHealthCertificate: {ex.Message}");
                throw;
            }
        }

        // Returns true only when usp_RejectHealthCertificate actually updated one
        // eligible row (exact horse/competition match, status Pending, hcpath set
        // and non-blank) - see repo file 245. The five-entry dictionary order below
        // is the positional contract with the stored procedure's parameter order
        // (HorseId, CompetitionId, HcRejectedBySystemUserId, HcRejectionDate,
        // HcRejectionReason) and must not change without changing the procedure to
        // match. Mirrors ApproveHealthCertificate's ExecuteScalar/fail-safe shape
        // exactly.
        public bool RejectHealthCertificate(int horseId, int competitionId, int rejectedBySystemUserId, string reason)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@HorseId", horseId },
                { "@CompetitionId", competitionId },
                { "@HcRejectedBySystemUserId", rejectedBySystemUserId },
                { "@HcRejectionDate", DateOnly.FromDateTime(DateTime.UtcNow) },
                { "@HcRejectionReason", reason }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_RejectHealthCertificate",
                        connection,
                        paramDic))
                    {
                        object? result = command.ExecuteScalar();

                        if (result == null || result == DBNull.Value)
                        {
                            return false;
                        }

                        if (result is bool rejected)
                        {
                            return rejected;
                        }

                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in RejectHealthCertificate: {ex.Message}");
                throw;
            }
        }
    }
}