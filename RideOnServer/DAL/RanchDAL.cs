using Npgsql;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Profile;

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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public List<Ranch> GetRanchesForRegistration()
        {
            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetRanchesForRegistration", connection, null))
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
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public RanchProfile? GetRanchById(int ranchId)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", ranchId }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetRanchById", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new RanchProfile
                            {
                                RanchId = Convert.ToInt32(reader["RanchId"]),
                                RanchName = reader["RanchName"].ToString()!,
                                ContactEmail = reader["ContactEmail"] == DBNull.Value ? null : reader["ContactEmail"].ToString(),
                                ContactPhone = reader["ContactPhone"] == DBNull.Value ? null : reader["ContactPhone"].ToString(),
                                WebsiteUrl = reader["WebsiteUrl"] == DBNull.Value ? null : reader["WebsiteUrl"].ToString(),
                                Latitude = reader["Latitude"] == DBNull.Value ? null : Convert.ToDouble(reader["Latitude"]),
                                Longitude = reader["Longitude"] == DBNull.Value ? null : Convert.ToDouble(reader["Longitude"])
                            };
                        }

                        return null;
                    }
                }
            }
            catch (NpgsqlException ex)
            {
                throw new Exception($"Database error: {ex.Message}");
            }
        }

        public void UpdateRanch(UpdateRanchProfileRequest request)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@RanchId", request.RanchId },
                { "@RanchName", request.RanchName },
                { "@ContactEmail", (object?)request.ContactEmail ?? DBNull.Value },
                { "@ContactPhone", (object?)request.ContactPhone ?? DBNull.Value },
                { "@WebsiteUrl", (object?)request.WebsiteUrl ?? DBNull.Value },
                { "@Location", DBNull.Value },
                { "@Latitude", (object?)request.Latitude ?? DBNull.Value },
                { "@Longitude", (object?)request.Longitude ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_UpdateRanch", connection, paramDic))
                    {
                        command.ExecuteNonQuery();
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