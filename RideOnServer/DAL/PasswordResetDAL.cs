using Npgsql;

namespace RideOnServer.DAL
{
    public class PasswordResetDAL : DBServices
    {
        public void SaveResetToken(int systemUserId, string tokenHash, DateTime expiresAt)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@systemuserid", systemUserId },
                { "@tokenhash", tokenHash },
                { "@expiresat", expiresAt }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_SavePasswordResetToken", connection, paramDic);
            command.ExecuteNonQuery();
        }

        public (int TokenId, int SystemUserId)? GetValidToken(string tokenHash)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@tokenhash", tokenHash }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_GetValidPasswordResetToken", connection, paramDic);
            using NpgsqlDataReader reader = command.ExecuteReader();

            if (reader.Read())
            {
                return (
                    Convert.ToInt32(reader["TokenId"]),
                    Convert.ToInt32(reader["SystemUserId"])
                );
            }

            return null;
        }

        public void MarkTokenAsUsed(int tokenId)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@tokenid", tokenId }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_MarkResetTokenAsUsed", connection, paramDic);
            command.ExecuteNonQuery();
        }

        public (int SystemUserId, string Username, bool IsActive)? GetSystemUserByEmail(string email)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@email", email }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_GetSystemUserByEmail", connection, paramDic);
            using NpgsqlDataReader reader = command.ExecuteReader();

            if (reader.Read())
            {
                return (
                    Convert.ToInt32(reader["SystemUserId"]),
                    reader["Username"].ToString()!,
                    Convert.ToBoolean(reader["IsActive"])
                );
            }

            return null;
        }
    }
}
