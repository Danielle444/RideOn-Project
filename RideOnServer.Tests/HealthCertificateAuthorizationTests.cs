using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.Controllers;

namespace RideOnServer.Tests
{
    // DB-free coverage of the Stage B1 health-certificate authorization rules,
    // mirroring PaidTimeAssignErrorMessageTests: the production logic lives in
    // PRIVATE static helpers on HorsesController and is reached here by reflection
    // rather than by widening its visibility, since the endpoints themselves need a
    // JWT principal and a live connection.
    //
    // The helpers are pure by construction - the controller resolves the role
    // checks and the competition lookup and passes the results in - so these tests
    // exercise the real decision, not a restatement of it.
    //
    // Two properties cannot be expressed as a pure decision and are asserted
    // against the controller source instead, at the bottom of this file:
    // that ownership is settled before the Storage helper runs, and that no
    // endpoint hands a raw exception back to the caller.
    public class HealthCertificateAuthorizationTests
    {
        // ranchId values used throughout: A is the user's own ranch, B is someone
        // else's, HOST is the competition's hosting ranch.
        private const int RanchA = 11;
        private const int RanchB = 49;
        private const int CompetitionId = 7;
        private const int HorseId = 4021;

        private static readonly MethodInfo ReadScopeResolver =
            typeof(HorsesController)
                .GetMethod(
                    "ResolveHealthCertificateReadScope",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "HorsesController.ResolveHealthCertificateReadScope was not found. " +
                "If it was renamed, update this test - do not widen its visibility.");

        private static readonly MethodInfo UploadBranchResolver =
            typeof(HorsesController)
                .GetMethod(
                    "ResolveHealthCertificateUploadBranch",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "HorsesController.ResolveHealthCertificateUploadBranch was not found. " +
                "If it was renamed, update this test - do not widen its visibility.");

        // The enums are private nested types, so the decision is compared by name.
        private static string ReadScope(
            int competitionId,
            int ranchId,
            bool isRanchAdminInRanch,
            bool isHostSecretaryInRanch,
            int? competitionHostRanchId)
        {
            return ReadScopeResolver.Invoke(
                null,
                new object?[]
                {
                    competitionId,
                    ranchId,
                    isRanchAdminInRanch,
                    isHostSecretaryInRanch,
                    competitionHostRanchId
                })!.ToString()!;
        }

        private static string UploadBranch(
            int horseId,
            int competitionId,
            int ranchId,
            bool isRanchAdminInRanch,
            bool isHostSecretaryInRanch,
            bool horseBelongsToRanch,
            int? competitionHostRanchId)
        {
            return UploadBranchResolver.Invoke(
                null,
                new object?[]
                {
                    horseId,
                    competitionId,
                    ranchId,
                    isRanchAdminInRanch,
                    isHostSecretaryInRanch,
                    horseBelongsToRanch,
                    competitionHostRanchId
                })!.ToString()!;
        }

        // ===== 1. RanchAdmin reads their own ranch =====

        [Fact]
        public void RanchAdmin_in_ranch_A_may_read_ranch_A_certificates()
        {
            // The competition is never fetched on this path, so its host ranch is
            // unknown here - exactly what the controller passes.
            ReadScope(CompetitionId, RanchA, true, false, null)
                .Should().Be("RanchScoped");
        }

        // ===== 2. RanchAdmin cannot reach another ranch =====

        [Fact]
        public void RanchAdmin_in_ranch_A_may_not_read_ranch_B_certificates()
        {
            // Asking for ranch B means the role check runs against ranch B, where
            // this user holds nothing.
            ReadScope(CompetitionId, RanchB, false, false, null)
                .Should().Be("Denied");
        }

        [Fact]
        public void RanchAdmin_is_never_widened_past_their_own_ranch()
        {
            // Even when the supplied ranch happens to host the competition, a plain
            // RanchAdmin stays ranch-scoped.
            ReadScope(CompetitionId, RanchA, true, false, RanchA)
                .Should().Be("RanchScoped");
        }

        // ===== 3. HostSecretary of the hosting ranch =====

        [Fact]
        public void HostSecretary_of_the_host_ranch_may_read_the_competition_list()
        {
            ReadScope(CompetitionId, RanchA, false, true, RanchA)
                .Should().Be("CompetitionWide");
        }

