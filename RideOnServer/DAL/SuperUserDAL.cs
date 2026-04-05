using Microsoft.Data.SqlClient;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using RideOnServer.BL.DTOs.Auth.SuperUser;

namespace RideOnServer.DAL
{
    public class SuperUserDAL : DBServices
    {
        public SuperUser? GetSuperUserForLogin(string email)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@Email", email }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetSuperUserForLogin", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new SuperUser
                            {
                                SuperUserId = Convert.ToInt32(reader["SuperUserId"]),
                                Email = reader["Email"].ToString() ?? string.Empty,
                                PasswordHash = reader["PasswordHash"].ToString() ?? string.Empty,
                                PasswordSalt = reader["PasswordSalt"].ToString() ?? string.Empty,
                                IsActive = Convert.ToBoolean(reader["IsActive"]),
                                MustChangePassword = Convert.ToBoolean(reader["MustChangePassword"])
                            };
                        }

                        return null;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public SuperUser? GetSuperUserById(int superUserId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SuperUserId", superUserId }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetSuperUserById", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new SuperUser
                            {
                                SuperUserId = Convert.ToInt32(reader["SuperUserId"]),
                                Email = reader["Email"].ToString() ?? string.Empty,
                                PasswordHash = reader["PasswordHash"].ToString() ?? string.Empty,
                                PasswordSalt = reader["PasswordSalt"].ToString() ?? string.Empty,
                                IsActive = Convert.ToBoolean(reader["IsActive"]),
                                MustChangePassword = Convert.ToBoolean(reader["MustChangePassword"])
                            };
                        }

                        return null;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateSuperUserLastLogin(int superUserId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SuperUserId", superUserId }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateSuperUserLastLogin", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateSuperUserPassword(int superUserId, string newPasswordHash, string newPasswordSalt)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SuperUserId", superUserId },
                { "@NewPasswordHash", newPasswordHash },
                { "@NewPasswordSalt", newPasswordSalt }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateSuperUserPassword", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int InsertSuperUser(string email, string passwordHash, string passwordSalt, bool mustChangePassword)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@Email", email },
                { "@PasswordHash", passwordHash },
                { "@PasswordSalt", passwordSalt },
                { "@MustChangePassword", mustChangePassword }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_InsertSuperUser", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result);
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public bool CheckSuperUserEmailExists(string email)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@Email", email }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_CheckSuperUserEmailExists", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result) == 1;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<RoleRequest> GetRoleRequests(byte roleId, string? status, string? searchText)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@RoleId", roleId },
        { "@RoleStatus", status },
        { "@SearchText", searchText }
    };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetRoleRequests", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<RoleRequest> list = new List<RoleRequest>();

                        while (reader.Read())
                        {
                            list.Add(new RoleRequest
                            {
                                PersonId = Convert.ToInt32(reader["PersonId"]),
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RoleId = Convert.ToByte(reader["RoleId"]),
                                FullName = reader["FullName"].ToString()!,
                                NationalId = reader["NationalId"].ToString()!,
                                Email = reader["Email"]?.ToString(),
                                CellPhone = reader["CellPhone"]?.ToString(),
                                RanchName = reader["RanchName"].ToString()!,
                                RoleName = reader["RoleName"].ToString()!,
                                RoleStatus = reader["RoleStatus"].ToString()!
                            });
                        }

                        return list;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<NewRanchRequest> GetNewRanchRequests(string? status, string? searchText)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
    {
        { "@RequestStatus", status },
        { "@SearchText", searchText }
    };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetNewRanchRequests", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<NewRanchRequest> list = new List<NewRanchRequest>();

                        while (reader.Read())
                        {
                            list.Add(new NewRanchRequest
                            {
                                RequestId = Convert.ToInt32(reader["RequestId"]),
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                SubmittedBySystemUserId = Convert.ToInt32(reader["SubmittedBySystemUserId"]),
                                RequestDate = Convert.ToDateTime(reader["RequestDate"]),
                                RanchName = reader["RanchName"].ToString()!,
                                PersonId = Convert.ToInt32(reader["PersonId"]),
                                FullName = reader["FullName"].ToString()!,
                                NationalId = reader["NationalId"].ToString()!,
                                Email = reader["Email"]?.ToString(),
                                CellPhone = reader["CellPhone"]?.ToString(),
                                RequestStatus = reader["RequestStatus"].ToString()!,
                                ResolvedBySuperUserId = reader["ResolvedBySuperUserId"] == DBNull.Value
                                    ? null
                                    : Convert.ToInt32(reader["ResolvedBySuperUserId"]),
                                ResolvedBySuperUserEmail = reader["ResolvedBySuperUserEmail"] == DBNull.Value
                                    ? null
                                    : reader["ResolvedBySuperUserEmail"].ToString(),
                                ResolvedDate = reader["ResolvedDate"] == DBNull.Value
                                    ? null
                                    : Convert.ToDateTime(reader["ResolvedDate"])
                            });
                        }

                        return list;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateRoleRequestStatus(int personId, int ranchId, byte roleId, string roleStatus)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PersonId", personId },
                { "@RanchId", ranchId },
                { "@RoleId", roleId },
                { "@RoleStatus", roleStatus }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdatePersonRoleStatus", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateNewRanchRequestStatus(int requestId, int resolvedBySuperUserId, string newStatus)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RequestId", requestId },
                { "@ResolvedBySuperUserId", resolvedBySuperUserId },
                { "@NewStatus", newStatus }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateNewRanchRequestStatus", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<SuperUserListItem> GetAllSuperUsers()
        {
            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllSuperUsers", connection, null))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<SuperUserListItem> list = new List<SuperUserListItem>();

                        while (reader.Read())
                        {
                            list.Add(new SuperUserListItem
                            {
                                SuperUserId = Convert.ToInt32(reader["SuperUserId"]),
                                Email = reader["Email"].ToString() ?? string.Empty,
                                IsActive = Convert.ToBoolean(reader["IsActive"]),
                                MustChangePassword = Convert.ToBoolean(reader["MustChangePassword"]),
                                CreatedDate = Convert.ToDateTime(reader["CreatedDate"]),
                                LastLoginDate = reader["LastLoginDate"] == DBNull.Value
                                    ? null
                                    : Convert.ToDateTime(reader["LastLoginDate"])
                            });
                        }

                        return list;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }



    }
}