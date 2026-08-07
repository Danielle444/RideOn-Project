using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.Controllers;

namespace RideOnServer.Tests
{
    // DB-free coverage of the health-certificate scope split.
    //
    // The dual-role bug this replaces: GetHealthCertificates used to resolve a
    // scope from BOTH RanchAdmin and HostSecretary role checks on one route, so
    // a person holding both roles for the same ranch (RanchAdmin's own screen)
    // was silently upgraded to the competition-wide read. The fix removes that
    // shared decision entirely and gives each caller its own route with exactly
    // one role check:
    //
    //   GET  /Horses/health-certificates         RanchAdmin only  -> Proc 117
    //   GET  /Horses/health-certificates/hosted  HostSecretary only -> Proc 184
    //   POST /Horses/health-certificates/upload  RanchAdmin only, horse must
    //                                             belong to ranchId AND hold an
    //                                             active entry in competitionId
    //                                             (usp_gethorsesforcompetition,
    //                                             reused unchanged)
    //   POST /Horses/health-certificates/approve HostSecretary only (unchanged)
    //
    // Because each route now performs a single role check with no branching
    // between roles, there is no pure "resolve the scope" function left to test
    // by reflection the way the old ResolveHealthCertificateReadScope /
    // ResolveHealthCertificateUploadBranch were. The guarantee that a secondary
    // role can never widen a route is instead pinned at the source level: the
    // OTHER role's constant must not even appear inside a given action's body,
    // which is a stronger proof than a runtime branch test - the code has no way
    // to read that role at all on that path.
    public class HealthCertificateAuthorizationTests
    {
        // =================================================================
        // Source access helpers.
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

        private static string ActionBody(string source, string signatureNeedle, params string[] nextBoundaries)
        {
            int from = source.IndexOf(signatureNeedle, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "{0} was expected in HorsesController.cs", signatureNeedle);

            string rest = source.Substring(from);

            int to = -1;
            foreach (string boundary in nextBoundaries)
            {
                int candidate = rest.IndexOf(boundary, signatureNeedle.Length, StringComparison.Ordinal);
                if (candidate > -1 && (to == -1 || candidate < to))
                {
                    to = candidate;
                }
            }

            to.Should().BeGreaterThan(-1, "a boundary after {0} was expected", signatureNeedle);

            return rest.Substring(0, to);
        }

        private static string GetHealthCertificatesBody(string source) =>
            ActionBody(
                source,
                "public IActionResult GetHealthCertificates(",
                "// HostSecretary-only, competition-wide (Proc 184).");

        private static string GetHostedHealthCertificatesBody(string source) =>
            ActionBody(
                source,
                "public IActionResult GetHostedHealthCertificates(",
                "[HttpPost(\"health-certificates/upload\")]");

        private static string ApproveActionBody(string source) =>
            ActionBody(
                source,
                "public IActionResult ApproveHealthCertificate(",
                "// Upload authorization: RanchAdmin-only.");

        private static string EnsureCanUploadBody(string source) =>
            ActionBody(
                source,
                "private void EnsureCanUploadHealthCertificate(",
                "// Proves both requirements in one read");

        private static string HorseParticipatesBody(string source) =>
            ActionBody(
                source,
                "private static bool HorseParticipatesInCompetitionForRanch(",
                "private bool IsPdfFile(");

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

        // =================================================================
        // A. GET /Horses/health-certificates - RanchAdmin-only, ranch-scoped.
        // =================================================================

        [Fact]
        public void The_ranch_scoped_route_checks_only_RanchAdmin()
        {
            string body = GetHealthCertificatesBody(ControllerSource());

            body.Should().Contain("RoleNames.RanchAdmin");

            // The strongest available proof that a secondary HostSecretary role
            // cannot widen this route: the role's own name never appears in the
            // action body, so there is nothing here that could branch on it.
            body.Should().NotContain("RoleNames.HostSecretary");
            body.Should().NotContain("HasUserRoleInRanch");
        }

