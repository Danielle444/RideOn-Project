using Npgsql;

namespace RideOnServer.DAL
{
    public class OtpDAL : DBServices
    {
        public void SaveOtp(string email, string otpHash, DateTime expiresAt)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@email", email },
                { "@otphash", otpHash },
                { "@expiresat", expiresAt }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_SaveEmailOtp", connection, paramDic);
            command.ExecuteNonQuery();
        }

        public (int OtpId, string OtpHash)? GetValidOtp(string email)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@email", email }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_GetValidEmailOtp", connection, paramDic);
            using NpgsqlDataReader reader = command.ExecuteReader();

            if (reader.Read())
            {
                return (
                    Convert.ToInt32(reader["OtpId"]),
                    reader["OtpHash"].ToString()!
                );
            }

            return null;
        }

        public void MarkOtpAsUsed(int otpId)
        {
            var paramDic = new Dictionary<string, object>
            {
                { "@otpid", otpId }
            };

            using NpgsqlConnection connection = Connect("DefaultConnection");
            connection.Open();
            using NpgsqlCommand command = CreateCommandWithStoredProcedure(
                "usp_MarkOtpAsUsed", connection, paramDic);
            command.ExecuteNonQuery();
        }
    }
}
