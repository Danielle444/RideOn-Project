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
            var paramList = new List<string>();
            var values = new List<object>();

            if (paramDic != null)
            {
                int i = 1;
                foreach (var param in paramDic)
                {
                    paramList.Add($"${i}");
                    values.Add(param.Value ?? DBNull.Value);
                    i++;
                }
            }

            string sql = $"SELECT * FROM {spName}({string.Join(", ", paramList)})";

            NpgsqlCommand cmd = new NpgsqlCommand
            {
                Connection = con,
                CommandText = sql,
                CommandTimeout = 10,
                CommandType = System.Data.CommandType.Text
            };

            foreach (var val in values)
            {
                cmd.Parameters.AddWithValue(val);
            }

            return cmd;
        }
    }
}