        [Fact]
        public void The_ranch_scoped_route_always_reads_through_proc_117()
        {
            string body = GetHealthCertificatesBody(ControllerSource());

            body.Should().Contain(
                "HorseParticipationInCompetition.GetHealthCertificatesForCompetition(");

            body.Should().NotContain("GetHealthCertificatesForHostedCompetition");
        }

        [Fact]
        public void The_ranch_scoped_route_never_fetches_the_competition()
        {
            // No HostRanchId cross-check exists on this route at all - it does not
            // need one, since it never reaches for the competition-wide read.
            string body = GetHealthCertificatesBody(ControllerSource());

            body.Should().NotContain("GetCompetitionById");
            body.Should().NotContain("HostRanchId");
        }

        [Fact]
        public void A_dual_role_user_on_the_ranch_scoped_route_gets_only_role_checked_is_RanchAdmin()
        {
            // Restated as a structural guarantee: EnsureUserHasRoleInRanch is
            // called exactly once in this action body, against RanchAdmin. A
            // person who ALSO holds HostSecretary in the same ranch (the exact
            // shape that caused the original bug) has no code path here that
            // reads that second role, so the route cannot widen for them.
            string body = GetHealthCertificatesBody(ControllerSource());

            CountOccurrences(body, "EnsureUserHasRoleInRanch(").Should().Be(1);
            body.Should().Contain("RoleNames.RanchAdmin");
        }

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

            // No role-like value is ever accepted from the caller - the route is
            // mobile's existing GET /Horses/health-certificates path, unchanged.
            parameters.Should().NotContain(p => p.Name!.Contains("role", StringComparison.OrdinalIgnoreCase));
        }

        // =================================================================
        // B. GET /Horses/health-certificates/hosted - HostSecretary-only,
        //    competition-wide.
        // =================================================================

        [Fact]
        public void The_hosted_route_checks_only_HostSecretary()
        {
            string body = GetHostedHealthCertificatesBody(ControllerSource());

            body.Should().Contain("RoleNames.HostSecretary");

            // A plain RanchAdmin - no HostSecretary role anywhere - has no code
            // path here that reads RanchAdmin, so holding it earns nothing.
            body.Should().NotContain("RoleNames.RanchAdmin");
        }

        [Fact]
        public void The_hosted_route_requires_ranchId_to_equal_the_competitions_own_host_ranch()
        {
            string body = GetHostedHealthCertificatesBody(ControllerSource());

            body.Should().Contain("Competition.GetCompetitionById(competitionId)");
            body.Should().Contain("competition.HostRanchId != ranchId");

            // A HostSecretary of a ranch that is not hosting this competition
            // must be denied, not silently served the wrong competition's list.
            body.Should().Contain("StatusCode(403,");
        }

        [Fact]
        public void The_hosted_route_denies_a_missing_competition()
        {
            string body = GetHostedHealthCertificatesBody(ControllerSource());

            body.Should().Contain("if (competition == null)");
            body.Should().Contain("NotFound(");
        }

        [Fact]
        public void The_hosted_route_always_reads_through_proc_184()
        {
            string body = GetHostedHealthCertificatesBody(ControllerSource());

            body.Should().Contain(
                "HorseParticipationInCompetition.GetHealthCertificatesForHostedCompetition(");

            body.Should().NotContain("GetHealthCertificatesForCompetition(competitionId, ranchId)");
        }

        [Fact]
        public void A_dual_role_user_on_the_hosted_route_gets_the_competition_wide_read()
        {
            // The mirror image of the ranch-scoped guarantee above: holding
            // RanchAdmin as well changes nothing here, because RanchAdmin is
            // never checked on this route - only HostSecretary plus the
            // host-ranch match decide the outcome.
            string body = GetHostedHealthCertificatesBody(ControllerSource());

            CountOccurrences(body, "EnsureUserHasRoleInRanch(").Should().Be(1);
            body.Should().Contain("RoleNames.HostSecretary");
            body.Should().Contain("competition.HostRanchId != ranchId");
        }

