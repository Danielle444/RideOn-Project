using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // DB-free source-text contract coverage for the DBServices.Connect() connection-string
    // caching fix, following the same technique already established in this project
    // (RescheduleCompetitionContractTests, HealthCertificateApprovalContractTests): bounded
    // source-text assertions instead of a mocking framework or a live DB connection.
    //
    // What this file is guarding: Connect(string) must keep returning a brand-new
    // NpgsqlConnection on every call while no longer rebuilding IConfigurationRoot (and its
    // FileSystemWatcher instances) on every call — the connection-string VALUE is resolved
    // once per key and cached; the connection OBJECT is never cached or shared.
    public class DBServicesConnectionCachingContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ReadServerFile(params string[] relativeParts)
        {
            string[] parts = new string[relativeParts.Length + 2];
            parts[0] = TestSourceDirectory();
            parts[1] = "..";
            Array.Copy(relativeParts, 0, parts, 2, relativeParts.Length);

            string path = Path.GetFullPath(Path.Combine(parts));

            File.Exists(path).Should().BeTrue("expected file at {0}", path);

            return File.ReadAllText(path);
        }

        private static string DBServicesSource()
        {
            return ReadServerFile("RideOnServer", "DAL", "DBServices.cs");
        }

        private static string ConnectMethodBody()
        {
            string source = DBServicesSource();

            int from = source.IndexOf(
                "protected NpgsqlConnection Connect(string conStr)",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "Connect(string) was expected in DBServices");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "protected NpgsqlCommand CreateCommandWithStoredProcedure(",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        private static string ResolveConnectionStringMethodBody()
        {
            string source = DBServicesSource();

            int from = source.IndexOf(
                "private static string ResolveConnectionString(string conStr)",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "ResolveConnectionString(string) was expected in DBServices");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "protected NpgsqlConnection Connect(string conStr)",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void Connect_signature_remains_protected_and_unchanged()
        {
            DBServicesSource().Should().Contain("protected NpgsqlConnection Connect(string conStr)");
        }

        [Fact]
        public void Connect_still_returns_a_brand_new_NpgsqlConnection_and_never_caches_the_connection_object()
        {
            string body = ConnectMethodBody();

            body.Should().Contain("return new NpgsqlConnection(");
            body.Should().NotContain("new ConfigurationBuilder(");
            body.Should().NotContain(".Build()");
        }

        [Fact]
        public void A_static_thread_safe_connection_string_cache_exists_keyed_by_name()
        {
            DBServicesSource().Should().Contain(
                "private static readonly ConcurrentDictionary<string, Lazy<string>> _connectionStringCache");
        }

        [Fact]
        public void The_cache_uses_ExecutionAndPublication_thread_safety_mode()
        {
            DBServicesSource().Should().Contain("LazyThreadSafetyMode.ExecutionAndPublication");
        }

        [Fact]
        public void The_resolver_builds_and_immediately_disposes_a_fresh_IConfigurationRoot()
        {
            string body = ResolveConnectionStringMethodBody();

            body.Should().Contain("new ConfigurationBuilder()");
            body.Should().Contain(".Build();");
            body.Should().Contain("(configuration as IDisposable)?.Dispose();");
        }

        [Fact]
        public void The_resolver_preserves_the_exact_existing_configuration_precedence_order()
        {
            string body = ResolveConnectionStringMethodBody();

            int basePathAt = body.IndexOf("SetBasePath(Directory.GetCurrentDirectory())", StringComparison.Ordinal);
            int appSettingsAt = body.IndexOf("AddJsonFile(\"appsettings.json\", optional: false, reloadOnChange: false)", StringComparison.Ordinal);
            int devSettingsAt = body.IndexOf("AddJsonFile(\"appsettings.Development.json\", optional: true, reloadOnChange: false)", StringComparison.Ordinal);
            int userSecretsAt = body.IndexOf("AddUserSecrets<Program>(optional: true)", StringComparison.Ordinal);
            int envVarsAt = body.IndexOf("AddEnvironmentVariables()", StringComparison.Ordinal);
            int getConnStringAt = body.IndexOf("GetConnectionString(conStr)", StringComparison.Ordinal);

            basePathAt.Should().BeGreaterThan(-1);
            appSettingsAt.Should().BeGreaterThan(-1);
            devSettingsAt.Should().BeGreaterThan(-1);
            userSecretsAt.Should().BeGreaterThan(-1);
            envVarsAt.Should().BeGreaterThan(-1);
            getConnStringAt.Should().BeGreaterThan(-1);

            // Exact precedence order preserved from the pre-fix implementation: base path,
            // appsettings.json, appsettings.Development.json, user secrets, environment
            // variables (last provider wins), then the connection-string lookup.
            basePathAt.Should().BeLessThan(appSettingsAt);
            appSettingsAt.Should().BeLessThan(devSettingsAt);
            devSettingsAt.Should().BeLessThan(userSecretsAt);
            userSecretsAt.Should().BeLessThan(envVarsAt);
            envVarsAt.Should().BeLessThan(getConnStringAt);
        }

        [Fact]
        public void A_missing_or_blank_connection_string_throws_naming_only_the_configuration_key()
        {
            string body = ResolveConnectionStringMethodBody();

            body.Should().Contain("string.IsNullOrWhiteSpace(value)");
            body.Should().Contain("throw new InvalidOperationException($\"Connection string '{conStr}' is not configured.\");");
        }

        [Fact]
        public void GetDefaultConnection_behavior_and_signature_are_unchanged()
        {
            string source = DBServicesSource();

            source.Should().Contain("public static NpgsqlConnection GetDefaultConnection()");
            source.Should().Contain("db.Connect(\"DefaultConnection\")");
        }
    }
}
