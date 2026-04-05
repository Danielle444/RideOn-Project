using Microsoft.Extensions.Configuration;
using Npgsql;

namespace RideOnServer.DAL
{
    public class DBServices
    {
        protected NpgsqlConnection Connect(string conStr)
        {
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile("appsettings.Development.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables()
                .Build();

            string cStr = configuration.GetConnectionString(conStr)!;

            var builder = new Npgsql.NpgsqlConnectionStringBuilder(cStr);

            Console.WriteLine("=== DB HOST === " + builder.Host);
            Console.WriteLine("=== DB PORT === " + builder.Port);
            Console.WriteLine("=== DB USER === " + builder.Username);
            Console.WriteLine("=== DB DATABASE === " + builder.Database);

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