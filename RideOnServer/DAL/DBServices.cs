using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;

namespace RideOnServer.DAL
{
    public class DBServices
    {
        protected SqlConnection Connect(string conStr)
        {
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .AddJsonFile("appsettings.json")
                .Build();

            string cStr = configuration.GetConnectionString(conStr)!;

            return new SqlConnection(cStr);
        }

        protected SqlCommand CreateCommandWithStoredProcedure(
            string spName,
            SqlConnection con,
            Dictionary<string, object>? paramDic)
        {
            SqlCommand cmd = new SqlCommand
            {
                Connection = con,
                CommandText = spName,
                CommandTimeout = 10,
                CommandType = System.Data.CommandType.StoredProcedure
            };

            if (paramDic != null)
            {
                foreach (var param in paramDic)
                {
                    cmd.Parameters.AddWithValue(param.Key, param.Value ?? DBNull.Value);
                }
            }

            return cmd;
        }
    }
}