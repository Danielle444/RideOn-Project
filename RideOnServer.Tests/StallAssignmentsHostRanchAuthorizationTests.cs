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
        public void GetCompounds_AuthorizesAgainstRanchIdForHostSecretaryRanchAdminAndPayer()
        {
            string body = GetCompoundsBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.HostSecretary,\n                    RoleNames.RanchAdmin,\n                    RoleNames.Payer\n                );"
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
            // the `if (competitionId.HasValue)` branch -- proves older PRIVILEGED
            // callers (web ranch-level compound setup) that never send
            // competitionId keep the exact pre-fix behavior. A Payer-only caller
            // can still reach this line, but is blocked afterwards by the
            // isPrivileged gate below before ever reaching the DAL call -- see
            // GetCompounds_PayerOnly_* tests.
            body.Should().Contain("int venueRanchId = ranchId;");

            int initAt = body.IndexOf("int venueRanchId = ranchId;", StringComparison.Ordinal);
            int ifAt = body.IndexOf("if (competitionId.HasValue)", StringComparison.Ordinal);

            initAt.Should().BeGreaterThan(-1);
            ifAt.Should().BeGreaterThan(-1);
            initAt.Should().BeLessThan(ifAt);
        }

        // =====================================================================
        // Blocker 1 (2026-08-07): a Payer-only caller (no HostSecretary/
        // RanchAdmin in this ranch) must be blocked server-side from reading
        // compounds for an unpublished map or via the ranch-only fallback --
        // never relying on the mobile button being hidden.
        // =====================================================================

        [Fact]
        public void GetCompounds_ComputesIsPrivilegedFromHostSecretaryAndRanchAdminOnly_NeverPayer()
        {
            string body = GetCompoundsBody();

            body.Should().Contain(
                "bool isPrivileged = UserAccessValidator.HasUserAnyRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.HostSecretary,\n                    RoleNames.RanchAdmin\n                );"
                    .Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void GetCompounds_PayerOnly_WithoutCompetitionId_Is403BeforeTheDalCall()
        {
            string body = GetCompoundsBody();

            body.Should().Contain("if (!isPrivileged)");
            body.Should().Contain("if (competition == null)\n                    {\n                        return StatusCode(StatusCodes.Status403Forbidden, \"נדרש מזהה תחרות לצפייה במפת התאים\");"
                .Replace("\n", Environment.NewLine));

            int gateAt = body.IndexOf("if (!isPrivileged)", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("dal.GetCompoundsWithLayout(venueRanchId)", StringComparison.Ordinal);

            gateAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            gateAt.Should().BeLessThan(dalCallAt, "the Payer-only gate must run before the DAL call");
        }

        [Fact]
        public void GetCompounds_PayerOnly_UnpublishedMapIs403ViaTheSharedHelper()
        {
            string body = GetCompoundsBody();

            body.Should().Contain("IsStallMapPublished(competitionId!.Value, competition.HostRanchId)");

            int gateAt = body.IndexOf("if (!isPrivileged)", StringComparison.Ordinal);
            int publishedCheckAt = body.IndexOf("IsStallMapPublished(", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("dal.GetCompoundsWithLayout(venueRanchId)", StringComparison.Ordinal);

            gateAt.Should().BeGreaterThan(-1);
            publishedCheckAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            gateAt.Should().BeLessThan(publishedCheckAt);
            publishedCheckAt.Should().BeLessThan(dalCallAt, "the publish check must run before the DAL call");
        }

        [Fact]
        public void GetCompounds_IsPrivilegedIsComputedBeforeTheGateCheck()
        {
            string body = GetCompoundsBody();

            int isPrivilegedAt = body.IndexOf("bool isPrivileged =", StringComparison.Ordinal);
            int gateAt = body.IndexOf("if (!isPrivileged)", StringComparison.Ordinal);

            isPrivilegedAt.Should().BeGreaterThan(-1);
            gateAt.Should().BeGreaterThan(-1);
            isPrivilegedAt.Should().BeLessThan(gateAt);
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
        public void GetPublishStatus_AuthorizesAgainstRanchIdForHostSecretaryRanchAdminAndPayer()
        {
            string body = GetPublishStatusBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.HostSecretary,\n                    RoleNames.RanchAdmin,\n                    RoleNames.Payer\n                );"
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
                ControllerSource(), "public IActionResult GetAssignments(", "[HttpGet(\"payer-map\")]");

            // Not one of Bugs 2/3/4 -- the DAL call already takes only
            // competitionId (ranchId is used purely for authorization). Pins
            // that this fix did not touch it.
            body.Should().Contain("dal.GetAssignments(competitionId)");
            body.Should().NotContain("CompetitionDAL");
        }

        // =====================================================================
        // Blocker 2 (2026-08-07): GetAssignments returns full identifying
        // detail (StallBookingId, BookingRanchId/Name, HorseId, ProductName,
        // unconditional HorseName/BarnName) for EVERY assignment in the
        // competition -- correct for HostSecretary/RanchAdmin, never safe for
        // Payer. GetAssignments must stay exactly as it was on main before
        // this slice (HostSecretary + RanchAdmin only); Payer reads the
        // redacted GetAssignmentsForPayer endpoint below instead.
        // =====================================================================

        [Fact]
        public void GetAssignments_IsPayerFree_RestoredToHostSecretaryAndRanchAdminOnly()
        {
            string body = ExtractMethodBody(
                ControllerSource(), "public IActionResult GetAssignments(", "[HttpGet(\"payer-map\")]");

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.HostSecretary,\n                    RoleNames.RanchAdmin\n                );"
                    .Replace("\n", Environment.NewLine));
            body.Should().NotContain("RoleNames.Payer");
        }

        // =====================================================================
        // Mobile stall-map slice 1, corrected (2026-08-07): Payer gets
        // read-only access to exactly three surfaces -- compounds (gated,
        // above), publish-status (never sensitive, unconditional), and the
        // NEW dedicated payer-map endpoint (redacted projection). GetAssignments
        // (full detail) is Payer-free again. Every write endpoint and the
        // pricing/overview reads stay HostSecretary-only (or HostSecretary+
        // RanchAdmin) exactly as pinned above.
        // =====================================================================

        private static string GetAssignmentsForPayerBody()
        {
            return ExtractMethodBody(
                ControllerSource(),
                "public IActionResult GetAssignmentsForPayer(",
                "[HttpGet(\"assigned-prices\")]");
        }

        [Fact]
        public void GetAssignmentsForPayer_IsARoutedGetOnPayerMap()
        {
            string source = ControllerSource();

            source.Should().Contain("[HttpGet(\"payer-map\")]");

            int routeAt = source.IndexOf("[HttpGet(\"payer-map\")]", StringComparison.Ordinal);
            int methodAt = source.IndexOf("public IActionResult GetAssignmentsForPayer(", StringComparison.Ordinal);

            routeAt.Should().BeGreaterThan(-1);
            methodAt.Should().BeGreaterThan(-1);
            routeAt.Should().BeLessThan(methodAt, "the route attribute must sit directly above the method");
        }

        [Fact]
        public void GetAssignmentsForPayer_AuthorizesPayerOnly_NeverHostSecretaryOrRanchAdmin()
        {
            string body = GetAssignmentsForPayerBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    personId,\n                    ranchId,\n                    RoleNames.Payer\n                );"
                    .Replace("\n", Environment.NewLine));
            body.Should().NotContain("RoleNames.HostSecretary");
            body.Should().NotContain("RoleNames.RanchAdmin");
            body.Should().NotContain("EnsureUserHasAnyRoleInRanch");
        }

        [Fact]
        public void GetAssignmentsForPayer_CompetitionIdIsARequiredNonNullableRouteParameter()
        {
            string body = GetAssignmentsForPayerBody();

            body.Should().Contain("[FromQuery] int competitionId");
            body.Should().NotContain("int? competitionId");
        }

        [Fact]
        public void GetAssignmentsForPayer_ResolvesHostRanchServerSide_NeverUsesRanchIdAsVenue()
        {
            string body = GetAssignmentsForPayerBody();

            body.Should().Contain("Competition.GetCompetitionById(competitionId)");
            body.Should().NotContain("new CompetitionDAL()");
            body.Should().NotContain("dal.GetAssignmentsForPayer(competitionId, ranchId)");
        }

        [Fact]
        public void GetAssignmentsForPayer_MissingCompetitionReturnsNotFoundBeforeThePublishCheck()
        {
            string body = GetAssignmentsForPayerBody();

            body.Should().Contain("if (competition == null)");

            int checkAt = body.IndexOf("if (competition == null)", StringComparison.Ordinal);
            int blockStart = body.IndexOf("{", checkAt, StringComparison.Ordinal);
            int blockEnd = body.IndexOf("}", blockStart, StringComparison.Ordinal);
            string block = body.Substring(blockStart, blockEnd - blockStart);
            block.Should().Contain("NotFound(");

            int publishCheckAt = body.IndexOf("IsStallMapPublished(", StringComparison.Ordinal);
            checkAt.Should().BeLessThan(publishCheckAt, "the competition-existence guard must run before the publish check");
        }

        [Fact]
        public void GetAssignmentsForPayer_UnpublishedMapIs403BeforeTheDalCall()
        {
            string body = GetAssignmentsForPayerBody();

            body.Should().Contain("IsStallMapPublished(competitionId, competition.HostRanchId)");
            body.Should().Contain("StatusCodes.Status403Forbidden");

            int publishCheckAt = body.IndexOf("IsStallMapPublished(", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("dal.GetAssignmentsForPayer(", StringComparison.Ordinal);

            publishCheckAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            publishCheckAt.Should().BeLessThan(dalCallAt);
        }

        [Fact]
        public void GetAssignmentsForPayer_ForcesPayerPersonIdFromClaims_NeverARequestField()
        {
            string body = GetAssignmentsForPayerBody();

            body.Should().Contain("int personId = UserAccessValidator.GetPersonIdFromClaims(User);");
            body.Should().Contain("dal.GetAssignmentsForPayer(competitionId, personId)");

            // The only integer identifiers this method reads from the request
            // are competitionId and ranchId (authorization only) -- no
            // payerPersonId/PersonId ever arrives as a query/body parameter.
            body.Should().NotContain("[FromQuery] int payerPersonId");
            body.Should().NotContain("request.PayerPersonId");
        }

        [Fact]
        public void GetAssignmentsForPayer_NeverAuthorizesHostSecretaryOrRanchAdmin_PayerOnlySurface()
        {
            string body = GetAssignmentsForPayerBody();

            body.Should().NotContain("HasUserAnyRoleInRanch");
        }

        // =====================================================================
        // Shared publish-status gate: exactly one helper, used by both
        // GetCompounds (Payer branch) and GetAssignmentsForPayer, so the two
        // enforcement points can never independently drift.
        // =====================================================================

        [Fact]
        public void IsStallMapPublished_ExistsOnceAndIsUsedByBothPayerGates()
        {
            string source = ControllerSource();

            int definitionCount = 0;
            int searchFrom = 0;
            while (true)
            {
                int idx = source.IndexOf("private static bool IsStallMapPublished(", searchFrom, StringComparison.Ordinal);
                if (idx < 0) break;
                definitionCount++;
                searchFrom = idx + 1;
            }

            definitionCount.Should().Be(1, "the publish gate must be defined exactly once and shared");

            string compoundsBody = GetCompoundsBody();
            string payerMapBody = GetAssignmentsForPayerBody();

            compoundsBody.Should().Contain("IsStallMapPublished(");
            payerMapBody.Should().Contain("IsStallMapPublished(");
        }

        [Fact]
        public void IsStallMapPublished_ReadsThroughTheExistingGetPublishStatusDalMethod()
        {
            string source = ControllerSource();
            int from = source.IndexOf("private static bool IsStallMapPublished(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);
            string helperBody = source.Substring(from);

            helperBody.Should().Contain("dal.GetPublishStatus(competitionId, hostRanchId)");
            helperBody.Should().Contain("status != null && status.IsPublished");
        }

        // =====================================================================
        // No permission broadening: exactly three GET surfaces carry Payer
        // (compounds, publish-status, payer-map); GetAssignments (full
        // detail), assigned-prices, overview, and every write/publish/
        // unpublish endpoint stay off-limits to Payer.
        // =====================================================================

        [Fact]
        public void PayerRole_NeverAppearsOutsideCompoundsPublishStatusAndPayerMap()
        {
            string source = ControllerSource();

            string[] payerAllowedMethodStarts =
            {
                "public IActionResult GetCompounds(",
                "public IActionResult GetPublishStatus(",
                "public IActionResult GetAssignmentsForPayer(",
            };

            string[] methodBoundaries =
            {
                "public IActionResult GetCompounds(",
                "public IActionResult GetAssignmentOverview(",
                "public IActionResult GetAssignments(",
                "public IActionResult GetAssignmentsForPayer(",
                "public IActionResult GetAssignedStallPrices(",
                "public IActionResult AssignStallBooking(",
                "public IActionResult UnassignStallBooking(",
                "public IActionResult GetPublishStatus(",
                "public IActionResult PublishStallMap(",
                "public IActionResult UnpublishStallMap(",
            };

            for (int i = 0; i < methodBoundaries.Length; i++)
            {
                string start = methodBoundaries[i];

                int from = source.IndexOf(start, StringComparison.Ordinal);
                from.Should().BeGreaterThan(-1, "expected to find \"{0}\"", start);

                int to;
                if (i + 1 < methodBoundaries.Length)
                {
                    to = source.IndexOf(methodBoundaries[i + 1], from, StringComparison.Ordinal);
                    to.Should().BeGreaterThan(-1, "expected to find \"{0}\" after \"{1}\"", methodBoundaries[i + 1], start);
                }
                else
                {
                    to = source.Length;
                }

                string body = source.Substring(from, to - from);
                bool shouldAllowPayer = Array.IndexOf(payerAllowedMethodStarts, start) >= 0;

                if (shouldAllowPayer)
                {
                    body.Should().Contain("RoleNames.Payer", "{0} is an approved Payer surface", start);
                }
                else
                {
                    body.Should().NotContain("RoleNames.Payer", "{0} must stay off-limits to Payer", start);
                }
            }
        }
    }
}