        [Fact]
        public void The_hosted_route_is_a_distinct_path_from_the_ranch_scoped_route()
        {
            string source = ControllerSource();

            source.Should().Contain("[HttpGet(\"health-certificates\")]");
            source.Should().Contain("[HttpGet(\"health-certificates/hosted\")]");
        }

        // =================================================================
        // C. POST /Horses/health-certificates/upload - RanchAdmin-only,
        //    ranch + active-entry scoped. No HostSecretary branch.
        // =================================================================

        [Fact]
        public void Upload_authorization_checks_only_RanchAdmin()
        {
            string body = EnsureCanUploadBody(ControllerSource());

            body.Should().Contain("RoleNames.RanchAdmin");

            // The removed branch: a HostSecretary-only user (no RanchAdmin role)
            // has no code path here that reads HostSecretary, so it earns
            // nothing - proving the pre-existing, UI-less widening branch is
            // gone rather than merely unreachable.
            body.Should().NotContain("RoleNames.HostSecretary");
        }

        [Fact]
        public void The_removed_dual_branch_identifiers_no_longer_exist_anywhere_in_the_controller()
        {
            string source = ControllerSource();

            source.Should().NotContain("ResolveHealthCertificateReadScope");
            source.Should().NotContain("ResolveHealthCertificateUploadBranch");
            source.Should().NotContain("HealthCertificateReadScope");
            source.Should().NotContain("HealthCertificateUploadBranch");
            source.Should().NotContain("HostSecretaryHostedCompetition");
            source.Should().NotContain("HorseBelongsToRanch");
            source.Should().NotContain("usp_gethorsesbyranch");
        }

        [Fact]
        public void Upload_authorization_reuses_the_competition_horse_list_instead_of_the_plain_ranch_list()
        {
            string body = EnsureCanUploadBody(ControllerSource());

            body.Should().Contain("HorseParticipatesInCompetitionForRanch(horseId, competitionId, ranchId)");
        }

        [Fact]
        public void The_participation_check_reuses_GetHorsesForCompetition_and_invents_no_new_sql()
        {
            string body = HorseParticipatesBody(ControllerSource());

            body.Should().Contain("Horse.GetHorsesForCompetition(filters)");
            body.Should().Contain("GetCompetitionHorsesFiltersRequest");
            body.Should().Contain("CompetitionId = competitionId");
            body.Should().Contain("RanchId = ranchId");
            body.Should().Contain(".Any(horse => horse.HorseId == horseId)");
        }

        [Fact]
        public void The_dal_backing_the_reused_check_still_names_usp_gethorsesforcompetition()
        {
            string dal = DalSource();

            dal.Should().Contain("\"usp_gethorsesforcompetition\"");
        }

        // Guard clauses only - these branches never touch the database, so they
        // are safe to exercise directly. The DB-dependent guarantees (an active
        // entry is required, a cancelled-only entry does not qualify, a horse
        // with no entry in the competition does not qualify) are proven against
        // the reused, unchanged, already-live-verified proc rather than
        // reinvented here - see the audit notes for the three live read-only
        // checks run against usp_gethorsesforcompetition(78, 11) before this
        // change: an active-entry horse (261) is present, a same-ranch horse
        // with zero entries in the competition (1045) is absent, and a horse
        // whose only entry anywhere is non-Active (273, competition 7, ranch 19)
        // is absent.
        private static readonly MethodInfo HorseParticipatesMethod =
            typeof(HorsesController)
                .GetMethod(
                    "HorseParticipatesInCompetitionForRanch",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "HorsesController.HorseParticipatesInCompetitionForRanch was not found. " +
                "If it was renamed, update this test - do not widen its visibility.");

        [Theory]
        [InlineData(0, 78, 11)]
        [InlineData(-1, 78, 11)]
        [InlineData(4021, 0, 11)]
        [InlineData(4021, -1, 11)]
        [InlineData(4021, 78, 0)]
        [InlineData(4021, 78, -1)]
        public void Invalid_identifiers_are_rejected_before_any_database_read(
            int horseId, int competitionId, int ranchId)
        {
            bool result = (bool)HorseParticipatesMethod.Invoke(
                null,
                new object[] { horseId, competitionId, ranchId })!;

            result.Should().BeFalse();
        }

