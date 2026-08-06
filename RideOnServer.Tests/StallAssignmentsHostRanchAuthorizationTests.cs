using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // Ranch-model fix (Bugs 2/3/4, 2026-08-06): source-text coverage of
    // StallAssignmentsController's compounds / assigned-prices / publish-status
    // reads, proving a non-host RanchAdmin's own active ranch (the
    // authorization ranch) is never used to fetch physical venue data, and
    // that the venue ranch is instead resolved through the Competition BL
    // layer's GetCompetitionById -- never a direct `new CompetitionDAL()` call
    // from the Controller (Controller -> BL -> DAL -> SP is required here;
    // Competition.GetCompetitionById is the established convention used at
    // 30+ call sites across the codebase, e.g. FinancialConfigController,
    // RegistrationStepStatusController, ClassesInCompetitionController).
    // Same source-reading technique as StallBookingRanchModelAuthorizationTests.cs
    // (no HTTP test host, no mocking framework in this project) -- these
    // tests read the real Controller source and assert on exact
    // strings/branch order/content.
    public class StallAssignmentsHostRanchAuthorizationTests
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

        private static string ExtractMethodBody(string source, string startMarker, string endMarker)
        {
            int from = source.IndexOf(startMarker, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "expected to find \"{0}\"", startMarker);

            int to = source.IndexOf(endMarker, from, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1, "expected to find \"{0}\" after \"{1}\"", endMarker, startMarker);

            return source.Substring(from, to - from);
        }

        private static string ControllerSource()
        {
            return ReadServerFile("RideOnServer", "Controllers", "StallAssignmentsController.cs");
        }

        // =====================================================================
        // Bug 2: GetCompounds ("compounds")
        // =====================================================================

        private static string GetCompoundsBody()
        {
            return ExtractMethodBody(
                ControllerSource(),
                "public IActionResult GetCompounds(",
                "[HttpGet(\"overview\")]");
        }

        [Fact]
        public void GetCompounds_AuthorizesAgainstRanchIdAsBeforeForBothHostSecretaryAndRanchAdmin()
        {
            string body = GetCompoundsBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.HostSecretary,\n                    RoleNames.RanchAdmin\n                );"
                    .Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void GetCompounds_WhenCompetitionIdIsSupplied_ResolvesHostRanchIdBeforeTheDalCall()
        {
            string body = GetCompoundsBody();

            body.Should().Contain("competitionId.HasValue");
            body.Should().Contain("Competition.GetCompetitionById(competitionId.Value)");
            body.Should().Contain("venueRanchId = competition.HostRanchId;");

            int resolveAt = body.IndexOf("GetCompetitionById(competitionId.Value)", StringComparison.Ordinal);
            int overwriteAt = body.IndexOf("venueRanchId = competition.HostRanchId;", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("dal.GetCompoundsWithLayout(venueRanchId)", StringComparison.Ordinal);

            resolveAt.Should().BeGreaterThan(-1);
            overwriteAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            resolveAt.Should().BeLessThan(overwriteAt, "the competition must be fetched before its host ranch is read");
            overwriteAt.Should().BeLessThan(dalCallAt, "venueRanchId must hold the host ranch before the DAL call reads it");
        }

        [Fact]
        public void GetCompounds_QueriesTheDalWithVenueRanchIdNeverTheRawRanchIdParameter()
        {
            string body = GetCompoundsBody();

            body.Should().Contain("dal.GetCompoundsWithLayout(venueRanchId)");
            body.Should().NotContain("dal.GetCompoundsWithLayout(ranchId)");
        }

        [Fact]
        public void GetCompounds_MissingCompetitionReturnsNotFound()
        {
            string body = GetCompoundsBody();

            body.Should().Contain("if (competition == null)");

            int checkAt = body.IndexOf("if (competition == null)", StringComparison.Ordinal);
            int blockStart = body.IndexOf("{", checkAt, StringComparison.Ordinal);
            int blockEnd = body.IndexOf("}", blockStart, StringComparison.Ordinal);
            string block = body.Substring(blockStart, blockEnd - blockStart);

            block.Should().Contain("NotFound(");
        }

        [Fact]
        public void GetCompounds_WithoutCompetitionIdFallsBackToRanchIdAsVenueRanch()
        {
            string body = GetCompoundsBody();

            // venueRanchId starts life as ranchId and is only overwritten inside
            // the `if (competitionId.HasValue)` branch -- proves older callers
            // (web ranch-level compound setup, the orphaned payer screen) that
            // never send competitionId keep the exact pre-fix behavior.
            body.Should().Contain("int venueRanchId = ranchId;");

            int initAt = body.IndexOf("int venueRanchId = ranchId;", StringComparison.Ordinal);
            int ifAt = body.IndexOf("if (competitionId.HasValue)", StringComparison.Ordinal);

            initAt.Should().BeGreaterThan(-1);
            ifAt.Should().BeGreaterThan(-1);
            initAt.Should().BeLessThan(ifAt);
        }

        // =====================================================================
        // Bug 3: GetAssignedStallPrices ("assigned-prices")
        // =====================================================================

        private static string GetAssignedStallPricesBody()
        {
            return ExtractMethodBody(
                ControllerSource(),
                "public IActionResult GetAssignedStallPrices(",
                "[HttpPost(\"booking\")]");
        }

        [Fact]
        public void GetAssignedStallPrices_AuthorizesAgainstRanchIdAsBeforeForBothHostSecretaryAndRanchAdmin()
        {
            string body = GetAssignedStallPricesBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.HostSecretary,\n                    RoleNames.RanchAdmin\n                );"
                    .Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void GetAssignedStallPrices_ResolvesHostRanchIdBeforeTheDalCallAndNeverUsesRawRanchId()
        {
            string body = GetAssignedStallPricesBody();

            body.Should().Contain("Competition.GetCompetitionById(competitionId)");
            body.Should().NotContain("new CompetitionDAL()");
            body.Should().Contain("dal.GetAssignedStallPrices(competitionId, competition.HostRanchId)");
            body.Should().NotContain("dal.GetAssignedStallPrices(competitionId, ranchId)");

            int resolveAt = body.IndexOf("GetCompetitionById(competitionId)", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("dal.GetAssignedStallPrices(competitionId, competition.HostRanchId)", StringComparison.Ordinal);

            resolveAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            resolveAt.Should().BeLessThan(dalCallAt);
        }

        [Fact]
        public void GetAssignedStallPrices_MissingCompetitionReturnsNotFound()
        {
            string body = GetAssignedStallPricesBody();

            body.Should().Contain("if (competition == null)");

            int checkAt = body.IndexOf("if (competition == null)", StringComparison.Ordinal);
            int blockStart = body.IndexOf("{", checkAt, StringComparison.Ordinal);
            int blockEnd = body.IndexOf("}", blockStart, StringComparison.Ordinal);
            string block = body.Substring(blockStart, blockEnd - blockStart);

            block.Should().Contain("NotFound(");
        }

        // =====================================================================
        // Bug 4: GetPublishStatus ("publish-status")
        // =====================================================================

        private static string GetPublishStatusBody()
        {
            return ExtractMethodBody(
                ControllerSource(),
                "public IActionResult GetPublishStatus(",
                "[HttpPost(\"publish\")]");
        }

        [Fact]
        public void GetPublishStatus_AuthorizesAgainstRanchIdAsBeforeForBothHostSecretaryAndRanchAdmin()
        {
            string body = GetPublishStatusBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.HostSecretary,\n                    RoleNames.RanchAdmin\n                );"
                    .Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void GetPublishStatus_ResolvesHostRanchIdBeforeTheDalCallAndNeverUsesRawRanchId()
        {
            string body = GetPublishStatusBody();

            body.Should().Contain("Competition.GetCompetitionById(competitionId)");
            body.Should().NotContain("new CompetitionDAL()");
            body.Should().Contain("dal.GetPublishStatus(competitionId, competition.HostRanchId)");
            body.Should().NotContain("dal.GetPublishStatus(competitionId, ranchId)");

            int resolveAt = body.IndexOf("GetCompetitionById(competitionId)", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("dal.GetPublishStatus(competitionId, competition.HostRanchId)", StringComparison.Ordinal);

            resolveAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            resolveAt.Should().BeLessThan(dalCallAt);
        }

        [Fact]
        public void GetPublishStatus_MissingCompetitionReturnsNotFoundBeforeTheDalCall()
        {
            string body = GetPublishStatusBody();

            body.Should().Contain("if (competition == null)");

            int checkAt = body.IndexOf("if (competition == null)", StringComparison.Ordinal);
            int blockStart = body.IndexOf("{", checkAt, StringComparison.Ordinal);
            int blockEnd = body.IndexOf("}", blockStart, StringComparison.Ordinal);
            string block = body.Substring(blockStart, blockEnd - blockStart);
            block.Should().Contain("NotFound(");

            int dalCallAt = body.IndexOf("dal.GetPublishStatus(", StringComparison.Ordinal);
            checkAt.Should().BeLessThan(dalCallAt, "the competition-existence guard must run before the DAL call");
        }

        // =====================================================================
        // Architecture guard: Controller -> BL -> DAL -> SP is required in
        // this codebase. The Controller must resolve HostRanchId through the
        // Competition BL layer only -- never by instantiating CompetitionDAL
        // itself (that would skip the BL layer, the mistake corrected here).
        // =====================================================================

        [Fact]
        public void Controller_NeverReferencesCompetitionDalDirectly()
        {
            string source = ControllerSource();

            source.Should().NotContain("CompetitionDAL",
                "StallAssignmentsController must resolve competitions through the Competition BL layer (Competition.GetCompetitionById), not by instantiating CompetitionDAL directly");
        }

        // =====================================================================
        // Regression pins: the HostSecretary-only write/management actions
        // (assign/unassign, publish/unpublish, overview) were traced and
        // confirmed correct as-is -- these tests pin that this fix did not
        // touch or broaden them, guarding against accidental future drift.
        // =====================================================================

        [Fact]
        public void WriteAndOverviewActions_StillAuthorizeHostSecretaryOnlyUnchanged()
        {
            string source = ControllerSource();

            string overviewBody = ExtractMethodBody(
                source, "public IActionResult GetAssignmentOverview(", "[HttpGet]");
            overviewBody.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));
            overviewBody.Should().NotContain("RoleNames.RanchAdmin");

            string assignBody = ExtractMethodBody(
                source, "public IActionResult AssignStallBooking(", "[HttpDelete(\"booking\")]");
            assignBody.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    personId,\n                    request.RanchId,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));

            string publishBody = ExtractMethodBody(
                source, "public IActionResult PublishStallMap(", "[HttpPost(\"unpublish\")]");
            publishBody.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    personId,\n                    request.RanchId,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));
            publishBody.Should().NotContain("CompetitionDAL");
        }

        [Fact]
        public void GetAssignments_StillIgnoresRanchIdForTheDataQueryUnchanged()
        {
            string body = ExtractMethodBody(
                ControllerSource(), "public IActionResult GetAssignments(", "[HttpGet(\"assigned-prices\")]");

            // Not one of Bugs 2/3/4 -- the DAL call already takes only
            // competitionId (ranchId is used purely for authorization). Pins
            // that this fix did not touch it.
            body.Should().Contain("dal.GetAssignments(competitionId)");
            body.Should().NotContain("CompetitionDAL");
        }
    }
}
