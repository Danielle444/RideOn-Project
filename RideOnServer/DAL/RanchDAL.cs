using Npgsql;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class RanchDAL : DBServices
    {
        public List<Ranch> GetAllRanchesNames()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllRanchesNames", connection, null))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        List<Ranch> ranches = new List<Ranch>();

                        while (reader.Read())
                        {
                            ranches.Add(new Ranch
                            {
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString()!
                            });
                        }

                        return ranches;
                    }
                }
            }
            catch (NpgsqlException  ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }
    }
}