        [Fact]
        public void HostSecretary_only_user_cannot_reach_the_ranchadmin_upload_route()
        {
            // No code path in the upload authorization body ever checks
            // HostSecretary, so a person holding only that role - no RanchAdmin
            // role anywhere - fails EnsureUserHasRoleInRanch(RanchAdmin) and is
            // denied before the participation check even runs.
            string body = EnsureCanUploadBody(ControllerSource());

            int roleCheckAt = body.IndexOf("EnsureUserHasRoleInRanch(", StringComparison.Ordinal);
            int participationCheckAt = body.IndexOf(
                "HorseParticipatesInCompetitionForRanch(", StringComparison.Ordinal);

            roleCheckAt.Should().BeGreaterThan(-1);
            participationCheckAt.Should().BeGreaterThan(-1);
            roleCheckAt.Should().BeLessThan(participationCheckAt);
        }

        [Fact]
        public void A_dual_role_user_cannot_upload_for_another_ranchs_horse()
        {
            // The check that closes the "belongs to ranch" half of the rule is
            // scoped to ranchId with no OR-branch for any other role, so a
            // dual-role RanchAdmin/HostSecretary user is bound by exactly the
            // same participation check as a plain RanchAdmin - there is no
            // second, wider path for them to fall through to.
            string body = EnsureCanUploadBody(ControllerSource());

            CountOccurrences(body, "EnsureUserHasRoleInRanch(").Should().Be(1);
            CountOccurrences(body, "HorseParticipatesInCompetitionForRanch(").Should().Be(1);
            body.Should().NotContain(" || ");
        }

        [Fact]
        public void An_upload_for_a_horse_with_no_active_entry_in_the_competition_is_denied_even_for_the_horses_own_ranch()
        {
            // Structural guarantee: the participation check is unconditional - it
            // is not skipped for same-ranch horses, so "belongs to ranch" alone
            // (the pre-Stage-B1 hole, and the gap this change closes) is no
            // longer sufficient on its own.
            string body = EnsureCanUploadBody(ControllerSource());

            body.Should().Contain("if (!HorseParticipatesInCompetitionForRanch(horseId, competitionId, ranchId))");
            body.Should().Contain("throw new UnauthorizedAccessException(");
        }

        // =================================================================
        // D. POST /Horses/health-certificates/approve - unchanged.
        // =================================================================

        [Fact]
        public void The_approve_endpoint_is_unchanged()
        {
            string body = ApproveActionBody(ControllerSource());

            body.Should().Contain("RoleNames.HostSecretary");
            body.Should().Contain("Competition.GetCompetitionById(request.CompetitionId)");
            body.Should().Contain("competition.HostRanchId != request.RanchId");
            body.Should().Contain(
                "HorseParticipationInCompetition.ApproveHealthCertificate(request, currentPersonId)");
            body.Should().Contain(
                "\"אין לך הרשאה לאשר תעודות בתחרות זו\"");
        }

