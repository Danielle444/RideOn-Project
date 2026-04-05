using Npgsql;
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

                    using (NpgsqlTransaction transaction = connection.BeginTransaction())
                    {
                        try
                        {
                            int personId;

                            using (NpgsqlCommand command = new NpgsqlCommand("usp_RegisterSystemUser", connection, transaction))
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

                                object result = command.ExecuteScalar()!;
                                personId = Convert.ToInt32(result);
                            }

                            foreach (RegisterRanchRoleRequest pair in request.RanchRoles)
                            {
                                using (NpgsqlCommand roleCommand = new NpgsqlCommand("usp_AssignPersonRoleAtRanch", connection, transaction))
                                {
                                    roleCommand.CommandType = CommandType.StoredProcedure;

                                    roleCommand.Parameters.AddWithValue("@PersonId", personId);
                                    roleCommand.Parameters.AddWithValue("@RanchId", pair.RanchId);
                                    roleCommand.Parameters.AddWithValue("@RoleId", pair.RoleId);
                                    roleCommand.Parameters.AddWithValue("@RoleStatus", "Pending");

                                    roleCommand.ExecuteNonQuery();
                                }
                            }

                            transaction.Commit();
                            return personId;
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