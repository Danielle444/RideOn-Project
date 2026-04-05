using Npgsql;
using Microsoft.Extensions.Configuration;

namespace RideOnServer.DAL
{
    public class DBServices
    {
        protected NpgsqlConnection Connect(string conStr)
        {
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .AddJsonFile("appsettings.json")
                .Build();

            string cStr = configuration.GetConnectionString(conStr)!;

            return new NpgsqlConnection(cStr);
        }

        protected NpgsqlCommand CreateCommandWithStoredProcedure(
            string spName,
            NpgsqlConnection con,
            Dictionary<string, object>? paramDic)
        {
            NpgsqlCommand cmd = new NpgsqlCommand
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