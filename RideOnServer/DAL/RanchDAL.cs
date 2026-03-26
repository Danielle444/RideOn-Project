using Microsoft.Data.SqlClient;
using RideOnServer.BL;

namespace RideOnServer.DAL
{
    public class RanchDAL : DBServices
    {
        public List<Ranch> GetAllRanchesNames()
        {
            try
            {
                using (SqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (SqlCommand command = CreateCommandWithStoredProcedure("usp_GetAllRanchesNames", connection, null))
                    using (SqlDataReader reader = command.ExecuteReader())
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
            catch (SqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }
    }
}