using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class RoleDAL : DBServices
    {
        public List<Role> GetAllRoles()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllRoles", connection, null))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<Role> roles = new List<Role>();

                        while (reader.Read())
                        {
                            roles.Add(new Role
                            {
                                RoleId = Convert.ToByte(reader["RoleId"]),
                                RoleName = reader["RoleName"].ToString()!
                            });
                        }

                        return roles;
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