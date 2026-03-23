using Microsoft.Data.SqlClient;
using RideOnServer.BL;
using System.Data;
using RideOnServer.BL.DTOs;

namespace RideOnServer.DAL
{
    public class SystemUserDAL : DBServices
    {
        private SqlDataReader reader;
        private SqlConnection connection;
        private SqlCommand command;

        public SystemUser? GetSystemUserForLogin(string username)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@Username", username);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_GetSystemUserForLogin", connection, paramDic);

            try
            {
                reader = command.ExecuteReader(CommandBehavior.CloseConnection);

                if (reader.Read())
                {
                    SystemUser systemUser = new SystemUser
                    {
                        PersonId = Convert.ToInt32(reader["SystemUserId"]),
                        Username = reader["Username"].ToString(),
                        PasswordHash = reader["PasswordHash"].ToString(),
                        PasswordSalt = reader["PasswordSalt"].ToString(),
                        IsActive = Convert.ToBoolean(reader["IsActive"]),
                        MustChangePassword = Convert.ToBoolean(reader["MustChangePassword"]),
                        CreatedDate = Convert.ToDateTime(reader["CreatedDate"]),
                        FirstName = reader["FirstName"].ToString(),
                        LastName = reader["LastName"].ToString()
                    };

                    return systemUser;
                }

                return null;
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

        public List<ApprovedRoleRanch> GetApprovedPersonRanchesAndRoles(int personId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@PersonId", personId);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_GetApprovedPersonRanchesAndRoles", connection, paramDic);

            try
            {
                List<ApprovedRoleRanch> approvedRolesAndRanches = new List<ApprovedRoleRanch>();

                reader = command.ExecuteReader(CommandBehavior.CloseConnection);

                while (reader.Read())
                {
                    approvedRolesAndRanches.Add(new ApprovedRoleRanch
                    {
                        RanchId = Convert.ToInt32(reader["RanchId"]),
                        RanchName = reader["RanchName"].ToString(),
                        RoleId = Convert.ToByte(reader["RoleId"]),
                        RoleName = reader["RoleName"].ToString()
                    });
                }

                return approvedRolesAndRanches;
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

        public bool CheckNationalIdExists(string nationalId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@NationalId", nationalId);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_CheckNationalIdExists", connection, paramDic);

            try
            {
                object result = command.ExecuteScalar();
                return Convert.ToInt32(result) == 1;
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

        public bool CheckUsernameExists(string username)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@Username", username);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_CheckUsernameExists", connection, paramDic);

            try
            {
                object result = command.ExecuteScalar();
                return Convert.ToInt32(result) == 1;
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

        public int RegisterSystemUser(RegisterRequest request, string passwordHash, string passwordSalt)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@NationalId", request.NationalId);
            paramDic.Add("@FirstName", request.FirstName);
            paramDic.Add("@LastName", request.LastName);
            paramDic.Add("@Gender", request.Gender ?? (object)DBNull.Value);
            paramDic.Add("@DateOfBirth", request.DateOfBirth ?? (object)DBNull.Value);
            paramDic.Add("@CellPhone", request.CellPhone);
            paramDic.Add("@Email", request.Email);
            paramDic.Add("@Username", request.Username);
            paramDic.Add("@PasswordHash", passwordHash);
            paramDic.Add("@PasswordSalt", passwordSalt);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_RegisterSystemUser", connection, paramDic);

            try
            {
                object result = command.ExecuteScalar();
                return Convert.ToInt32(result);
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

        public void AssignPersonRoleAtRanch(int personId, int ranchId, byte roleId, string roleStatus = "Pending")
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@PersonId", personId);
            paramDic.Add("@RanchId", ranchId);
            paramDic.Add("@RoleId", roleId);
            paramDic.Add("@RoleStatus", roleStatus);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_AssignPersonRoleAtRanch", connection, paramDic);

            try
            {
                command.ExecuteNonQuery();
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

        public void UpdatePersonRoleStatus(int personId, int ranchId, byte roleId, string roleStatus)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@PersonId", personId);
            paramDic.Add("@RanchId", ranchId);
            paramDic.Add("@RoleId", roleId);
            paramDic.Add("@RoleStatus", roleStatus);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_UpdatePersonRoleStatus", connection, paramDic);

            try
            {
                command.ExecuteNonQuery();
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

        public void UpdateSystemUserPassword(int systemUserId, string newPasswordHash, string newPasswordSalt)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@SystemUserId", systemUserId);
            paramDic.Add("@NewPasswordHash", newPasswordHash);
            paramDic.Add("@NewPasswordSalt", newPasswordSalt);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_UpdateSystemUserPassword", connection, paramDic);

            try
            {
                command.ExecuteNonQuery();
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

        public void SetMustChangePassword(int systemUserId, bool mustChangePassword)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@SystemUserId", systemUserId);
            paramDic.Add("@MustChangePassword", mustChangePassword);

            try
            {
                connection = Connect("DefaultConnection");
            }
            catch
            {
                throw;
            }

            command = CreateCommandWithStoredProcedure("usp_SetMustChangePassword", connection, paramDic);

            try
            {
                command.ExecuteNonQuery();
            }
            catch
            {
                throw;
            }
            finally
            {
                if (connection != null)
                {
                    connection.Close();
                }
            }
        }

    }
}