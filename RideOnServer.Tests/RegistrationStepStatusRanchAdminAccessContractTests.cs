using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL.DTOs.RegistrationStepStatus;

namespace RideOnServer.Tests
{
    // Bug 1 fix (audit: "RanchAdmin authorization audit", 2026-08-06):
    // GET /api/RegistrationStepStatus/{competitionId}?ranchId=... incorrectly
    // required competition.HostRanchId == ranchId. Confirmed business rule: a
    // RanchAdmin operates for the ranch represented by activeRole.ranchId, and
    // that ranch does not need to host the competition to have real
    // registration activity in it (confirmed live: ranch 17 / competition 78).
    //
    // This project has no HTTP test host and no mocking framework (same
    // constraint noted in every other *ContractTests.cs file here, e.g.
    // RegistrationStepStatusIsRegistrationEndedContractTests.cs), so the
    // controller action and the SP cannot be invoked end to end from C#. This
    // file proves the fix the same way: bounded source-text assertions over
    // the real controller and proc files, plus a reflection check that the
    // response DTO's public shape is untouched.
    public class RegistrationStepStatusRanchAdminAccessContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ControllerSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(), "..", "RideOnServer", "Controllers",
                    "RegistrationStepStatusController.cs"));

            File.Exists(path).Should().BeTrue("RegistrationStepStatusController.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string ProcSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                    "220_usp_GetRegistrationStepStatus.sql"));

            File.Exists(path).Should().BeTrue("220_usp_GetRegistrationStepStatus.sql was expected at {0}", path);

            return File.ReadAllText(path);
        }

        // =================================================================
        // 1/2/3. Controller no longer rejects a non-host RanchAdmin, but the
        //    own-ranch RanchAdmin gate (EnsureUserHasRoleInRanch) is untouched
        //    -- proves host-ranch admins still succeed, non-host admins now
        //    succeed for their own ranch, and a RanchAdmin with no role at the
        //    supplied ranchId is still rejected (they can never reach another
        //    ranch's state by passing an arbitrary ranchId).
        // =================================================================

        [Fact]
        public void Controller_no_longer_compares_competition_hostranchid_to_the_supplied_ranchid()
        {
            string source = ControllerSource();

            source.Should().NotContain(
                "competition.HostRanchId != ranchId",
                "a RanchAdmin's own ranch is not required to host the competition (confirmed business rule)");

            source.Should().NotContain(
                "אין לך הרשאה לצפות בנתוני ההרשמה של תחרות זו",
                "the host-ranch-mismatch 403 message must be fully removed, not just its trigger condition");
        }

        [Fact]
        public void Controller_still_gates_on_ranchadmin_role_at_the_supplied_ranchid()
        {
            // Line-ending agnostic (this checkout's files are CRLF, but the source
            // of truth here is the sequence of statements, not the terminator byte).
            string normalized = ControllerSource().Replace("\r\n", "\n");

            normalized.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.RanchAdmin\n                );",
                "the own-ranch RanchAdmin check is the ONLY ranch gate left -- it must still run against the " +
                "caller-supplied ranchId, so a caller without RanchAdmin there (or querying another ranch's id) " +
                "is still rejected");
        }

        [Fact]
        public void Unauthorizedaccessexception_from_the_role_check_still_maps_to_403()
        {
            string source = ControllerSource();

            source.Should().Contain("catch (UnauthorizedAccessException ex)");
            source.Should().Contain("StatusCode(StatusCodes.Status403Forbidden, ex.Message)");
        }

        // =================================================================
        // 4. Missing competition still returns the existing expected response
        //    -- this check is untouched by the fix.
        // =================================================================

        [Fact]
        public void Missing_competition_still_returns_notfound_with_the_existing_message()
        {
            string source = ControllerSource();

            source.Should().Contain("if (competition == null)");
            source.Should().Contain("return NotFound(\"התחרות לא נמצאה\");");
        }

        // =================================================================
        // 6. Response shape (the DTO's public property set) is unchanged --
        //    the fix touches only authorization, never the data contract.
        // =================================================================

        [Fact]
        public void The_dto_public_property_set_is_unchanged_by_the_authorization_fix()
        {
            string[] expectedProperties =
            {
                "CompetitionEndDate", "IsCompetitionEnded",
                "PaidTimeRegistrationDate", "HasPaidTimeSlots", "HasActivePaidTimePrice",
                "PaidTimeConfigured", "PaidTimeReadyToBook", "IsPaidTimeWindowOpen",
                "HasAdminCreatedActiveEntry", "HasManagedPayerWithActiveEntry", "HasRelevantActiveEntry",
                "HasAdminCreatedActiveNonTackStallBooking", "HasManagedPayerWithActiveNonTackStallBooking",
                "HasRelevantActiveNonTackStallBooking",
                "IsRegistrationEnded"
            };

            PropertyInfo[] actualProperties = typeof(RegistrationStepStatus)
                .GetProperties(BindingFlags.Public | BindingFlags.Instance);

            actualProperties.Select(p => p.Name).Should().BeEquivalentTo(
                expectedProperties,
                "the authorization fix must not add, remove, or rename any field on the response DTO");
        }

        // =================================================================
        // 2/7. Proc: the host-ranch gate is gone from the comp CTE, but every
        //    downstream signal still filters independently on p_ranchid --
        //    proving status calculations stay ranch-scoped even without the
        //    hostranchid check, so a caller can never see another ranch's data.
        // =================================================================

        [Fact]
        public void Proc_comp_cte_no_longer_filters_on_hostranchid()
        {
            string source = ProcSource();

            int whereStart = source.IndexOf("WHERE c.competitionid = p_competitionid", StringComparison.Ordinal);
            int cteEnd = source.IndexOf("),", whereStart, StringComparison.Ordinal);

            whereStart.Should().BeGreaterThan(-1, "the comp CTE must still filter by competitionid");
            cteEnd.Should().BeGreaterThan(whereStart);

            string whereClause = source.Substring(whereStart, cteEnd - whereStart);

            // The comp CTE may still SELECT c.hostranchid (harmless, unused downstream) --
            // only the WHERE clause's equality filter on it must be gone.
            whereClause.Should().NotContain(
                "hostranchid",
                "the comp CTE's WHERE clause must no longer require hostranchid = p_ranchid; only the " +
                "downstream per-signal p_ranchid filters should scope the ranch now");
        }

        [Theory]
        [InlineData("h.ranchid = p_ranchid")]
        [InlineData("sb.ranchid = p_ranchid")]
        [InlineData("pc.ranchid = p_ranchid")]
        [InlineData("prr.ranchid = p_ranchid")]
        public void Every_signal_still_scopes_independently_on_p_ranchid(string expectedFilter)
        {
            string source = ProcSource();

            source.Should().Contain(
                expectedFilter,
                "removing the comp-level hostranchid gate is only safe because each signal keeps its own " +
                "p_ranchid filter -- {0} must still be present", expectedFilter);
        }

        [Fact]
        public void Sb_ranchid_filter_appears_for_both_admin_created_and_managed_payer_stall_signals()
        {
            string source = ProcSource();

            int firstIndex = source.IndexOf("sb.ranchid = p_ranchid", StringComparison.Ordinal);
            firstIndex.Should().BeGreaterThan(-1);

            int secondIndex = source.IndexOf("sb.ranchid = p_ranchid", firstIndex + 1, StringComparison.Ordinal);
            secondIndex.Should().BeGreaterThan(-1,
                "both HasAdminCreatedActiveNonTackStallBooking and HasManagedPayerWithActiveNonTackStallBooking " +
                "must independently scope on p_ranchid");
        }
    }
}
