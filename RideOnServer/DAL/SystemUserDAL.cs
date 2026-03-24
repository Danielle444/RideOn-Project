using Microsoft.Data.SqlClient;
using System.Data;
using RideOnServer.BL;
using RideOnServer.BL.DTOs;
using System.Collections.Generic;
using System;

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

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetSystemUserForLogin", connection, paramDic))
            {
                try
                {
                    connection.Open();
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
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
            }
        }

        public List<ApprovedRoleRanch> GetApprovedPersonRanchesAndRoles(int personId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PersonId", personId }
            };

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetApprovedPersonRanchesAndRoles", connection, paramDic))
            {
                try
                {
                    List<ApprovedRoleRanch> approvedRolesAndRanches = new List<ApprovedRoleRanch>();
                    
                    connection.Open();
                    using (SqlDataReader reader = command.ExecuteReader())
                    {
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
                    }

                    return approvedRolesAndRanches;
                }
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
            }
        }

        public bool CheckNationalIdExists(string nationalId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@NationalId", nationalId }
            };

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_CheckNationalIdExists", connection, paramDic))
            {
                try
                {
                    connection.Open();
                    object result = command.ExecuteScalar();
                    return Convert.ToInt32(result) == 1;
                }
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
            }
        }

        public bool CheckUsernameExists(string username)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@Username", username }
            };

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_CheckUsernameExists", connection, paramDic))
            {
                try
                {
                    connection.Open();
                    object result = command.ExecuteScalar();
                    return Convert.ToInt32(result) == 1;
                }
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
            }
        }

        public int RegisterSystemUser(RegisterRequest request, string passwordHash, string passwordSalt)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@NationalId", request.NationalId },
                { "@FirstName", request.FirstName },
                { "@LastName", request.LastName },
                { "@Gender", request.Gender ?? (object)DBNull.Value },
                { "@DateOfBirth", request.DateOfBirth ?? (object)DBNull.Value },
                { "@CellPhone", request.CellPhone },
                { "@Email", request.Email },
                { "@Username", request.Username },
                { "@PasswordHash", passwordHash },
                { "@PasswordSalt", passwordSalt }
            };

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_RegisterSystemUser", connection, paramDic))
            {
                try
                {
                    connection.Open();
                    object result = command.ExecuteScalar();
                    return Convert.ToInt32(result);
                }
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
            }
        }

        public void AssignPersonRoleAtRanch(int personId, int ranchId, byte roleId, string roleStatus = "Pending")
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@PersonId", personId },
                { "@RanchId", ranchId },
                { "@RoleId", roleId },
                { "@RoleStatus", roleStatus }
            };

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_AssignPersonRoleAtRanch", connection, paramDic))
            {
                try
                {
                    connection.Open();
                    command.ExecuteNonQuery();
                }
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
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

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdatePersonRoleStatus", connection, paramDic))
            {
                try
                {
                    connection.Open();
                    command.ExecuteNonQuery();
                }
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
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

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateSystemUserPassword", connection, paramDic))
            {
                try
                {
                    connection.Open();
                    command.ExecuteNonQuery();
                }
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
            }
        }

        public void SetMustChangePassword(int systemUserId, bool mustChangePassword)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@SystemUserId", systemUserId },
                { "@MustChangePassword", mustChangePassword }
            };

            using (SqlConnection connection = Connect("DefaultConnection"))
            using (SqlCommand command = CreateCommandWithStoredProcedure("usp_SetMustChangePassword", connection, paramDic))
            {
                try
                {
                    connection.Open();
                    command.ExecuteNonQuery();
                }
                catch (SqlException ex)
                {
                    throw new Exception($"Database error: {ex.Message}");
                }
            }
        }
    }
}
