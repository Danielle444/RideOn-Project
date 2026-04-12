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


    }
}