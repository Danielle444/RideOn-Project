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
            Dictionary<string, object?>? paramDic)
        {
            var paramPlaceholders = new List<string>();

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
                    paramPlaceholders.Add($"@{parameterName}");

                    AddParameterWithType(cmd, parameterName, param.Key, param.Value);
                    i++;
                }
            }

            cmd.CommandText = $"SELECT * FROM {spName}({string.Join(", ", paramPlaceholders)})";
            return cmd;
        }

        private void AddParameterWithType(
            NpgsqlCommand cmd,
            string parameterName,
            string originalKey,
            object? value)
        {
            string key = originalKey.TrimStart('@').ToLowerInvariant();

            // NULL handling
            if (value == null || value == DBNull.Value)
            {
                cmd.Parameters.AddWithValue(parameterName, DBNull.Value);
                return;
            }

            // JSON / JSONB
            if (key.Contains("json") ||
                key.Contains("payers") ||
                key.Contains("stalls"))
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Jsonb);
                param.Value = value;
                return;
            }

            // Date-only fields
            if (key == "competitionstartdate" ||
                key == "competitionenddate" ||
                key == "registrationopendate" ||
                key == "registrationenddate" ||
                key == "paidtimeregistrationdate" ||
                key == "paidtimepublicationdate" ||
                key == "slotdate" ||
                key == "startDate" ||
                key == "endDate" ||
                key == "startdate" ||
                key == "enddate")
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Date);

                if (value is DateTime dt)
                {
                    param.Value = dt.Date;
                }
                else
                {
                    param.Value = value;
                }

                return;
            }

            // Time-only fields
            if (key == "starttime" || key == "endtime")
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Time);

                if (value is TimeSpan ts)
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

            // Timestamp without timezone fields
            if (key == "requesteddeliverytime")
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Timestamp);
                param.Value = value;
                return;
            }

            // Timestamp with timezone fields
            if (key == "classdatetime" ||
                key == "prequestdatetime" ||
                key == "srequestdatetime" ||
                key == "dateopened" ||
                key == "dateclosed" ||
                key == "requestdate" ||
                key == "deliveryphotodate" ||
                key == "approvedat")
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.TimestampTz);
                param.Value = value;
                return;
            }

            // Timestamp without timezone fields that exist in DB as plain timestamp
            if (key == "approvaldate" ||
                key == "arrivaltime" ||
                key == "responsetime" ||
                key == "assignedstarttime")
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Timestamp);
                param.Value = value;
                return;
            }

            // Text fields
            if (key.Contains("notes") ||
                key.Contains("name") ||
                key.Contains("status") ||
                key.Contains("text") ||
                key.Contains("url"))
            {
                var param = cmd.Parameters.Add(parameterName, NpgsqlDbType.Text);
                param.Value = value;
                return;
            }

            // Primitive types
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

            if (value is DateTime dateTimeValue)
            {
                // Safe fallback for DateTime values שלא זוהו לפי שם
                cmd.Parameters.Add(parameterName, NpgsqlDbType.TimestampTz).Value = dateTimeValue;
                return;
            }

            if (value is TimeSpan timeSpanValue)
            {
                cmd.Parameters.Add(parameterName, NpgsqlDbType.Time).Value = timeSpanValue;
                return;
            }

            cmd.Parameters.AddWithValue(parameterName, value);
        }

        public static NpgsqlConnection GetDefaultConnection()
        {
            DBServices db = new DBServices();
            return db.Connect("DefaultConnection");
        }
    }
}