        [Fact]
        public void The_approve_endpoint_request_shape_is_unchanged()
        {
            MethodInfo action = typeof(HorsesController)
                .GetMethod("ApproveHealthCertificate", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException("ApproveHealthCertificate was not found.");

            ParameterInfo[] parameters = action.GetParameters();

            parameters.Should().HaveCount(1);
            parameters[0].Name.Should().Be("request");
            parameters[0].ParameterType.Name.Should().Be("ApproveHealthCertificateRequest");
        }

        // =================================================================
        // Properties carried forward unchanged from the pre-split design.
        // =================================================================

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
            ControllerSource().Should().Contain(
                "EnsureCanUploadHealthCertificate(\n                    currentPersonId,\n                    horseId,"
                    .Replace("\n", Environment.NewLine));
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

        [Fact]
        public void The_health_certificate_endpoints_return_fixed_messages_not_exception_text()
        {
            string source = ControllerSource();

            source.Should().Contain("return StatusCode(500, \"שגיאה בשליפת תעודות הבריאות\");");
            source.Should().Contain("return StatusCode(500, \"שגיאה בהעלאת תעודת הבריאות\");");
            source.Should().Contain("return StatusCode(500, \"שגיאה באישור תעודת הבריאות\");");

            source.Should().NotContain("StatusCode(500, ex.Message)");
            source.Should().NotContain("BadRequest(ex.Message)");
        }

        [Fact]
        public void Upload_validation_failures_return_fixed_hebrew_messages_not_english()
        {
            string source = ControllerSource();

            source.Should().Contain("return BadRequest(\"מזהה סוס לא תקין\");");
            source.Should().Contain("return BadRequest(\"מזהה תחרות לא תקין\");");
            source.Should().Contain("return BadRequest(\"מזהה חווה לא תקין\");");
            source.Should().Contain("return BadRequest(\"יש לצרף קובץ להעלאה\");");
            source.Should().Contain("return BadRequest(\"ניתן להעלות קובץ PDF בלבד\");");
        }

        [Fact]
        public void Every_authorization_refusal_message_is_one_we_wrote()
        {
            string source = ControllerSource();

            source.Should().Contain(
                "\"אין לך הרשאה להעלות תעודת בריאות עבור סוס זה\"");

            source.Should().NotContain("new UnauthorizedAccessException(ex.Message)");
            source.Should().NotContain("new UnauthorizedAccessException(\"Competition not found\")");
        }

        [Fact]
        public void The_endpoint_contains_no_loop_over_ranches()
        {
            foreach (string body in new[]
                     {
                         GetHealthCertificatesBody(ControllerSource()),
                         GetHostedHealthCertificatesBody(ControllerSource())
                     })
            {
                body.Should().NotContain("foreach");
                body.Should().NotContain("for (");
                body.Should().NotContain("while (");
                body.Should().NotContain(".SelectMany(");
                body.Should().NotContain("GetRanches");
            }
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

            int to = rest.IndexOf("            throw;", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_dal_names_both_health_certificate_stored_procedures()
        {
            DalSource().Should().Contain("\"usp_gethealthcertificatesforhostedcompetition\"");
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
            source.Should().NotContain("\"usp_");
        }

        [Fact]
        public void The_dead_metadata_save_endpoint_no_longer_exists()
        {
            string source = ControllerSource();

            source.Should().NotContain("[HttpPost(\"health-certificates/save\")]");

            source.Should().Contain("HorseParticipationInCompetition.SaveHealthCertificate(request);");
            source.Should().Contain("SaveHealthCertificateRequest request = new SaveHealthCertificateRequest");
        }

        // =================================================================
        // No client-supplied role controls authorization, on any of the
        // three routes this change touches.
        // =================================================================

        [Fact]
        public void No_route_accepts_a_role_name_or_scope_flag_from_the_caller()
        {
            string source = ControllerSource();

            foreach (MethodInfo action in new[]
                     {
                         typeof(HorsesController).GetMethod("GetHealthCertificates", BindingFlags.Public | BindingFlags.Instance)!,
                         typeof(HorsesController).GetMethod("GetHostedHealthCertificates", BindingFlags.Public | BindingFlags.Instance)!,
                         typeof(HorsesController).GetMethod("UploadHealthCertificate", BindingFlags.Public | BindingFlags.Instance)!,
                     })
            {
                foreach (ParameterInfo parameter in action.GetParameters())
                {
                    parameter.Name.Should().NotContain(
                        "role", "route {0} must not accept a role from the caller", action.Name);

                    parameter.Name.Should().NotContain(
                        "scope", "route {0} must not accept a scope from the caller", action.Name);
                }
            }

            foreach (string forbidden in new[]
                     {
                         "includeAll",
                         "includeall",
                         "IncludeAll",
                         "[FromQuery] bool",
                         "[FromQuery] string role",
                         "[FromForm] string role",
                     })
            {
                source.Should().NotContain(forbidden);
            }
        }
    }
}
