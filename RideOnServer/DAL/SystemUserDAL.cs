using Microsoft.Data.SqlClient;
using System.Data;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;

namespace RideOnServer.DAL
{
    public class SystemUserDAL : DBServices
    {
        public SystemUser? GetSystemUserForLogin(string username)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@Username", username }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetSystemUserForLogin", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new SystemUser
                            {
                                PersonId = Convert.ToInt32(reader["SystemUserId"]),
                                Username = reader["Username"].ToString()!,
                                PasswordHash = reader["PasswordHash"].ToString()!,
                                PasswordSalt = reader["PasswordSalt"].ToString()!,
                                IsActive = Convert.ToBoolean(reader["IsActive"]),
                                MustChangePassword = Convert.ToBoolean(reader["MustChangePassword"]),
                                CreatedDate = Convert.ToDateTime(reader["CreatedDate"]),
                                FirstName = reader["FirstName"].ToString()!,
                                LastName = reader["LastName"].ToString()!
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

        public List<ApprovedRoleRanch> GetApprovedPersonRanchesAndRoles(int personId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PersonId", personId }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetApprovedPersonRanchesAndRoles", connection, paramDic))
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
                        List<ApprovedRoleRanch> approvedRolesAndRanches = new List<ApprovedRoleRanch>();

                        while (reader.Read())
                        {
                            approvedRolesAndRanches.Add(new ApprovedRoleRanch
                            {
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString()!,
                                RoleId = Convert.ToByte(reader["RoleId"]),
                                RoleName = reader["RoleName"].ToString()!
                            });
                        }

                        return approvedRolesAndRanches;
                    }
                }
            }
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public bool CheckNationalIdExists(string nationalId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@NationalId", nationalId }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_CheckNationalIdExists", connection, paramDic))
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

        public bool CheckUsernameExists(string username)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@Username", username }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_CheckUsernameExists", connection, paramDic))
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

        public void AssignRoleToExistingUser(int personId, int ranchId, byte roleId, string roleStatus = "Pending")
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

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_AssignPersonRoleAtRanch", connection, paramDic))
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

        public void UpdatePersonRoleStatus(int personId, int ranchId, byte roleId, string roleStatus)
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

        public void UpdateSystemUserPassword(int systemUserId, string newPasswordHash, string newPasswordSalt)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SystemUserId", systemUserId },
                { "@NewPasswordHash", newPasswordHash },
                { "@NewPasswordSalt", newPasswordSalt }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateSystemUserPassword", connection, paramDic))
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

        public void SetMustChangePassword(int systemUserId, bool mustChangePassword)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SystemUserId", systemUserId },
                { "@MustChangePassword", mustChangePassword }
            };

            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_SetMustChangePassword", connection, paramDic))
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

        public int RegisterSystemUserWithRoles(RegisterRequest request, string passwordHash, string passwordSalt)
        {
            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = new SqlCommand("usp_RegisterSystemUserWithRoles", connection))
                    {
                        command.CommandType = CommandType.StoredProcedure;

                        command.Parameters.AddWithValue("@NationalId", request.NationalId);
                        command.Parameters.AddWithValue("@FirstName", request.FirstName);
                        command.Parameters.AddWithValue("@LastName", request.LastName);
                        command.Parameters.AddWithValue("@Gender", (object?)request.Gender ?? DBNull.Value);
                        command.Parameters.AddWithValue("@DateOfBirth", (object?)request.DateOfBirth ?? DBNull.Value);
                        command.Parameters.AddWithValue("@CellPhone", request.CellPhone);
                        command.Parameters.AddWithValue("@Email", request.Email);
                        command.Parameters.AddWithValue("@Username", request.Username);
                        command.Parameters.AddWithValue("@PasswordHash", passwordHash);
                        command.Parameters.AddWithValue("@PasswordSalt", passwordSalt);

                        DataTable ranchRolesTable = new DataTable();
                        ranchRolesTable.Columns.Add("RanchId", typeof(int));
                        ranchRolesTable.Columns.Add("RoleId", typeof(byte));

                        foreach (RegisterRanchRoleRequest pair in request.RanchRoles)
                        {
                            ranchRolesTable.Rows.Add(pair.RanchId, pair.RoleId);
                        }

                        SqlParameter ranchRolesParam = command.Parameters.AddWithValue("@RanchRoles", ranchRolesTable);
                        ranchRolesParam.SqlDbType = SqlDbType.Structured;
                        ranchRolesParam.TypeName = "RegisterRanchRoleTableType";

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


    }
}