using Microsoft.Data.SqlClient;
using RideOnServer.BL;
using System.Data;

namespace RideOnServer.DAL
{
    public class RolesDAL : DBServices
    {
        private SqlDataReader reader;
        private SqlConnection connection;
        private SqlCommand command;

        public List<Role> GetAllRoles()
        {
            try
            {
                connection = Connect("DefaultConnection");
            }
            catch (Exception ex)
            {
                throw ex;
            }

            command = CreateCommandWithStoredProcedure("GetAllRoles", connection, null);

            try
            {
                List<Role> roles = new List<Role>();

                reader = command.ExecuteReader(CommandBehavior.CloseConnection);

                while (reader.Read())
                {
                    roles.Add(new Role
                    {
                        RoleId = Convert.ToByte(reader["RoleId"]),
                        RoleName = reader["RoleName"].ToString()
                    });
                }

                return roles;
            }
            catch (Exception ex)
            {
                throw ex;
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