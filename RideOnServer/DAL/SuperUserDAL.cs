using Microsoft.Data.SqlClient;
using RideOnServer.BL;

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

        public int InsertSuperUser(string email, string passwordHash, string passwordSalt)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@Email", email },
                { "@PasswordHash", passwordHash },
                { "@PasswordSalt", passwordSalt }
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
    }
}