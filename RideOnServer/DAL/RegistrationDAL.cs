using Npgsql;

namespace RideOnServer.DAL
{
    public class RegistrationDAL : DBServices
    {
        public void SaveRegistrationToken(int personId, string tokenHash, DateTime expiresAt)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_personid",  personId },
                { "@p_tokenhash", tokenHash },
                { "@p_expiresat", expiresAt }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();
                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_SaveRegistrationToken", connection, paramDic))
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

        public (int TokenId, int PersonId)? GetValidRegistrationToken(string tokenHash)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_tokenhash", tokenHash }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();
                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_GetValidRegistrationToken", connection, paramDic))
                    using (NpgsqlDataReader reader = command.ExecuteReader())
                    {
                        if (reader.Read())
                        {
                            return (
                                Convert.ToInt32(reader["TokenId"]),
                                Convert.ToInt32(reader["PersonId"])
                            );
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

        public void CompletePayerRegistration(
            int tokenId, int personId,
            string passwordHash, string passwordSalt,
            string? firstName, string? lastName, string? cellPhone)
        {
            Dictionary<string, object> paramDic = new Dictionary<string, object>
            {
                { "@p_tokenid",      tokenId },
                { "@p_personid",     personId },
                { "@p_passwordhash", passwordHash },
                { "@p_passwordsalt", passwordSalt },
                { "@p_firstname",    (object?)firstName  ?? DBNull.Value },
                { "@p_lastname",     (object?)lastName   ?? DBNull.Value },
                { "@p_cellphone",    (object?)cellPhone  ?? DBNull.Value }
            };

            try
            {
                using (NpgsqlConnection connection = Connect("DefaultConnection"))
                {
                    connection.Open();
                    using (NpgsqlCommand command = CreateCommandWithStoredProcedure(
                        "usp_CompletePayerRegistration", connection, paramDic))
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
