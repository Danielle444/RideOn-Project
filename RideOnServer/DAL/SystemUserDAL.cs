using Npgsql;
using System.Data;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using NpgsqlTypes;

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
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetSystemUserForLogin", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
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
            catch (NpgsqlException  ex)
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
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetApprovedPersonRanchesAndRoles", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
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
            catch (NpgsqlException  ex)
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
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_CheckNationalIdExists", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result) == 1;
                    }
                }
            }
            catch (NpgsqlException  ex)
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
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_CheckUsernameExists", connection, paramDic))
                    {
                        object result = command.ExecuteScalar()!;
                        return Convert.ToInt32(result) == 1;
                    }
                }
            }
            catch (NpgsqlException  ex)
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
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_AssignPersonRoleAtRanch", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException  ex)
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
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdatePersonRoleStatus", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException  ex)
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
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateSystemUserPassword", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException  ex)
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
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_SetMustChangePassword", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public int RegisterSystemUserWithRoles(RegisterRequest request, string passwordHash, string passwordSalt)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    int[] ranchIds = request.RanchRoles
                        .Select(pair => pair.RanchId)
                        .ToArray();

                    short[] roleIds = request.RanchRoles
                        .Select(pair => (short)pair.RoleId)
                        .ToArray();

                    string sql = @"
                SELECT * FROM usp_RegisterSystemUserWithRoles(
                    @NationalId,
                    @FirstName,
                    @LastName,
                    @Username,
                    @PasswordHash,
                    @PasswordSalt,
                    @RanchIds,
                    @RoleIds,
                    @Gender,
                    @DateOfBirth,
                    @CellPhone,
                    @Email
                )";

                    using (NpgsqlCommand command = new NpgsqlCommand(sql, connection))
                    {
                        command.Parameters.AddWithValue("@NationalId", request.NationalId);
                        command.Parameters.AddWithValue("@FirstName", request.FirstName);
                        command.Parameters.AddWithValue("@LastName", request.LastName);
                        command.Parameters.AddWithValue("@Username", request.Username);
                        command.Parameters.AddWithValue("@PasswordHash", passwordHash);
                        command.Parameters.AddWithValue("@PasswordSalt", passwordSalt);
                        command.Parameters.AddWithValue("@RanchIds", ranchIds);
                        command.Parameters.AddWithValue("@RoleIds", roleIds);

                        command.Parameters.AddWithValue("@Gender",
                            string.IsNullOrWhiteSpace(request.Gender) ? DBNull.Value : request.Gender);

                        var dateParam = command.Parameters.Add("@DateOfBirth", NpgsqlTypes.NpgsqlDbType.Date);
                        dateParam.Value = request.DateOfBirth.HasValue
                            ? request.DateOfBirth.Value.Date
                            : DBNull.Value;

                        command.Parameters.AddWithValue("@CellPhone", request.CellPhone);

                        command.Parameters.AddWithValue("@Email",
                            string.IsNullOrWhiteSpace(request.Email) ? DBNull.Value : request.Email);

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


        public int CreatePendingRanchRequest(CreateRanchRequest request)
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlTransaction transaction = connection.BeginTransaction())
                    {
                        try
                        {
                            int newRanchId;
                            int newRequestId;

                            Dictionary<string, object> ranchParamDic = new Dictionary<string, object>
                    {
                        { "@RanchName", request.RanchName },
                        { "@ContactEmail", (object?)request.ContactEmail ?? DBNull.Value },
                        { "@ContactPhone", (object?)request.ContactPhone ?? DBNull.Value },
                        { "@WebsiteUrl", (object?)request.WebsiteUrl ?? DBNull.Value },
                        { "@Lat", (object?)request.Latitude ?? DBNull.Value },
                        { "@Long", (object?)request.Longitude ?? DBNull.Value }
                    };

                            using (NpgsqlCommand ranchCommand = CreateCommandWithStoredProcedure("usp_InsertRanch", connection, ranchParamDic))
                            {
                                ranchCommand.Transaction = transaction;
                                object ranchResult = ranchCommand.ExecuteScalar()!;
                                newRanchId = Convert.ToInt32(ranchResult);
                            }

                            Dictionary<string, object> requestParamDic = new Dictionary<string, object>
                    {
                        { "@RanchId", newRanchId },
                        { "@SubmittedBySystemUserId", DBNull.Value }
                    };

                            using (NpgsqlCommand requestCommand = CreateCommandWithStoredProcedure("usp_InsertNewRanchRequest", connection, requestParamDic))
                            {
                                requestCommand.Transaction = transaction;
                                object requestResult = requestCommand.ExecuteScalar()!;
                                newRequestId = Convert.ToInt32(requestResult);
                            }

                            transaction.Commit();
                            return newRequestId;
                        }
                        catch
                        {
                            transaction.Rollback();
                            throw;
                        }
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