        [Fact]
        public void A_dual_role_user_in_the_host_ranch_keeps_the_wider_scope()
        {
            // Holding RanchAdmin as well must not narrow a legitimate secretary back
            // down to their own horses.
            ReadScope(CompetitionId, RanchA, true, true, RanchA)
                .Should().Be("CompetitionWide");
        }

        // ===== 4. HostSecretary elsewhere =====

        [Fact]
        public void HostSecretary_in_another_ranch_may_not_read_the_list()
        {
            // The user holds the secretary role somewhere, but not in the ranch they
            // asked about, so isHostSecretaryInRanch is false.
            ReadScope(CompetitionId, RanchB, false, false, RanchA)
                .Should().Be("Denied");
        }

        // ===== 5. competition / ranch cross-check =====

        [Fact]
        public void HostSecretary_may_not_use_a_competition_hosted_by_another_ranch()
        {
            // Secretary of ranch A, competition hosted by ranch B: the pair does not
            // agree, so the role alone earns nothing.
            ReadScope(CompetitionId, RanchA, false, true, RanchB)
                .Should().Be("Denied");
        }

        [Fact]
        public void HostSecretary_may_not_read_a_competition_that_does_not_exist()
        {
            // A missing competition arrives as a null host ranch id.
            ReadScope(CompetitionId, RanchA, false, true, null)
                .Should().Be("Denied");
        }

        [Fact]
        public void A_mismatched_competition_falls_back_to_ranch_scope_for_an_admin()
        {
            // Never to competition-wide: the admin half of a dual-role user is still
            // limited to their own ranch's horses.
            ReadScope(CompetitionId, RanchA, true, true, RanchB)
                .Should().Be("RanchScoped");
        }

        // ===== 8a. invalid identifiers on the read path =====

        [Theory]
        [InlineData(0, RanchA)]
        [InlineData(-1, RanchA)]
        [InlineData(CompetitionId, 0)]
        [InlineData(CompetitionId, -1)]
        public void Invalid_identifiers_are_denied_on_the_read_path(int competitionId, int ranchId)
        {
            // Denied even with both roles and a matching host ranch.
            ReadScope(competitionId, ranchId, true, true, ranchId)
                .Should().Be("Denied");
        }

        [Fact]
        public void A_user_with_no_role_in_the_ranch_is_denied()
        {
            ReadScope(CompetitionId, RanchA, false, false, RanchA)
                .Should().Be("Denied");
        }

        // ===== 6. upload ownership =====

        [Fact]
        public void RanchAdmin_may_upload_for_a_horse_of_their_own_ranch()
        {
            UploadBranch(HorseId, CompetitionId, RanchA, true, false, true, RanchA)
                .Should().Be("RanchAdminOwnHorse");
        }

        [Fact]
        public void RanchAdmin_may_not_upload_for_a_horse_of_another_ranch()
        {
            // This is the hole Stage B1 closes: the role check passes, the horse is
            // not theirs, and before the fix that was enough.
            UploadBranch(HorseId, CompetitionId, RanchA, true, false, false, RanchA)
                .Should().Be("Denied");
        }

        [Fact]
        public void A_foreign_horse_is_denied_even_when_the_admin_ranch_hosts_the_competition()
        {
            UploadBranch(HorseId, CompetitionId, RanchA, true, false, false, RanchA)
                .Should().NotBe("HostSecretaryHostedCompetition");
        }

        // ===== the pre-existing, UI-less HostSecretary upload branch =====

        [Fact]
        public void HostSecretary_of_the_host_ranch_keeps_its_pre_existing_upload_branch()
        {
            // Deliberately unchanged in Stage B1: a secretary of the hosting ranch
            // may still upload for a horse that is not theirs.
            UploadBranch(HorseId, CompetitionId, RanchA, false, true, false, RanchA)
                .Should().Be("HostSecretaryHostedCompetition");
        }

        [Fact]
        public void A_dual_role_user_uploading_a_foreign_horse_falls_through_to_the_secretary_branch()
        {
            // The ownership check must not strip a capability the user already had:
            // failing the admin branch drops them to the secretary branch rather than
            // rejecting outright.
            UploadBranch(HorseId, CompetitionId, RanchA, true, true, false, RanchA)
                .Should().Be("HostSecretaryHostedCompetition");
        }

        [Fact]
        public void HostSecretary_may_not_upload_into_a_competition_hosted_elsewhere()
        {
            UploadBranch(HorseId, CompetitionId, RanchA, false, true, false, RanchB)
                .Should().Be("Denied");
        }

