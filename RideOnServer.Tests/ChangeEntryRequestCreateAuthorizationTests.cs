using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // Stage 1 security-hardening slice: POST /api/ChangeEntryRequests must
    // become RanchAdmin-only, Model-C-scoped, competition-matched, and
    // blocked after the competition ends.
    //
    // This project has no HTTP test host and no mocking framework (same
    // constraint noted in every other *ContractTests.cs / *GuardTests.cs file
    // here), so the Controller action itself cannot be invoked end to end.
    // Two techniques are used instead, exactly as in
    // UpdateCompetitionDateGuardTests.cs and RescheduleCompetitionContractTests.cs:
    //   1. A REAL behavioral test of the one piece of branching logic that
    //      lives in C# (the new-entry competition/ranch mismatch check),
    //      reproduced exactly as it appears in the controller.
    //   2. Bounded source-text assertions proving every check exists, runs in
    //      the right order, and maps to the exact required status code -
    //      never by parsing exception text for the pre-write classification.
    public class ChangeEntryRequestCreateAuthorizationTests
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

        // =================================================================
        // 1. The one piece of branching logic that lives in C#, exercised for
        //    real. Mirrors the exact expression in
        //    ChangeEntryRequestsController.Create:
        //    ctx.NewEntryCompetitionId != ctx.ActualCompetitionId ||
        //    ctx.NewEntryHostRanchId != ctx.HostRanchId
        // =================================================================

        private static bool NewEntryMismatches(
            int? newEntryCompetitionId, int? actualCompetitionId,
            int? newEntryHostRanchId, int? hostRanchId)
        {
            return newEntryCompetitionId != actualCompetitionId ||
                   newEntryHostRanchId != hostRanchId;
        }

        [Fact]
        public void Same_competition_and_ranch_does_not_trip_the_new_entry_mismatch_guard()
        {
            NewEntryMismatches(7, 7, 11, 11).Should().BeFalse(
                "a new entry created in the same competition and ranch as the original must be accepted");
        }

        [Fact]
        public void A_different_new_entry_competition_trips_the_guard()
        {
            NewEntryMismatches(8, 7, 11, 11).Should().BeTrue();
        }

        [Fact]
        public void A_different_new_entry_ranch_trips_the_guard()
        {
            NewEntryMismatches(7, 7, 49, 11).Should().BeTrue();
        }

        [Fact]
        public void Both_competition_and_ranch_mismatched_trips_the_guard()
        {
            NewEntryMismatches(8, 7, 49, 11).Should().BeTrue();
        }

        // =================================================================
        // 2. Source-text: every check exists, in the right order, with the
        //    exact required status codes - no exception-text parsing for
        //    pre-write classification.
        // =================================================================

        private static string ControllerSource()
        {
            return ReadServerFile("RideOnServer", "Controllers", "ChangeEntryRequestsController.cs");
        }

        private static string CreateMethodBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult Create(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "Create was expected in ChangeEntryRequestsController");

            string rest = source.Substring(from);

            // Bounded to the next action in the file - Create ends there.
            int to = rest.IndexOf(
                "[HttpPost(\"cancel-by-payer\")]",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        // Extracts the braced block belonging to a specific "if (...)" or
        // "catch (...)" marker - proves a statement belongs to THAT branch
        // specifically, not merely that it appears somewhere else in the same
        // method. Same brace-counting technique already used inline by
        // New_entry_checks_only_run_for_non_cancellation_requests, generalized
        // for reuse and for any brace-opening marker (if or catch).
        private static string ExtractBracedBlock(string source, string marker)
        {
            int markerAt = source.IndexOf(marker, StringComparison.Ordinal);
            markerAt.Should().BeGreaterThan(-1, "expected to find \"{0}\"", marker);

            int blockStart = source.IndexOf("{", markerAt);
            blockStart.Should().BeGreaterThan(-1, "expected an opening brace after \"{0}\"", marker);

            int depth = 1;
            int i = blockStart + 1;
            while (depth > 0 && i < source.Length)
            {
                if (source[i] == '{') depth++;
                else if (source[i] == '}') depth--;
                i++;
            }

            depth.Should().Be(0, "expected a matching closing brace for \"{0}\"", marker);

            return source.Substring(blockStart, i - blockStart);
        }

        [Fact]
        public void PersonId_is_derived_from_claims_only_never_from_the_request_body()
        {
            string body = CreateMethodBody();

            body.Should().Contain("UserAccessValidator.GetPersonIdFromClaims(User)");

            // CreateChangeEntryRequestDTO has no PersonId/RanchId field at all -
            // pin that the controller never invents one from the request body.
            body.Should().NotContain("dto.PersonId");
            body.Should().NotContain("dto.RanchId");
        }

        [Fact]
        public void The_authorization_context_call_runs_before_any_mutation()
        {
            string body = CreateMethodBody();

            int ctxAt = body.IndexOf(
                "ChangeEntryRequest.GetAuthorizationContext(",
                StringComparison.Ordinal);
            int mutateAt = body.IndexOf(
                "ChangeEntryRequest.CreateRequest(",
                StringComparison.Ordinal);

            ctxAt.Should().BeGreaterThan(-1);
            mutateAt.Should().BeGreaterThan(-1);
            ctxAt.Should().BeLessThan(mutateAt, "authorization must be classified before the write");
        }

        [Fact]
        public void Entry_not_found_returns_404_before_any_other_check()
        {
            string body = CreateMethodBody();

            body.Should().Contain("if (!ctx.EntryExists)");

            int notFoundCheckAt = body.IndexOf("if (!ctx.EntryExists)", StringComparison.Ordinal);
            int notFoundReturnAt = body.IndexOf("return NotFound(\"Original entry not found\");", StringComparison.Ordinal);
            int competitionMismatchAt = body.IndexOf("if (ctx.ActualCompetitionId != dto.CompetitionId)", StringComparison.Ordinal);

            notFoundReturnAt.Should().BeGreaterThan(-1);
            competitionMismatchAt.Should().BeGreaterThan(-1);
            notFoundCheckAt.Should().BeLessThan(competitionMismatchAt,
                "existence must be checked before the competition match");
        }

        [Fact]
        public void Competition_mismatch_returns_400()
        {
            string body = CreateMethodBody();

            // Bounded to the mismatch branch's own braces - "return BadRequest("
            // and "StatusCodes.Status409Conflict" both also occur elsewhere in
            // this method (the new-entry mismatch branch and the generic
            // catch-all also return BadRequest; the ended branch and the
            // ValidationException catch also use 409), so an unbounded Contain
            // check on the whole method body would pass even if THIS branch
            // returned the wrong thing. Extracting the branch's own block
            // proves association, not mere co-occurrence.
            string mismatchBlock = ExtractBracedBlock(
                body, "if (ctx.ActualCompetitionId != dto.CompetitionId)");

            mismatchBlock.Should().Contain("return BadRequest(");
            mismatchBlock.Should().NotContain("StatusCodes.Status409Conflict");
            mismatchBlock.Should().NotContain("NotFound(");
            mismatchBlock.Should().NotContain("throw new UnauthorizedAccessException(");
        }

        [Fact]
        public void RanchAdmin_role_check_runs_through_the_existing_validator_with_the_entrys_real_ranch()
        {
            string body = CreateMethodBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    personId,\n                    ctx.HostRanchId ?? 0,\n                    RoleNames.RanchAdmin\n                );"
                    .Replace("\n", Environment.NewLine));

            int roleCheckAt = body.IndexOf(
                "UserAccessValidator.EnsureUserHasRoleInRanch(",
                StringComparison.Ordinal);
            int modelCAt = body.IndexOf("if (!ctx.IsWithinModelCScope)", StringComparison.Ordinal);

            roleCheckAt.Should().BeGreaterThan(-1);
            modelCAt.Should().BeGreaterThan(-1);
            roleCheckAt.Should().BeLessThan(modelCAt, "role must be checked before Model C ownership");
        }

        [Fact]
        public void Model_C_ownership_failure_throws_unauthorized_mapped_to_403()
        {
            string body = CreateMethodBody();

            // Bounded to the Model C branch's own braces - the controller has a
            // second "throw new UnauthorizedAccessException(" site (the new-entry
            // not-created-by-caller branch), so an unbounded Contain check on the
            // whole method body would pass even if THIS branch didn't throw at
            // all. Extracting the branch's own block proves association.
            string modelCBlock = ExtractBracedBlock(body, "if (!ctx.IsWithinModelCScope)");

            modelCBlock.Should().Contain("throw new UnauthorizedAccessException(");
            modelCBlock.Should().NotContain("return BadRequest(");
            modelCBlock.Should().NotContain("NotFound(");
            modelCBlock.Should().NotContain("StatusCodes.Status409Conflict");

            int modelCAt = body.IndexOf("if (!ctx.IsWithinModelCScope)", StringComparison.Ordinal);
            int endedAt = body.IndexOf("if (ctx.IsCompetitionEnded)", StringComparison.Ordinal);

            modelCAt.Should().BeGreaterThan(-1);
            endedAt.Should().BeGreaterThan(-1);
            modelCAt.Should().BeLessThan(endedAt, "ownership must be checked before the competition-ended cutoff");

            // The throw above is only meaningful if it actually reaches a 403 -
            // bounded to the existing UnauthorizedAccessException catch's own
            // braces, proving THAT specific catch (not some other catch) maps
            // to 403 Forbidden.
            string source = ControllerSource();
            string unauthorizedCatchBlock = ExtractBracedBlock(
                source, "catch (UnauthorizedAccessException ex)");

            unauthorizedCatchBlock.Should().Contain("StatusCodes.Status403Forbidden");
        }

        [Fact]
        public void Competition_ended_returns_409()
        {
            string body = CreateMethodBody();

            // Bounded to the ended branch's own braces - "StatusCodes.Status409Conflict"
            // also occurs in the ValidationException catch below, so an unbounded
            // Contain check on the whole method body would pass even if THIS
            // branch returned the wrong status code. Extracting the branch's own
            // block proves association, not mere co-occurrence.
            string endedBlock = ExtractBracedBlock(body, "if (ctx.IsCompetitionEnded)");

            endedBlock.Should().Contain("StatusCodes.Status409Conflict");
            endedBlock.Should().NotContain("BadRequest(");
            endedBlock.Should().NotContain("NotFound(");
            endedBlock.Should().NotContain("throw new UnauthorizedAccessException(");
        }

        [Fact]
        public void New_entry_checks_only_run_for_non_cancellation_requests()
        {
            string body = CreateMethodBody();

            int guardAt = body.IndexOf("if (!dto.IsCancelled)", StringComparison.Ordinal);
            guardAt.Should().BeGreaterThan(-1);

            int blockStart = body.IndexOf("{", guardAt);
            int depth = 1;
            int i = blockStart + 1;
            while (depth > 0 && i < body.Length)
            {
                if (body[i] == '{') depth++;
                else if (body[i] == '}') depth--;
                i++;
            }

            string newEntryBlock = body.Substring(blockStart, i - blockStart);

            newEntryBlock.Should().Contain("ctx.NewEntryExists");
            newEntryBlock.Should().Contain("ctx.NewEntryCompetitionId");
            newEntryBlock.Should().Contain("ctx.NewEntryHostRanchId");
            newEntryBlock.Should().Contain("ctx.NewEntryCreatedByAdmin");
        }

        [Fact]
        public void New_entry_missing_returns_404_mismatch_returns_400_not_created_by_caller_throws_unauthorized()
        {
            string body = CreateMethodBody();

            body.Should().Contain("return NotFound(\"New entry not found\");");
            body.Should().Contain(
                "return BadRequest(\n                            \"New entry does not belong to the same competition or ranch as the original entry\"\n                        );"
                    .Replace("\n", Environment.NewLine));
            body.Should().Contain("if (!ctx.NewEntryCreatedByAdmin)");

            int notCreatedByAdminAt = body.IndexOf("if (!ctx.NewEntryCreatedByAdmin)", StringComparison.Ordinal);
            int throwAt = body.IndexOf(
                "throw new UnauthorizedAccessException(",
                notCreatedByAdminAt,
                StringComparison.Ordinal);

            throwAt.Should().BeGreaterThan(notCreatedByAdminAt);
        }

        [Fact]
        public void ValidationException_from_the_secured_sp_maps_to_409_not_400()
        {
            string source = ControllerSource();

            source.Should().Contain("catch (ValidationException ex)");

            int catchAt = source.IndexOf("catch (ValidationException ex)", StringComparison.Ordinal);
            int blockEnd = source.IndexOf("catch (Exception ex)", catchAt, StringComparison.Ordinal);

            blockEnd.Should().BeGreaterThan(catchAt);

            string catchBlock = source.Substring(catchAt, blockEnd - catchAt);

            catchBlock.Should().Contain("StatusCodes.Status409Conflict");
            catchBlock.Should().NotContain("BadRequest(");
        }

        [Fact]
        public void The_generic_catch_all_still_never_leaks_db_details()
        {
            string body = CreateMethodBody();

            body.Should().Contain("catch (Exception ex)");
            body.Should().Contain("\"אירעה שגיאה ביצירת בקשת שינוי\"");
        }

        [Fact]
        public void CancelByPayer_action_is_untouched_by_this_slice()
        {
            string source = ControllerSource();

            source.Should().Contain(
                "int requestId = ChangeEntryRequest.CancelByPayer(dto.EntryId, personId);");
            source.Should().Contain("RoleNames.Payer");

            // The secured/authorization-context path must not leak into the
            // separate payer cancellation flow.
            int cancelByPayerAt = source.IndexOf(
                "[HttpPost(\"cancel-by-payer\")]", StringComparison.Ordinal);
            cancelByPayerAt.Should().BeGreaterThan(-1);

            string cancelByPayerBody = source.Substring(cancelByPayerAt);
            cancelByPayerBody.Should().NotContain("GetAuthorizationContext");
            cancelByPayerBody.Should().NotContain("usp_insertchangeentryrequestsecured");
        }
    }
}
