using Microsoft.Extensions.Configuration;
using Npgsql;
using NpgsqlTypes;
using System.Data;

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

            var builder = new NpgsqlConnectionStringBuilder(cStr);

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

            NpgsqlCommand cmd = new NpgsqlCommand
            {
                Connection = con,
                CommandText = "",
                CommandTimeout = 10,
                CommandType = CommandType.Text
            };

            if (paramDic != null)
            {
                int i = 1;

                foreach (var param in paramDic)
                {
                    string parameterName = $"p{i}";
                    paramList.Add($"@{parameterName}");

                    AddParameterWithType(cmd, parameterName, param.Key, param.Value);
                    i++;
                }
            }

            cmd.CommandText = $"SELECT * FROM {spName}({string.Join(", ", paramList)})";
            return cmd;
        }

        private void AddParameterWithType(
    NpgsqlCommand cmd,
    string parameterName,
    string originalKey,
    object? value)
        {
            string key = originalKey.TrimStart('@').ToLowerInvariant();

            if (key == "classdatetime")
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Timestamp);
                param.Value = value == null || value == DBNull.Value
                    ? DBNull.Value
                    : ((DateTime)value);
                return;
            }

            if (key == "competitionstartdate" ||
                key == "competitionenddate" ||
                key == "registrationopendate" ||
                key == "registrationenddate" ||
                key == "paidtimeregistrationdate" ||
                key == "paidtimepublicationdate" ||
                key == "slotdate")
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Date);
                param.Value = value == null || value == DBNull.Value
                    ? DBNull.Value
                    : ((DateTime)value).Date;
                return;
            }

            if (key == "starttime" || key == "endtime")
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Time);

                if (value == null || value == DBNull.Value)
                {
                    param.Value = DBNull.Value;
                }
                else if (value is TimeSpan ts)
                {
                    param.Value = ts;
                }
                else if (value is DateTime dt)
                {
                    param.Value = dt.TimeOfDay;
                }
                else
                {
                    param.Value = value;
                }

                return;
            }

            if (key.Contains("notes") ||
                key.Contains("name") ||
                key.Contains("status") ||
                key.Contains("text") ||
                key.Contains("url"))
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Text);
                param.Value = value == null || value == DBNull.Value
                    ? DBNull.Value
                    : value;
                return;
            }

            if (value == null || value == DBNull.Value)
            {
                cmd.Parameters.AddWithValue(parameterName, DBNull.Value);
                return;
            }

            if (value is int intValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Integer).Value = intValue;
                return;
            }

            if (value is short shortValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Smallint).Value = shortValue;
                return;
            }

            if (value is byte byteValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Smallint).Value = byteValue;
                return;
            }

            if (value is decimal decimalValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Numeric).Value = decimalValue;
                return;
            }

            if (value is double doubleValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Double).Value = doubleValue;
                return;
            }

            if (value is float floatValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Real).Value = floatValue;
                return;
            }

            if (value is bool boolValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Boolean).Value = boolValue;
                return;
            }

            if (value is string stringValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Text).Value = stringValue;
                return;
            }

            cmd.Parameters.AddWithValue(parameterName, value);
        }
    }
}