        // ===== 8b. invalid horse / competition on the upload path =====

        [Fact]
        public void An_upload_for_a_competition_that_does_not_exist_is_denied()
        {
            // A missing competition arrives as a null host ranch id, and denies both
            // branches - including an admin uploading for their own horse.
            UploadBranch(HorseId, CompetitionId, RanchA, true, false, true, null)
                .Should().Be("Denied");

            UploadBranch(HorseId, CompetitionId, RanchA, false, true, false, null)
                .Should().Be("Denied");
        }

        [Theory]
        [InlineData(0, CompetitionId, RanchA)]
        [InlineData(-1, CompetitionId, RanchA)]
        [InlineData(HorseId, 0, RanchA)]
        [InlineData(HorseId, -1, RanchA)]
        [InlineData(HorseId, CompetitionId, 0)]
        [InlineData(HorseId, CompetitionId, -1)]
        public void Invalid_identifiers_are_denied_on_the_upload_path(
            int horseId,
            int competitionId,
            int ranchId)
        {
            UploadBranch(horseId, competitionId, ranchId, true, true, true, ranchId)
                .Should().Be("Denied");
        }

        [Fact]
        public void A_user_with_no_role_in_the_ranch_may_not_upload()
        {
            UploadBranch(HorseId, CompetitionId, RanchA, false, false, true, RanchA)
                .Should().Be("Denied");
        }

        // =================================================================
        // Source-level assertions.
        //
        // Ordering ("nothing reaches Storage before the check") and leakage
        // ("no raw exception text is returned") are properties of the endpoint
        // body, not of a pure function. There is no HTTP test host and no
        // mocking framework in this project, and this file deliberately does not
        // add one, so both are pinned against the controller source - the same
        // technique the web contract test uses.
        // =================================================================

