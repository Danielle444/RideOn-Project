using Microsoft.Extensions.Configuration;
using Npgsql;
using NpgsqlTypes;
using System.Collections.Concurrent;
using System.Data;
using System.Threading;

namespace RideOnServer.DAL
{
    public class DBServices
    {
        // Connection-string values only ever come from env vars in every environment this app
        // runs in (Render, local dev, tests) and are set before the process serves requests, so
        // resolving once per key and caching is safe. A failed resolution is cached too (Lazy<T>
        // does not retry after a factory exception) — a process with missing/invalid DB
        // configuration can't serve correctly anyway, so this fails fast until restart.
        private static readonly ConcurrentDictionary<string, Lazy<string>> _connectionStringCache = new();

        // Supabase's Supavisor session-mode pooler caps this project at 15 concurrent
        // client connections (the "pool_size: 15" in the EMAXCONNSESSION error). Npgsql's
        // own client-side pool defaults to 100, so a single burst of parallel requests
        // (the admin registration screen alone fans out ~9 DB calls on mount) can open
        // more physical connections than the pooler allows and fail. We clamp Npgsql's
        // Maximum Pool Size safely under the pooler limit so it QUEUES excess callers
        // instead of exceeding the cap, and reap idle connections quickly so freed slots
        // return to the pooler for any other backend sharing it (e.g. a local dev backend
        // running against the same live database). The headroom below 15 also absorbs the
        // pooler's own overhead and that occasional second backend.
        private const int SafeMaxPoolSize = 12;
        private const int IdleConnectionLifetimeSeconds = 30;
        private const int PoolPruningIntervalSeconds = 10;

        private static string ResolveConnectionString(string conStr)
        {
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
                .AddJsonFile("appsettings.Development.json", optional: true, reloadOnChange: false)
                .AddUserSecrets<Program>(optional: true)
                .AddEnvironmentVariables()
                .Build();

            try
            {
                string? value = configuration.GetConnectionString(conStr);

                if (string.IsNullOrWhiteSpace(value))
                {
                    throw new InvalidOperationException($"Connection string '{conStr}' is not configured.");
                }

                return ApplyPoolingSafeguards(value);
            }
            finally
            {
                (configuration as IDisposable)?.Dispose();
            }
        }

        // Normalizes the configured connection string so Npgsql can never open more
        // physical connections than the Supavisor pooler accepts. A smaller
        // env-provided Maximum Pool Size is respected as-is; anything larger (including
        // Npgsql's default of 100) is clamped down to SafeMaxPoolSize.
        private static string ApplyPoolingSafeguards(string rawConnectionString)
        {
            try
            {
                NpgsqlConnectionStringBuilder builder = new NpgsqlConnectionStringBuilder(rawConnectionString)
                {
                    Pooling = true,
                    MinPoolSize = 0,
                    ConnectionIdleLifetime = IdleConnectionLifetimeSeconds,
                    ConnectionPruningInterval = PoolPruningIntervalSeconds,
                };

                if (builder.MaxPoolSize > SafeMaxPoolSize)
                {
                    builder.MaxPoolSize = SafeMaxPoolSize;
                }

                return builder.ConnectionString;
            }
            catch (Exception)
            {
                // If the configured string can't be parsed here for any reason, fall back
                // to using it verbatim (the prior behavior). NpgsqlConnection will still
                // surface any genuine format problem when it opens.
                return rawConnectionString;
            }
        }

        protected NpgsqlConnection Connect(string conStr)
        {
            string cStr = _connectionStringCache
                .GetOrAdd(conStr, key => new Lazy<string>(
                    () => ResolveConnectionString(key),
                    LazyThreadSafetyMode.ExecutionAndPublication))
                .Value;

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
                key == "newcompetitionstartdate" ||
                key == "newcompetitionenddate" ||
                key == "registrationopendate" ||
                key == "registrationenddate" ||
                key == "paidtimeregistrationdate" ||
                key == "paidtimepublicationdate" ||
                key == "slotdate" ||
                key == "datefrom" ||
                key == "dateto" ||
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