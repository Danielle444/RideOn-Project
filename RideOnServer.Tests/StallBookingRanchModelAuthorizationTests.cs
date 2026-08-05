using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // Ranch-model fix, Phase 2 (2026-08-05): source-text coverage of the
    // Controller-layer authorization changes for StallBookingsController and
    // ShavingsOrdersController. Same constraint and technique as
    // ChangeEntryRequestCreateAuthorizationTests.cs (no HTTP test host, no
    // mocking framework in this project) -- these tests read the real
    // Controller source and assert on exact strings/branch order/content,
    // proving what value each authorization check actually runs against.
    public class StallBookingRanchModelAuthorizationTests
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

        private static string StallBookingsControllerSource()
        {
            return ReadServerFile("RideOnServer", "Controllers", "StallBookingsController.cs");
        }

        private static string ShavingsOrdersControllerSource()
        {
            return ReadServerFile("RideOnServer", "Controllers", "ShavingsOrdersController.cs");
        }

        // =====================================================================
        // Item 1 / 2 / 6: plain horse-stall creation. Authorization must run
        // against the server-derived horse ranch, never request.RanchId, and
        // the derivation must happen before the authorization call so a
        // conflicting/malicious request.RanchId cannot influence it.
        // =====================================================================

        private static string CreateStallBookingBody()
        {
            return ExtractMethodBody(
                StallBookingsControllerSource(),
                "public ActionResult<int> CreateStallBooking(",
                "[HttpGet(\"horses-for-booking\")]");
        }

        [Fact]
        public void CreateStallBooking_DerivesHorseRanchIdBeforeAuthorizing()
        {
            string body = CreateStallBookingBody();

            body.Should().Contain("new HorseDAL().GetHorseRanchId(request.HorseId)");

            int deriveAt = body.IndexOf("GetHorseRanchId(request.HorseId)", StringComparison.Ordinal);
            int authAt = body.IndexOf("UserAccessValidator.EnsureUserHasAnyRoleInRanch(", StringComparison.Ordinal);

            deriveAt.Should().BeGreaterThan(-1);
            authAt.Should().BeGreaterThan(-1);
            deriveAt.Should().BeLessThan(authAt, "the horse's ranch must be known before authorization runs");
        }

        [Fact]
        public void CreateStallBooking_AuthorizesAgainstTheDerivedHorseRanchIdNotRequestRanchId()
        {
            string body = CreateStallBookingBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    horseRanchId.Value,\n                    RoleNames.RanchAdmin,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));

            // A conflicting/malicious request.RanchId must have zero effect on
            // the authorization target -- pin that the call site does not use
            // request.RanchId at all for this decision.
            int authAt = body.IndexOf("UserAccessValidator.EnsureUserHasAnyRoleInRanch(", StringComparison.Ordinal);
            int authEnd = body.IndexOf(");", authAt, StringComparison.Ordinal);
            string authCall = body.Substring(authAt, authEnd - authAt);

            authCall.Should().NotContain("request.RanchId");
        }

        [Fact]
        public void CreateStallBooking_DerivesHostRanchFromCompetitionAndOverwritesRequestRanchIdBeforeTheDalCall()
        {
            string body = CreateStallBookingBody();

            body.Should().Contain("new CompetitionDAL().GetCompetitionById(request.CompetitionId)");
            body.Should().Contain("request.RanchId = competition.HostRanchId;");

            int overwriteAt = body.IndexOf("request.RanchId = competition.HostRanchId;", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("StallBookingDAL.CreateStallBooking(request);", StringComparison.Ordinal);

            overwriteAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            overwriteAt.Should().BeLessThan(dalCallAt,
                "request.RanchId must hold the derived host ranch before the DAL call reads it");
        }

        [Fact]
        public void CreateStallBooking_MissingHorseReturnsNotFoundMissingCompetitionReturnsNotFound()
        {
            string body = CreateStallBookingBody();

            body.Should().Contain("if (horseRanchId == null)");
            body.Should().Contain("if (competition == null)");

            // Bounded to each branch's own block, mirroring
            // ChangeEntryRequestCreateAuthorizationTests' ExtractBracedBlock
            // technique -- proves association, not mere co-occurrence.
            int horseCheckAt = body.IndexOf("if (horseRanchId == null)", StringComparison.Ordinal);
            int horseBlockStart = body.IndexOf("{", horseCheckAt, StringComparison.Ordinal);
            int horseBlockEnd = body.IndexOf("}", horseBlockStart, StringComparison.Ordinal);
            string horseBlock = body.Substring(horseBlockStart, horseBlockEnd - horseBlockStart);
            horseBlock.Should().Contain("NotFound(");

            int compCheckAt = body.IndexOf("if (competition == null)", StringComparison.Ordinal);
            int compBlockStart = body.IndexOf("{", compCheckAt, StringComparison.Ordinal);
            int compBlockEnd = body.IndexOf("}", compBlockStart, StringComparison.Ordinal);
            string compBlock = body.Substring(compBlockStart, compBlockEnd - compBlockStart);
            compBlock.Should().Contain("NotFound(");
        }

        // =====================================================================
        // Item 3 / 4: tack-stall creation. RequestingRanchId is required and
        // is the sole authorization target.
        // =====================================================================

        private static string CreateTackStallBookingsBody()
        {
            return ExtractMethodBody(
                StallBookingsControllerSource(),
                "public IActionResult CreateTackStallBookings(",
                "[HttpPost(\"cancel-request\")]");
        }

        [Fact]
        public void CreateTackStallBookings_ResolvesRequestingRanchIdBeforeAuthorizing()
        {
            string body = CreateTackStallBookingsBody();

            // Backward-compat fallback (2026-08-06): the raw field guard was
            // replaced by a resolved value covering both the new client
            // (RequestingRanchId) and the old, currently-installed mobile
            // client (RanchId). See TackRequestingRanchIdFallbackTests.cs for
            // the resolution logic's own direct behavioral coverage.
            body.Should().Contain("ResolveTackRequestingRanchId(");
            body.Should().Contain("if (resolvedRequestingRanchId <= 0)");

            int resolveAt = body.IndexOf("ResolveTackRequestingRanchId(", StringComparison.Ordinal);
            int requireAt = body.IndexOf("if (resolvedRequestingRanchId <= 0)", StringComparison.Ordinal);
            int authAt = body.IndexOf("UserAccessValidator.EnsureUserHasAnyRoleInRanch(", StringComparison.Ordinal);

            resolveAt.Should().BeGreaterThan(-1);
            requireAt.Should().BeGreaterThan(-1);
            authAt.Should().BeGreaterThan(-1);
            resolveAt.Should().BeLessThan(requireAt, "the value must be resolved before it is validated");
            requireAt.Should().BeLessThan(authAt, "the resolved value must be validated before it is used for authorization");
        }

        [Fact]
        public void CreateTackStallBookings_AuthorizesAgainstTheResolvedValueNotRanchIdOrHostRanch()
        {
            string body = CreateTackStallBookingsBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    resolvedRequestingRanchId,\n                    RoleNames.RanchAdmin,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));

            int authAt = body.IndexOf("UserAccessValidator.EnsureUserHasAnyRoleInRanch(", StringComparison.Ordinal);
            int authEnd = body.IndexOf(");", authAt, StringComparison.Ordinal);
            string authCall = body.Substring(authAt, authEnd - authAt);

            authCall.Should().NotContain("request.RanchId");
            authCall.Should().NotContain("HostRanchId");
        }

        [Fact]
        public void CreateTackStallBookings_ResolutionNeverReceivesCompetitionHostRanchId()
        {
            string body = CreateTackStallBookingsBody();

            int resolveAt = body.IndexOf("ResolveTackRequestingRanchId(", StringComparison.Ordinal);
            int resolveEnd = body.IndexOf(");", resolveAt, StringComparison.Ordinal);
            string resolveCall = body.Substring(resolveAt, resolveEnd - resolveAt);

            // The resolver only ever sees request.RequestingRanchId and
            // request.RanchId -- Competition.HostRanchId is not known yet at
            // this point in the method (derived later, see the next test),
            // and must never become a third fallback source.
            resolveCall.Should().Contain("request.RequestingRanchId");
            resolveCall.Should().Contain("request.RanchId");
            resolveCall.Should().NotContain("HostRanchId");
        }

        [Fact]
        public void CreateTackStallBookings_ResolvedValueIsWrittenBackBeforeTheDalCall()
        {
            string body = CreateTackStallBookingsBody();

            body.Should().Contain("request.RequestingRanchId = resolvedRequestingRanchId;");

            int writeAt = body.IndexOf("request.RequestingRanchId = resolvedRequestingRanchId;", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("StallBookingDAL.CreateTackStallBookings(request);", StringComparison.Ordinal);

            writeAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            writeAt.Should().BeLessThan(dalCallAt,
                "the DAL call reads request.RequestingRanchId, so the resolved value must be written back first");
        }

        [Fact]
        public void CreateTackStallBookings_DerivesHostRanchFromCompetitionAndOverwritesRanchIdBeforeTheDalCall()
        {
            string body = CreateTackStallBookingsBody();

            body.Should().Contain("new CompetitionDAL().GetCompetitionById(request.CompetitionId)");
            body.Should().Contain("request.RanchId = competition.HostRanchId;");

            int overwriteAt = body.IndexOf("request.RanchId = competition.HostRanchId;", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("StallBookingDAL.CreateTackStallBookings(request);", StringComparison.Ordinal);

            overwriteAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            overwriteAt.Should().BeLessThan(dalCallAt);
        }

        // =====================================================================
        // Item 9: secretary create-for-payer authorizes against the derived
        // Competition.HostRanchId, not request.RanchId, and forwards
        // RequestingRanchId to the BL/DAL call.
        // =====================================================================

        private static string SecretaryCreateStallBookingForPayerBody()
        {
            string source = StallBookingsControllerSource();
            int from = source.IndexOf(
                "public IActionResult SecretaryCreateStallBookingForPayer(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);
            return source.Substring(from);
        }

        [Fact]
        public void SecretaryCreateStallBookingForPayer_AuthorizesAgainstCompetitionHostRanchIdNotRequestRanchId()
        {
            string body = SecretaryCreateStallBookingForPayerBody();

            body.Should().Contain("new CompetitionDAL().GetCompetitionById(request.CompetitionId)");
            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    personId,\n                    competition.HostRanchId,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));

            int authAt = body.IndexOf("UserAccessValidator.EnsureUserHasRoleInRanch(", StringComparison.Ordinal);
            int authEnd = body.IndexOf(");", authAt, StringComparison.Ordinal);
            string authCall = body.Substring(authAt, authEnd - authAt);

            authCall.Should().NotContain("request.RanchId");
        }

        [Fact]
        public void SecretaryCreateStallBookingForPayer_ForwardsRequestingRanchIdToTheBlCall()
        {
            string body = SecretaryCreateStallBookingForPayerBody();

            body.Should().Contain("request.RequestingRanchId);");
        }

        // =====================================================================
        // Item 5: shavings creation derives one requesting ranch from the
        // selected stalls, rejects mixed/missing stalls BEFORE ever calling
        // ShavingsOrderDAL.CreateShavingsOrder, and authorizes against the
        // derived ranch, not request.RanchId.
        // =====================================================================

        private static string CreateShavingsOrderBody()
        {
            return ExtractMethodBody(
                ShavingsOrdersControllerSource(),
                "public ActionResult<int> CreateShavingsOrder(",
                "[HttpGet(\"stall-bookings-for-order\")]");
        }

        [Fact]
        public void CreateShavingsOrder_DerivesRequestingRanchFromStallsBeforeAuthorizing()
        {
            string body = CreateShavingsOrderBody();

            body.Should().Contain("StallBookingDAL.GetRequestingRanchIdsForStallBookings(stallBookingIds)");

            int deriveAt = body.IndexOf(
                "StallBookingDAL.GetRequestingRanchIdsForStallBookings(stallBookingIds)", StringComparison.Ordinal);
            int authAt = body.IndexOf("UserAccessValidator.EnsureUserHasAnyRoleInRanch(", StringComparison.Ordinal);

            deriveAt.Should().BeGreaterThan(-1);
            authAt.Should().BeGreaterThan(-1);
            deriveAt.Should().BeLessThan(authAt);
        }

        [Fact]
        public void CreateShavingsOrder_RejectsMissingOrMixedRequestingRanchesBeforeTheWriteCall()
        {
            string body = CreateShavingsOrderBody();

            body.Should().Contain("if (missingStallIds.Count > 0)");
            body.Should().Contain("if (distinctRequestingRanchIds.Count != 1)");

            int missingCheckAt = body.IndexOf("if (missingStallIds.Count > 0)", StringComparison.Ordinal);
            int mixedCheckAt = body.IndexOf("if (distinctRequestingRanchIds.Count != 1)", StringComparison.Ordinal);
            int writeCallAt = body.IndexOf("ShavingsOrderDAL.CreateShavingsOrder(request);", StringComparison.Ordinal);

            missingCheckAt.Should().BeGreaterThan(-1);
            mixedCheckAt.Should().BeGreaterThan(-1);
            writeCallAt.Should().BeGreaterThan(-1);

            missingCheckAt.Should().BeLessThan(writeCallAt, "missing-stall rejection must happen before the write");
            mixedCheckAt.Should().BeLessThan(writeCallAt, "mixed-ranch rejection must happen before the write");
        }

        [Fact]
        public void CreateShavingsOrder_AuthorizesAgainstTheDerivedRequestingRanchNotRequestRanchId()
        {
            string body = CreateShavingsOrderBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    requestingRanchId,\n                    RoleNames.RanchAdmin,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));

            int authAt = body.IndexOf("UserAccessValidator.EnsureUserHasAnyRoleInRanch(", StringComparison.Ordinal);
            int authEnd = body.IndexOf(");", authAt, StringComparison.Ordinal);
            string authCall = body.Substring(authAt, authEnd - authAt);

            authCall.Should().NotContain("request.RanchId");
        }

        [Fact]
        public void CreateShavingsOrder_DerivesHostRanchFromCompetitionAndOverwritesRanchIdBeforeTheDalCall()
        {
            string body = CreateShavingsOrderBody();

            body.Should().Contain("new CompetitionDAL().GetCompetitionById(request.CompetitionId)");
            body.Should().Contain("request.RanchId = competition.HostRanchId;");

            int overwriteAt = body.IndexOf("request.RanchId = competition.HostRanchId;", StringComparison.Ordinal);
            int dalCallAt = body.IndexOf("ShavingsOrderDAL.CreateShavingsOrder(request);", StringComparison.Ordinal);

            overwriteAt.Should().BeGreaterThan(-1);
            dalCallAt.Should().BeGreaterThan(-1);
            overwriteAt.Should().BeLessThan(dalCallAt);
        }

        // =====================================================================
        // Items 7/8/9 (unchanged-flow regression pins): change-request,
        // cancel-request, and secretary-update actions were traced and
        // confirmed correct as-is -- these tests pin that Phase 2 did not
        // touch them, guarding against accidental future drift.
        // =====================================================================

        [Fact]
        public void ChangeRequestAndCancelRequest_StillAuthorizeAgainstRequestRanchIdUnchanged()
        {
            string source = StallBookingsControllerSource();

            string changeBody = ExtractMethodBody(
                source,
                "public IActionResult CreateStallBookingChangeRequest(",
                "[HttpPost(\"cancel-by-payer\")]");
            changeBody.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    request.RanchId,\n                    RoleNames.RanchAdmin,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));

            string cancelBody = ExtractMethodBody(
                source,
                "public IActionResult CreateStallBookingCancelRequest(",
                "[HttpPost(\"change-request\")]");
            cancelBody.Should().Contain(
                "UserAccessValidator.EnsureUserHasAnyRoleInRanch(\n                    personId,\n                    request.RanchId,\n                    RoleNames.RanchAdmin,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void SecretaryUpdateStallBooking_StillAuthorizesAgainstRequestRanchIdUnchanged()
        {
            string source = StallBookingsControllerSource();

            string updateBody = ExtractMethodBody(
                source,
                "public IActionResult SecretaryUpdateStallBooking(",
                "[HttpPost(\"secretary/create-for-payer\")]");

            updateBody.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    personId,\n                    request.RanchId,\n                    RoleNames.HostSecretary\n                );"
                    .Replace("\n", Environment.NewLine));

            // Confirms this action was NOT given a CompetitionDAL lookup by
            // Phase 2 -- the pre-implementation trace concluded its existing
            // host-ranch behavior (re-derived internally by the SP itself)
            // was already correct and should not change.
            updateBody.Should().NotContain("CompetitionDAL");
        }
    }
}