        private static string ControllerSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(),
                    "..",
                    "RideOnServer",
                    "Controllers",
                    "HorsesController.cs"));

            File.Exists(path).Should().BeTrue("HorsesController.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        // ===== 7. ownership runs before the Storage upload helper =====

        [Fact]
        public void Ownership_is_checked_before_the_storage_upload_helper_is_called()
        {
            string source = ControllerSource();

            int checkAt = source.IndexOf(
                "EnsureCanUploadHealthCertificate(",
                StringComparison.Ordinal);

            int uploadAt = source.IndexOf(
                "await UploadPdfToSupabaseStorage(",
                StringComparison.Ordinal);

            checkAt.Should().BeGreaterThan(-1);
            uploadAt.Should().BeGreaterThan(-1);

            checkAt.Should().BeLessThan(
                uploadAt,
                "a rejected upload must never create a Storage object");
        }

        [Fact]
        public void The_upload_endpoint_passes_the_horse_id_to_the_ownership_check()
        {
            // Without horseId the check cannot be about ownership at all - this is
            // the exact signature gap that allowed the foreign-horse upload.
            ControllerSource().Should().Contain("EnsureCanUploadHealthCertificate(\n                    currentPersonId,\n                    horseId,".Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void The_file_stream_is_only_opened_inside_the_storage_helper()
        {
            string source = ControllerSource();

            int openStreamAt = source.IndexOf("file.OpenReadStream()", StringComparison.Ordinal);
            int checkAt = source.IndexOf("EnsureCanUploadHealthCertificate(", StringComparison.Ordinal);

            openStreamAt.Should().BeGreaterThan(-1);
            checkAt.Should().BeLessThan(
                openStreamAt,
                "the request body must not be read for an upload that will be rejected");
        }

        // ===== 9. no raw exception text reaches the caller =====

        [Fact]
        public void The_health_certificate_endpoints_return_fixed_messages_not_exception_text()
        {
            string source = ControllerSource();

            // Every non-authorization failure collapses to one of these.
            source.Should().Contain("return StatusCode(500, \"שגיאה בשליפת תעודות הבריאות\");");
            source.Should().Contain("return StatusCode(500, \"שגיאה בהעלאת תעודת הבריאות\");");
            source.Should().Contain("return StatusCode(500, \"שגיאה באישור תעודת הבריאות\");");

            // and none of them echoes the exception.
            source.Should().NotContain("StatusCode(500, ex.Message)");
            source.Should().NotContain("BadRequest(ex.Message)");
        }

        [Fact]
        public void Upload_validation_failures_return_fixed_hebrew_messages_not_english()
        {
            // The mobile client used to echo response.data straight into its
            // error Alert, so an English BadRequest string here would have
            // reached a Hebrew screen verbatim. Fixed even though the client no
            // longer echoes raw text, since a raw English string is still wrong
            // for any caller of this endpoint (mobile, Swagger, a future web use).
            string source = ControllerSource();

            source.Should().Contain("return BadRequest(\"מזהה סוס לא תקין\");");
            source.Should().Contain("return BadRequest(\"מזהה תחרות לא תקין\");");
            source.Should().Contain("return BadRequest(\"מזהה חווה לא תקין\");");
            source.Should().Contain("return BadRequest(\"יש לצרף קובץ להעלאה\");");
            source.Should().Contain("return BadRequest(\"ניתן להעלות קובץ PDF בלבד\");");

            source.Should().NotContain("return BadRequest(\"Invalid horse id\");");
            source.Should().NotContain("return BadRequest(\"Invalid competition id\");");
            source.Should().NotContain("return BadRequest(\"Invalid ranch id\");");
            source.Should().NotContain("return BadRequest(\"File is required\");");
        }

        [Fact]
        public void Every_authorization_refusal_message_is_one_we_wrote()
        {
            // 403 replies do return the exception's message, which is safe only
            // because every UnauthorizedAccessException on these paths is thrown by
            // us with a fixed Hebrew string (the remainder come from
            // UserAccessValidator, which is likewise fixed Hebrew).
            string source = ControllerSource();

            source.Should().Contain(
                "\"אין לך הרשאה לצפות בתעודות הבריאות של תחרות זו\"");
            source.Should().Contain(
                "\"אין לך הרשאה להעלות תעודת בריאות עבור סוס זה\"");

            source.Should().NotContain("new UnauthorizedAccessException(ex.Message)");
            source.Should().NotContain("new UnauthorizedAccessException(\"Competition not found\")");
        }

        // =================================================================
        // Read routing: the resolved scope, and nothing else, picks the BL call.
        // =================================================================

        // The body of GetHealthCertificates only, so the assertions below cannot
        // accidentally match the upload or approve endpoints.
        private static string GetHealthCertificatesBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult GetHealthCertificates(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1);

            string rest = source.Substring(from);

            int to = rest.IndexOf("[HttpPost(", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1, "the endpoint after GetHealthCertificates bounds its body");

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_competition_wide_branch_reads_through_the_hosted_competition_bl_method()
        {
            GetHealthCertificatesBody().Should().Contain(
                "HealthCertificateReadScope.CompetitionWide");

            GetHealthCertificatesBody().Should().Contain(
                ".GetHealthCertificatesForHostedCompetition(competitionId)");
        }

        [Fact]
        public void The_ranch_scoped_branch_still_reads_through_the_ranch_scoped_bl_method()
        {
            GetHealthCertificatesBody().Should().Contain(
                ".GetHealthCertificatesForCompetition(competitionId, ranchId)");
        }

        [Fact]
        public void The_competition_wide_branch_no_longer_falls_back_to_the_ranch_scoped_read()
        {
            string body = GetHealthCertificatesBody();

            int wideAt = body.IndexOf(
                ".GetHealthCertificatesForHostedCompetition(competitionId)",
                StringComparison.Ordinal);

            int scopedAt = body.IndexOf(
                ".GetHealthCertificatesForCompetition(competitionId, ranchId)",
                StringComparison.Ordinal);

            wideAt.Should().BeGreaterThan(-1);
            scopedAt.Should().BeGreaterThan(-1);

            // The hosted read is the CompetitionWide arm of the conditional, so it
            // has to come first; a ranch-scoped call ahead of it would mean the
            // secretary path was still served ranch-scoped.
            wideAt.Should().BeLessThan(scopedAt);

            // and each read appears exactly once - no second, unconditional call.
            CountOccurrences(body, ".GetHealthCertificatesForHostedCompetition(").Should().Be(1);
            CountOccurrences(body, ".GetHealthCertificatesForCompetition(").Should().Be(1);
        }

        private static int CountOccurrences(string haystack, string needle)
        {
            int count = 0;
            int index = haystack.IndexOf(needle, StringComparison.Ordinal);

            while (index > -1)
            {
                count++;
                index = haystack.IndexOf(needle, index + needle.Length, StringComparison.Ordinal);
            }

            return count;
        }

        // ===== no client input decides the scope =====

        [Fact]
        public void The_endpoint_request_shape_is_unchanged()
        {
            MethodInfo action = typeof(HorsesController)
                .GetMethod("GetHealthCertificates", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException("GetHealthCertificates was not found.");

            ParameterInfo[] parameters = action.GetParameters();

            parameters.Should().HaveCount(2, "adding a parameter would change the API contract");

            parameters.Select(p => p.Name).Should().Equal("competitionId", "ranchId");
            parameters.Select(p => p.ParameterType).Should().AllBeEquivalentTo(typeof(int));
        }

        [Fact]
        public void No_include_all_or_scope_flag_is_accepted_from_the_caller()
        {
            string body = GetHealthCertificatesBody();

            foreach (string forbidden in new[]
                     {
                         "includeAll",
                         "includeall",
                         "IncludeAll",
                         "includeAllCompetitionHorses",
                         "p_includeallcompetitionhorses",
                         "[FromQuery] bool",
                         "[FromQuery] string"
                     })
            {
                body.Should().NotContain(
                    forbidden,
                    "the read scope must come from the authorization decision, not the request");
            }
        }

        [Fact]
        public void The_scope_is_taken_from_the_resolver_and_not_from_a_request_value()
        {
            string body = GetHealthCertificatesBody();

            body.Should().Contain("HealthCertificateReadScope scope = ResolveHealthCertificateReadScope(");

            // The only thing branched on is the resolved scope.
            body.Should().Contain("scope == HealthCertificateReadScope.CompetitionWide");
        }

        // ===== denied still returns 403 =====

        [Fact]
        public void A_denied_scope_still_produces_the_safe_403()
        {
            string body = GetHealthCertificatesBody();

            body.Should().Contain("if (scope == HealthCertificateReadScope.Denied)");
            body.Should().Contain(
                "throw new UnauthorizedAccessException(\n                        \"אין לך הרשאה לצפות בתעודות הבריאות של תחרות זו\");"
                    .Replace("\n", Environment.NewLine));
            body.Should().Contain("return StatusCode(403, ex.Message);");

            // and the refusal happens before either read runs
            int denyAt = body.IndexOf("HealthCertificateReadScope.Denied", StringComparison.Ordinal);
            int readAt = body.IndexOf(".GetHealthCertificatesFor", StringComparison.Ordinal);

            denyAt.Should().BeLessThan(readAt);
        }

        // ===== no fan out over ranches =====

        [Fact]
        public void The_endpoint_contains_no_loop_over_ranches()
        {
            string body = GetHealthCertificatesBody();

            body.Should().NotContain("foreach");
            body.Should().NotContain("for (");
            body.Should().NotContain("while (");
            body.Should().NotContain(".Select(");
            body.Should().NotContain(".SelectMany(");
            body.Should().NotContain("GetRanches");
        }

        [Fact]
        public void Each_read_path_issues_exactly_one_stored_procedure_call()
        {
            string dal = DalSource();

            foreach (string method in new[]
                     {
                         "GetHealthCertificatesForCompetition",
                         "GetHealthCertificatesForHostedCompetition"
                     })
            {
                string body = DalMethodBody(dal, method);

                CountOccurrences(body, "CreateCommandWithStoredProcedure(")
                    .Should().Be(1, "{0} must be a single round trip, not an N+1", method);

                CountOccurrences(body, "Connect(\"DefaultConnection\")")
                    .Should().Be(1, "{0} must open one connection", method);
            }
        }

        // =================================================================
        // DAL and BL surface for the hosted-competition read.
        // =================================================================

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "HorseDAL.cs"));

            File.Exists(path).Should().BeTrue("HorseDAL.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string DalMethodBody(string dalSource, string methodName)
        {
            int from = dalSource.IndexOf(
                "public List<HealthCertificateItem> " + methodName + "(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "{0} was expected in HorseDAL", methodName);

            string rest = dalSource.Substring(from);

            // Bounded by the closing of its own try/catch, which every reader in
            // this file ends with.
            int to = rest.IndexOf("            throw;", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_dal_names_the_hosted_competition_stored_procedure()
        {
            DalSource().Should().Contain("\"usp_gethealthcertificatesforhostedcompetition\"");

            // and the ranch-scoped reader still names its own function
            DalSource().Should().Contain("\"usp_gethealthcertificatesforcompetition\"");
        }

        [Fact]
        public void The_hosted_dal_method_takes_only_a_competition_id()
        {
            MethodInfo method = typeof(RideOnServer.DAL.HorseDAL)
                .GetMethod(
                    "GetHealthCertificatesForHostedCompetition",
                    BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException(
                    "HorseDAL.GetHealthCertificatesForHostedCompetition was not found.");

            ParameterInfo[] parameters = method.GetParameters();

            parameters.Should().HaveCount(1, "a ranch id here would reintroduce the ranch filter");
            parameters[0].Name.Should().Be("competitionId");
            parameters[0].ParameterType.Should().Be(typeof(int));
        }

        [Fact]
        public void The_hosted_dal_method_returns_the_existing_item_shape()
        {
            MethodInfo method = typeof(RideOnServer.DAL.HorseDAL)
                .GetMethod(
                    "GetHealthCertificatesForHostedCompetition",
                    BindingFlags.Public | BindingFlags.Instance)!;

            method.ReturnType.Should().Be(
                typeof(List<RideOnServer.BL.DTOs.Horses.HealthCertificateItem>));

            // identical to the ranch-scoped reader, so the response shape does not
            // change with the scope
            typeof(RideOnServer.DAL.HorseDAL)
                .GetMethod(
                    "GetHealthCertificatesForCompetition",
                    BindingFlags.Public | BindingFlags.Instance)!
                .ReturnType
                .Should().Be(method.ReturnType);
        }

        [Fact]
        public void Both_dal_readers_share_one_mapper()
        {
            string dal = DalSource();

            // A second hand-written mapping would be free to drift from the first.
            CountOccurrences(dal, "new HealthCertificateItem").Should().Be(1);
            CountOccurrences(dal, "ReadHealthCertificateItem(reader)").Should().Be(2);
        }

        [Fact]
        public void The_hosted_bl_method_takes_only_a_competition_id_and_returns_the_item_shape()
        {
            MethodInfo method = typeof(RideOnServer.BL.HorseParticipationInCompetition)
                .GetMethod(
                    "GetHealthCertificatesForHostedCompetition",
                    BindingFlags.Public | BindingFlags.Static)
                ?? throw new InvalidOperationException(
                    "HorseParticipationInCompetition.GetHealthCertificatesForHostedCompetition was not found.");

            ParameterInfo[] parameters = method.GetParameters();

            parameters.Should().HaveCount(1);
            parameters[0].Name.Should().Be("competitionId");
            parameters[0].ParameterType.Should().Be(typeof(int));

            method.ReturnType.Should().Be(
                typeof(List<RideOnServer.BL.DTOs.Horses.HealthCertificateItem>));
        }

        [Fact]
        public void The_hosted_bl_method_rejects_a_non_positive_competition_id()
        {
            // Reached without a database: the guard runs before the DAL is built,
            // exactly like the ranch-scoped sibling.
            foreach (int invalid in new[] { 0, -1 })
            {
                Action act = () =>
                    RideOnServer.BL.HorseParticipationInCompetition
                        .GetHealthCertificatesForHostedCompetition(invalid);

                act.Should().Throw<ArgumentException>()
                    .WithMessage("מזהה תחרות לא תקין");
            }
        }

        [Fact]
        public void The_controller_never_reaches_the_dal_or_the_database_directly()
        {
            string source = ControllerSource();

            source.Should().NotContain("HorseDAL");
            source.Should().NotContain("NpgsqlConnection");
            source.Should().NotContain("CreateCommandWithStoredProcedure");

            // A stored-procedure name only ever appears in this codebase as a
            // quoted argument to CreateCommandWithStoredProcedure. Bare `usp_`
            // occurrences in the controller are prose in comments, which is why
            // the quote is part of the needle.
            source.Should().NotContain("\"usp_");
        }

        // ===== the dead metadata-save endpoint is gone =====

        [Fact]
        public void The_dead_metadata_save_endpoint_no_longer_exists()
        {
            string source = ControllerSource();

            source.Should().NotContain("[HttpPost(\"health-certificates/save\")]");

            // but the multipart upload still saves through the BL method.
            source.Should().Contain("HorseParticipationInCompetition.SaveHealthCertificate(request);");
            source.Should().Contain("SaveHealthCertificateRequest request = new SaveHealthCertificateRequest");
        }
    }
}
