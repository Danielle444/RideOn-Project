using Npgsql;
using RideOnServer.BL.DTOs.Payers;

namespace RideOnServer.DAL
{
    public class PayerDAL : DBServices
    {
        public List<ManagedPayerListItem> GetManagedPayersBySystemUser(
            int systemUserId,
            GetManagedPayersFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SystemUserId", systemUserId },
                { "@RanchId", filters.RanchId },
                { "@SearchText", (object?)filters.SearchText ?? DBNull.Value },
                { "@ApprovalStatus", (object?)filters.ApprovalStatus ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetManagedPayersBySystemUser",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<ManagedPayerListItem> list = new List<ManagedPayerListItem>();

                        while (reader.Read())
                        {
                            list.Add(new ManagedPayerListItem
                            {
                                PersonId = Convert.ToInt32(reader["PersonId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty,
                                NationalId = reader["NationalId"].ToString() ?? string.Empty,
                                CellPhone = reader["CellPhone"] == DBNull.Value ? null : reader["CellPhone"].ToString(),
                                Email = reader["Email"] == DBNull.Value ? null : reader["Email"].ToString(),
                                Username = reader["Username"] == DBNull.Value ? null : reader["Username"].ToString(),
                                IsActive = Convert.ToBoolean(reader["IsActive"]),
                                RequestDate = Convert.ToDateTime(reader["RequestDate"]),
                                ApprovalStatus = reader["ApprovalStatus"].ToString() ?? string.Empty,
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString() ?? string.Empty,
                                RoleId = Convert.ToByte(reader["RoleId"]),
                                RoleName = reader["RoleName"].ToString() ?? string.Empty
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

        public PotentialPayerLookupResponse? FindPotentialPayerByContact(string? email, string? cellPhone)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@Email", (object?)email ?? DBNull.Value },
                { "@CellPhone", (object?)cellPhone ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_FindPotentialPayerByContact",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new PotentialPayerLookupResponse
                            {
                                PersonId = Convert.ToInt32(reader["PersonId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty,
                                NationalId = reader["NationalId"] == DBNull.Value ? null : reader["NationalId"].ToString(),
                                Email = reader["Email"] == DBNull.Value ? null : reader["Email"].ToString(),
                                CellPhone = reader["CellPhone"] == DBNull.Value ? null : reader["CellPhone"].ToString(),
                                HasSystemUser = Convert.ToBoolean(reader["HasSystemUser"])
                            };
                        }

                        return null;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int RequestManagedPayer(int systemUserId, RequestManagedPayerRequest request)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SystemUserId", systemUserId },
                { "@FirstName", request.FirstName },
                { "@LastName", request.LastName },
                { "@Email", (object?)request.Email ?? DBNull.Value },
                { "@CellPhone", (object?)request.CellPhone ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_RequestManagedPayer",
                        connection,
                        paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateManagedPayerBasicDetails(int systemUserId, UpdateManagedPayerRequest request)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SystemUserId", systemUserId },
                { "@PersonId", request.PersonId },
                { "@FirstName", request.FirstName },
                { "@LastName", request.LastName },
                { "@Email", (object?)request.Email ?? DBNull.Value },
                { "@CellPhone", (object?)request.CellPhone ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_UpdateManagedPayerBasicDetails",
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

        public void RemoveManagedPayer(int systemUserId, int personId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SystemUserId", systemUserId },
                { "@PersonId", personId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_RemoveManagedPayer",
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

        public List<CompetitionPayerListItem> GetCompetitionPayersBySystemUser(
    int systemUserId,
    GetCompetitionPayersFiltersRequest filters)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@SystemUserId", systemUserId },
        { "@CompetitionId", filters.CompetitionId },
        { "@SearchText", (object?)filters.SearchText ?? DBNull.Value }
    };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetCompetitionPayersBySystemUser",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<CompetitionPayerListItem> list = new List<CompetitionPayerListItem>();

                        while (reader.Read())
                        {
                            list.Add(new CompetitionPayerListItem
                            {
                                PersonId = Convert.ToInt32(reader["PersonId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty,
                                CellPhone = reader["CellPhone"] == DBNull.Value ? null : reader["CellPhone"].ToString(),
                                Email = reader["Email"] == DBNull.Value ? null : reader["Email"].ToString(),
                                TotalAmount = Convert.ToDecimal(reader["TotalAmount"]),
                                PaidAmount = Convert.ToDecimal(reader["PaidAmount"]),
                                PaymentStatus = reader["PaymentStatus"].ToString() ?? string.Empty
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

        public List<PayerManagerItem> GetPayerManagers(int personId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_personid", personId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_getmanagingadminsforpayer",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<PayerManagerItem> list = new List<PayerManagerItem>();

                        while (reader.Read())
                        {
                            list.Add(new PayerManagerItem
                            {
                                AdminPersonId = Convert.ToInt32(reader["AdminPersonId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty,
                                CellPhone = reader["CellPhone"] == DBNull.Value ? null : reader["CellPhone"].ToString(),
                                Email = reader["Email"] == DBNull.Value ? null : reader["Email"].ToString(),
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString() ?? string.Empty,
                                RoleId = Convert.ToByte(reader["RoleId"]),
                                RoleName = reader["RoleName"].ToString() ?? string.Empty,
                                ApprovalStatus = reader["ApprovalStatus"].ToString() ?? string.Empty,
                                RequestDate = reader["RequestDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["RequestDate"]),
                                UpdateDate = reader["UpdateDate"] == DBNull.Value ? null : Convert.ToDateTime(reader["UpdateDate"])
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

        public List<AvailablePayerManagerItem> GetAvailablePayerManagers(int personId, string? searchText)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_personid", personId },
                { "@p_search_text", (object?)searchText ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_getavailablemanagingadminsforpayer",
                        connection,
                        paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<AvailablePayerManagerItem> list = new List<AvailablePayerManagerItem>();

                        while (reader.Read())
                        {
                            list.Add(new AvailablePayerManagerItem
                            {
                                AdminPersonId = Convert.ToInt32(reader["AdminPersonId"]),
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty,
                                CellPhone = reader["CellPhone"] == DBNull.Value ? null : reader["CellPhone"].ToString(),
                                Email = reader["Email"] == DBNull.Value ? null : reader["Email"].ToString(),
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString() ?? string.Empty,
                                RoleId = Convert.ToByte(reader["RoleId"]),
                                RoleName = reader["RoleName"].ToString() ?? string.Empty
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

        public void AddPayerManager(int personId, int adminPersonId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_personid", personId },
                { "@p_systemuserid", adminPersonId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_addmanagingadminforpayer",
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

        public void RemovePayerManager(int personId, int adminPersonId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_personid", personId },
                { "@p_systemuserid", adminPersonId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_removemanagingadminforpayer",
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