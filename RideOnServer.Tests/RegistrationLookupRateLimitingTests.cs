using System.Threading.RateLimiting;
using FluentAssertions;
using RideOnServer.RateLimiting;

namespace RideOnServer.Tests
{
    // P0 PII-hardening audit (fix/person-lookup-pii-hardening): functional
    // coverage of the actual sliding-window limiter, built with the exact
    // constants Program.cs configures via RegistrationLookupRateLimiting.
    // System.Threading.RateLimiting ships in the shared framework (net8.0,
    // Microsoft.NET.Sdk.Web), so this instantiates a real limiter and proves
    // its accept/reject behavior with no HTTP host and no mocking.
    public class RegistrationLookupRateLimitingFunctionalTests
    {
        private static SlidingWindowRateLimiter NewLimiter()
        {
            return new SlidingWindowRateLimiter(new SlidingWindowRateLimiterOptions
            {
                PermitLimit = RegistrationLookupRateLimiting.PermitLimit,
                Window = RegistrationLookupRateLimiting.Window,
                SegmentsPerWindow = RegistrationLookupRateLimiting.SegmentsPerWindow,
                QueueLimit = RegistrationLookupRateLimiting.QueueLimit,
                AutoReplenishment = false
            });
        }

        [Fact]
        public void PermitLimit_IsWithinTheApprovedConservativeRange()
        {
            RegistrationLookupRateLimiting.PermitLimit.Should().BeInRange(5, 10);
            RegistrationLookupRateLimiting.Window.Should().Be(TimeSpan.FromMinutes(1));
        }

        [Fact]
        public void RequestsUnderTheLimit_AreAllPermitted()
        {
            using SlidingWindowRateLimiter limiter = NewLimiter();

            for (int i = 0; i < RegistrationLookupRateLimiting.PermitLimit; i++)
            {
                using RateLimitLease lease = limiter.AttemptAcquire(1);
                lease.IsAcquired.Should().BeTrue($"request {i + 1} of {RegistrationLookupRateLimiting.PermitLimit} is within the limit");
            }
        }

        [Fact]
        public void RequestExceedingTheLimit_IsRejected()
        {
            using SlidingWindowRateLimiter limiter = NewLimiter();

            for (int i = 0; i < RegistrationLookupRateLimiting.PermitLimit; i++)
            {
                limiter.AttemptAcquire(1).Dispose();
            }

            using RateLimitLease overLimitLease = limiter.AttemptAcquire(1);
            overLimitLease.IsAcquired.Should().BeFalse("the permit budget for the window is exhausted");
        }

        [Fact]
        public void QueueLimitIsZero_RejectionIsImmediateNotQueued()
        {
            // QueueLimit = 0 means AttemptAcquire must reject synchronously
            // instead of letting a caller wait for the next replenishment --
            // callers must see 429 promptly, not hang.
            RegistrationLookupRateLimiting.QueueLimit.Should().Be(0);
        }
    }

    // Source-text contract for how the limiter is wired into the pipeline.
    // There is no HTTP test host in this project (confirmed: no
    // Microsoft.AspNetCore.Mvc.Testing package reference), so the pipeline
    // registration, policy scoping, and middleware order are proven by
    // reading the real Program.cs / PersonsController.cs source -- the same
    // technique already established in this project for pipeline-shaped
    // concerns (see StallAssignmentsHostRanchAuthorizationTests).
    public class RegistrationLookupRateLimitingWiringContractTests
    {
        private static string TestSourceDirectory([System.Runtime.CompilerServices.CallerFilePath] string callerFilePath = "")
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

        private static string ProgramSource() => ReadServerFile("RideOnServer", "Program.cs");

        private static string PersonsControllerSource() =>
            ReadServerFile("RideOnServer", "Controllers", "PersonsController.cs");

        [Fact]
        public void Program_RegistersRateLimiterServices()
        {
            ProgramSource().Should().Contain("builder.Services.AddRateLimiter(");
        }

        [Fact]
        public void Program_DefinesTheNamedPolicyUsedByThePersonsController()
        {
            ProgramSource().Should().Contain(
                "options.AddPolicy(RegistrationLookupRateLimiting.PolicyName,");
        }

        [Fact]
        public void Program_PartitionsBySlidingWindowKeyedOnRemoteIpAddress()
        {
            string source = ProgramSource();

            source.Should().Contain("RateLimitPartition.GetSlidingWindowLimiter(");
            source.Should().Contain("httpContext.Connection.RemoteIpAddress");
        }

        [Fact]
        public void Program_RejectsWith429()
        {
            ProgramSource().Should().Contain("options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;");
        }

        [Fact]
        public void Program_OnRejected_NeverReferencesTheNationalIdOrRawQueryString()
        {
            string source = ProgramSource();
            int from = source.IndexOf("options.OnRejected = async", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);
            int to = source.IndexOf("options.AddPolicy(", from, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);
            string onRejectedBody = source.Substring(from, to - from);

            onRejectedBody.Should().NotContainEquivalentOf("nationalId");
            onRejectedBody.Should().NotContain("QueryString");
            onRejectedBody.Should().NotContain(".Query[");
        }

        [Fact]
        public void Program_UsesRateLimiterMiddleware_AfterAuthorizationAndBeforeMapControllers()
        {
            string source = ProgramSource();

            int authorizationIndex = source.IndexOf("app.UseAuthorization();", StringComparison.Ordinal);
            int rateLimiterIndex = source.IndexOf("app.UseRateLimiter();", StringComparison.Ordinal);
            int mapControllersIndex = source.IndexOf("app.MapControllers();", StringComparison.Ordinal);

            authorizationIndex.Should().BeGreaterThan(-1);
            rateLimiterIndex.Should().BeGreaterThan(-1);
            mapControllersIndex.Should().BeGreaterThan(-1);

            rateLimiterIndex.Should().BeGreaterThan(authorizationIndex,
                "rate limiting must apply after authorization runs");
            mapControllersIndex.Should().BeGreaterThan(rateLimiterIndex,
                "rate limiting must be wired before endpoints are mapped");
        }

        [Fact]
        public void PersonsController_OnlyTheNationalIdLookupActionCarriesThePolicy()
        {
            string source = PersonsControllerSource();

            source.Should().Contain(
                "[EnableRateLimiting(RegistrationLookupRateLimiting.PolicyName)]");

            // The attribute is scoped to the action, not the whole controller
            // (which would apply it to every future endpoint added here).
            source.Should().NotMatchRegex(
                @"\[EnableRateLimiting\([^)]*\)\]\s*\[ApiController\]");
            source.Should().NotMatchRegex(
                @"\[ApiController\]\s*\[EnableRateLimiting\([^)]*\)\]\s*public class");
        }

        [Fact]
        public void Program_DoesNotRegisterRateLimitingGlobally()
        {
            string source = ProgramSource();

            // A global policy would either omit AddPolicy entirely in favor of
            // a default/global limiter, or call UseRateLimiter with a
            // catch-all. Neither pattern should appear: the only limiter
            // configured is the named per-route policy.
            source.Should().NotContain("options.GlobalLimiter");
            source.Should().NotMatchRegex(@"app\.UseRateLimiter\(\s*[^)]+\s*\)");
        }
    }
}
