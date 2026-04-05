using Npgsql;
using RideOnServer.BL.DTOs.Auth;

namespace RideOnServer.DAL
{
    public class PersonDAL : DBServices
    {
        public PersonRegistrationLookupResponse? GetPersonByNationalIdForRegistration(string nationalId)
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

                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure("usp_GetPersonByNationalIdForRegistration", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return new PersonRegistrationLookupResponse
                            {
                                PersonId = Convert.ToInt32(reader["PersonId"]),
                                NationalId = reader["NationalId"].ToString() ?? string.Empty,
                                FirstName = reader["FirstName"].ToString() ?? string.Empty,
                                LastName = reader["LastName"].ToString() ?? string.Empty,
                                Gender = reader["Gender"] == DBNull.Value ? null : reader["Gender"].ToString(),
                                DateOfBirth = reader["DateOfBirth"] == DBNull.Value ? null : Convert.ToDateTime(reader["DateOfBirth"]),
                                CellPhone = reader["CellPhone"] == DBNull.Value ? null : reader["CellPhone"].ToString(),
                                Email = reader["Email"] == DBNull.Value ? null : reader["Email"].ToString(),
                                HasSystemUser = Convert.ToBoolean(reader["HasSystemUser"])
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
    }
}