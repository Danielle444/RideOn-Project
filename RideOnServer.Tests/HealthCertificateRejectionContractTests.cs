using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Horses;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // Health Certificate rejection foundation (2026-08-07): a HostSecretary can
    // reject a Pending certificate with a required reason (usp_RejectHealthCertificate,
    // repo file 245), mirroring usp_ApproveHealthCertificate's eligibility guard
    // and boolean-result contract exactly (see HealthCertificateApprovalContractTests
    // for the sibling coverage on the approve path).
    //
    // DB-free, matching every other file in this project: no mocking framework and
    // no HTTP test host exist here, so this proves the C# contract only, using the
    // same two techniques already established - reflection over public signatures,
    // and bounded source-text assertions over the real BL/DAL/Controller files.
    // The DB-dependent guarantees (constraint enforcement, eligibility) are proven
    // against live data in a rolled-back transaction as part of this change's DB
    // verification, not here - matching 186's own stated principle.
    public class HealthCertificateRejectionContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ControllerSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "Controllers", "HorsesController.cs"));

            File.Exists(path).Should().BeTrue("HorsesController.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "HorseDAL.cs"));

            File.Exists(path).Should().BeTrue("HorseDAL.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static int CountOccurrences(string haystack, string needle)
        {
            int count = 0;
            int index = 0;

            while ((index = haystack.IndexOf(needle, index, StringComparison.Ordinal)) != -1)
            {
                count++;
                index += needle.Length;
            }

            return count;
        }

        // =================================================================
        // 1/2. BL and DAL return bool.
        // =================================================================

        [Fact]
        public void The_bl_reject_method_returns_bool()
        {
            MethodInfo method = typeof(HorseParticipationInCompetition)
                .GetMethod("RejectHealthCertificate", BindingFlags.Public | BindingFlags.Static)
                ?? throw new InvalidOperationException(
                    "HorseParticipationInCompetition.RejectHealthCertificate was not found.");

            method.ReturnType.Should().Be(typeof(bool));
        }

        [Fact]
        public void The_dal_reject_method_returns_bool()
        {
            MethodInfo method = typeof(HorseDAL)
                .GetMethod("RejectHealthCertificate", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException(
                    "HorseDAL.RejectHealthCertificate was not found.");

            method.ReturnType.Should().Be(typeof(bool));
        }

        // =================================================================
        // 3. DAL reads the procedure's result instead of discarding it.
        // =================================================================

        private static string DalRejectMethodBody()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public bool RejectHealthCertificate(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "RejectHealthCertificate was expected in HorseDAL");

            string rest = source.Substring(from);

            int to = rest.IndexOf("            throw;", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_dal_reads_the_procedure_result_via_ExecuteScalar_not_ExecuteNonQuery()
        {
            string body = DalRejectMethodBody();

            body.Should().Contain("ExecuteScalar()");
            body.Should().NotContain("ExecuteNonQuery()");
        }

        [Fact]
        public void The_dal_fails_safe_on_null_or_an_unexpected_scalar_type()
        {
            string body = DalRejectMethodBody();

            body.Should().Contain("result == null || result == DBNull.Value");
            body.Should().Contain("result is bool");

            body.Should().NotContain("Convert.ToBoolean");
        }

        [Fact]
        public void The_dal_makes_exactly_one_round_trip()
        {
            string body = DalRejectMethodBody();

            CountOccurrences(body, "CreateCommandWithStoredProcedure(")
                .Should().Be(1, "RejectHealthCertificate must be a single round trip, not an N+1");

            CountOccurrences(body, "Connect(\"DefaultConnection\")")
                .Should().Be(1, "RejectHealthCertificate must open exactly one connection");
        }

        [Fact]
        public void The_dal_names_the_reject_stored_procedure()
        {
            DalSource().Should().Contain("\"usp_RejectHealthCertificate\"");
        }

        [Fact]
        public void The_dal_binds_the_five_parameters_in_the_procedures_declared_order()
        {
            string body = DalRejectMethodBody();

            int horseAt = body.IndexOf("\"@HorseId\"", StringComparison.Ordinal);
            int competitionAt = body.IndexOf("\"@CompetitionId\"", StringComparison.Ordinal);
            int rejectedByAt = body.IndexOf("\"@HcRejectedBySystemUserId\"", StringComparison.Ordinal);
            int dateAt = body.IndexOf("\"@HcRejectionDate\"", StringComparison.Ordinal);
            int reasonAt = body.IndexOf("\"@HcRejectionReason\"", StringComparison.Ordinal);

            horseAt.Should().BeGreaterThan(-1);
            competitionAt.Should().BeGreaterThan(-1);
            rejectedByAt.Should().BeGreaterThan(-1);
            dateAt.Should().BeGreaterThan(-1);
            reasonAt.Should().BeGreaterThan(-1);

            // CreateCommandWithStoredProcedure binds by dictionary INSERTION order,
            // not by key text - this literal ordering is the real positional
            // contract with usp_RejectHealthCertificate's five declared parameters
            // (p_HorseId, p_CompetitionId, p_HcRejectedBySystemUserId,
            // p_HcRejectionDate, p_HcRejectionReason).
            horseAt.Should().BeLessThan(competitionAt);
            competitionAt.Should().BeLessThan(rejectedByAt);
            rejectedByAt.Should().BeLessThan(dateAt);
            dateAt.Should().BeLessThan(reasonAt);
        }

        // =================================================================
        // 4. BL validates before reaching the DAL - reason required, ids valid.
        // =================================================================

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void The_bl_rejects_an_empty_or_whitespace_reason_before_touching_the_database(string reason)
        {
            RejectHealthCertificateRequest request = new RejectHealthCertificateRequest
            {
                HorseId = 1,
                CompetitionId = 1,
                RanchId = 1,
                Reason = reason
            };

            Action act = () => HorseParticipationInCompetition.RejectHealthCertificate(request, 1);

            act.Should().Throw<ArgumentException>().WithMessage("יש להזין סיבת דחייה");
        }

        [Theory]
        [InlineData(0, 1)]
        [InlineData(-1, 1)]
        [InlineData(1, 0)]
        [InlineData(1, -1)]
        public void The_bl_rejects_invalid_horse_or_competition_ids_before_touching_the_database(
            int horseId, int competitionId)
        {
            RejectHealthCertificateRequest request = new RejectHealthCertificateRequest
            {
                HorseId = horseId,
                CompetitionId = competitionId,
                RanchId = 1,
                Reason = "הקובץ אינו קריא"
            };

            Action act = () => HorseParticipationInCompetition.RejectHealthCertificate(request, 1);

            act.Should().Throw<ArgumentException>().WithMessage("מזהה סוס או תחרות לא תקין");
        }

        [Fact]
        public void The_bl_trims_the_reason_before_passing_it_to_the_dal()
        {
            string source = File.ReadAllText(
                Path.GetFullPath(Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "BL", "HorseParticipationInCompetition.cs")));

            source.Should().Contain("request.Reason.Trim()");
        }

        // =================================================================
        // 5/6/7. Controller captures the bool and branches: false->409, true->200.
        // ArgumentException -> 400 with the fixed BL message, not a 500.
        // =================================================================

        private static string ControllerRejectMethodBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult RejectHealthCertificate(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "RejectHealthCertificate was expected in HorsesController");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "Console.WriteLine($\"Error in RejectHealthCertificate:",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_route_is_registered_as_a_distinct_post_endpoint()
        {
            ControllerSource().Should().Contain("[HttpPost(\"health-certificates/reject\")]");
        }

        [Fact]
        public void The_controller_captures_the_bl_result_instead_of_ignoring_it()
        {
            ControllerRejectMethodBody().Should().Contain(
                "bool rejected = HorseParticipationInCompetition.RejectHealthCertificate(request, currentPersonId);");
        }

        [Fact]
        public void A_false_result_returns_409_with_a_fixed_hebrew_message()
        {
            string body = ControllerRejectMethodBody();

            body.Should().Contain("if (!rejected)");
            body.Should().Contain("StatusCode(409,");

            // Must be its own distinct message, not a copy-paste of approve's 409 text.
            body.Should().NotContain("לא ניתן לאשר את תעודת הבריאות");
        }

        [Fact]
        public void A_true_result_returns_a_200_success_response()
        {
            ControllerRejectMethodBody().Should().Contain("return Ok(new { message =");
        }

        [Fact]
        public void The_bool_is_captured_and_checked_before_the_success_response_can_run()
        {
            string body = ControllerRejectMethodBody();

            int boolAt = body.IndexOf("bool rejected =", StringComparison.Ordinal);
            int ifAt = body.IndexOf("if (!rejected)", StringComparison.Ordinal);
            int conflictAt = body.IndexOf("StatusCode(409,", StringComparison.Ordinal);
            int okAt = body.IndexOf("return Ok(new { message", StringComparison.Ordinal);

            boolAt.Should().BeGreaterThan(-1);
            ifAt.Should().BeGreaterThan(-1);
            conflictAt.Should().BeGreaterThan(-1);
            okAt.Should().BeGreaterThan(-1);

            boolAt.Should().BeLessThan(ifAt);
            ifAt.Should().BeLessThan(conflictAt);
            conflictAt.Should().BeLessThan(okAt);
        }

        [Fact]
        public void An_ArgumentException_is_caught_and_returns_BadRequest_with_its_own_message()
        {
            string body = ControllerRejectMethodBody();

            body.Should().Contain("catch (ArgumentException ex)");
            body.Should().Contain("return BadRequest(ex.Message);");

            // The ArgumentException catch must appear before the generic Exception
            // catch, or it would never be reached.
            int argCatchAt = body.IndexOf("catch (ArgumentException ex)", StringComparison.Ordinal);
            int genericCatchAt = body.IndexOf("catch (Exception ex)", StringComparison.Ordinal);

            argCatchAt.Should().BeGreaterThan(-1);
            genericCatchAt.Should().BeGreaterThan(-1);
            argCatchAt.Should().BeLessThan(genericCatchAt);
        }

        [Fact]
        public void The_approve_endpoint_is_not_touched_by_this_change()
        {
            // This fix is scoped to the new reject endpoint only - ApproveHealthCertificate
            // must keep falling through to its existing generic catch, unchanged.
            string source = ControllerSource();

            int approveFrom = source.IndexOf(
                "public IActionResult ApproveHealthCertificate(", StringComparison.Ordinal);
            int approveTo = source.IndexOf(
                "Console.WriteLine($\"Error in ApproveHealthCertificate:", StringComparison.Ordinal);

            approveFrom.Should().BeGreaterThan(-1);
            approveTo.Should().BeGreaterThan(-1);

            string approveBody = source.Substring(approveFrom, approveTo - approveFrom);

            approveBody.Should().NotContain("catch (ArgumentException ex)");
        }

        [Fact]
        public void No_raw_database_or_exception_text_reaches_the_500_response()
        {
            string source = ControllerSource();

            source.Should().Contain("return StatusCode(500, \"שגיאה בדחיית תעודת הבריאות\");");
            source.Should().NotContain("StatusCode(500, ex.Message)");
        }

        [Fact]
        public void StatusCode_409_ex_Message_appears_exactly_once_for_the_deliberate_ValidationException_catch()
        {
            // Deliberate, not a leak: the RN001 guard's own short guard text is
            // surfaced as-is on this one path, matching the established
            // ShavingsOrdersController.ClaimOrder / AdminCancelShavingsOrder
            // precedent. A legitimate caller cannot reach this branch - the
            // controller's own HostSecretary + host-ranch checks above already
            // block an unauthorized caller earlier, with a proper Hebrew
            // message. This assertion still fails if a second, unreviewed
            // StatusCode(409, ex.Message) is ever added anywhere else in the
            // controller.
            CountOccurrences(ControllerSource(), "StatusCode(409, ex.Message)").Should().Be(1);
        }

        // =================================================================
        // 8. Authorization mirrors the approve endpoint exactly.
        // =================================================================

        [Fact]
        public void The_reject_route_checks_only_HostSecretary()
        {
            string body = ControllerRejectMethodBody();

            body.Should().Contain("RoleNames.HostSecretary");
            body.Should().NotContain("RoleNames.RanchAdmin");
        }

        [Fact]
        public void The_reject_route_requires_ranchId_to_equal_the_competitions_own_host_ranch()
        {
            string body = ControllerRejectMethodBody();

            body.Should().Contain("Competition.GetCompetitionById(request.CompetitionId)");
            body.Should().Contain("competition.HostRanchId != request.RanchId");
            body.Should().Contain("StatusCode(403,");
        }

        [Fact]
        public void The_reject_endpoint_request_shape_matches_the_approve_endpoints_pattern()
        {
            MethodInfo action = typeof(RideOnServer.Controllers.HorsesController)
                .GetMethod("RejectHealthCertificate", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException("RejectHealthCertificate was not found.");

            ParameterInfo[] parameters = action.GetParameters();

            parameters.Should().HaveCount(1);
            parameters[0].Name.Should().Be("request");
            parameters[0].ParameterType.Name.Should().Be("RejectHealthCertificateRequest");
        }

        // =================================================================
        // 9. HealthCertificateItem / DAL mapper carry the three new fields.
        // =================================================================

        [Fact]
        public void HealthCertificateItem_exposes_the_three_rejection_fields()
        {
            Type type = typeof(HealthCertificateItem);

            type.GetProperty("HcRejectionReason").Should().NotBeNull();
            type.GetProperty("HcRejectionDate").Should().NotBeNull();
            type.GetProperty("HcRejectedBySystemUserId").Should().NotBeNull();

            type.GetProperty("HcRejectionReason")!.PropertyType.Should().Be(typeof(string));
            type.GetProperty("HcRejectionDate")!.PropertyType.Should().Be(typeof(DateOnly?));
            type.GetProperty("HcRejectedBySystemUserId")!.PropertyType.Should().Be(typeof(int?));
        }

        [Fact]
        public void The_shared_mapper_reads_all_three_rejection_columns_by_name()
        {
            string dal = DalSource();

            dal.Should().Contain("reader[\"HcRejectionReason\"]");
            dal.Should().Contain("reader[\"HcRejectionDate\"]");
            dal.Should().Contain("reader[\"HcRejectedBySystemUserId\"]");

            // Still shared by both read procs - no second mapper was introduced.
            CountOccurrences(dal, "new HealthCertificateItem").Should().Be(1);
            CountOccurrences(dal, "ReadHealthCertificateItem(reader)").Should().Be(2);
        }

        // =================================================================
        // 10. RPC-bypass security hardening (2026-08-07): usp_RejectHealthCertificate
        // must not rely solely on HorsesController for authorization, since every
        // proc in this schema has EXECUTE granted to anon/authenticated and the
        // Supabase anon key is public. Mirrors the established worker
        // shavings-mutation-authorization fix (115_usp_ClaimShavingsOrder.sql,
        // RN001 -> ValidationException convention).
        // =================================================================

        private static string RejectProcSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(),
                    "..",
                    "RideOnDB",
                    "StoredProcedures",
                    "PostgreSQL",
                    "Individual",
                    "245_usp_RejectHealthCertificate.sql"));

            File.Exists(path).Should().BeTrue("245_usp_RejectHealthCertificate.sql was expected at {0}", path);

            return File.ReadAllText(path);
        }

        [Fact]
        public void The_proc_derives_the_host_ranch_from_the_competition_and_never_takes_a_ranch_id_parameter()
        {
            string sql = RejectProcSource();

            sql.Should().Contain("FROM public.competition c");
            sql.Should().Contain("WHERE c.competitionid = p_CompetitionId");
            sql.Should().Contain("INTO v_HostRanchId");

            // Nothing for a caller to spoof: the function signature itself has no
            // ranch id parameter at all.
            sql.Should().NotContain("p_RanchId");
            sql.Should().NotContain("p_HostRanchId INTEGER,");
        }

        [Fact]
        public void The_proc_verifies_the_callers_role_against_personranchrole_and_role()
        {
            string sql = RejectProcSource();

            sql.Should().Contain("FROM public.personranchrole prr");
            sql.Should().Contain("JOIN public.role r ON r.roleid = prr.roleid");
            sql.Should().Contain("prr.personid = p_HcRejectedBySystemUserId");
            sql.Should().Contain("prr.ranchid = v_HostRanchId");
            sql.Should().Contain("prr.rolestatus = 'Approved'");
            sql.Should().Contain("r.rolename = 'מזכירת חווה מארחת'");
        }

        [Fact]
        public void The_proc_raises_RN001_for_every_guard_including_authorization()
        {
            string sql = RejectProcSource();

            int occurrences = CountOccurrences(sql, "ERRCODE = 'RN001'");

            // Invalid horse id, invalid competition id, invalid rejecting user id,
            // empty reason, competition not found, caller not an approved host
            // secretary - six distinct guards, all using the established
            // convention.
            occurrences.Should().Be(6);
        }

        [Fact]
        public void The_proc_signature_is_unchanged_by_the_hardening()
        {
            // The hardening is body-only - CREATE OR REPLACE, no DROP, no new
            // parameter. p_HcRejectedBySystemUserId already existed before the
            // guard was added; it is now actually used for its stated purpose.
            string sql = RejectProcSource();

            sql.Should().Contain("CREATE OR REPLACE FUNCTION public.usp_RejectHealthCertificate(");
            sql.Should().NotContain("DROP FUNCTION");

            sql.Should().Contain("p_HorseId                  INTEGER");
            sql.Should().Contain("p_CompetitionId             INTEGER");
            sql.Should().Contain("p_HcRejectedBySystemUserId  INTEGER");
            sql.Should().Contain("p_HcRejectionDate           DATE");
            sql.Should().Contain("p_HcRejectionReason         CHARACTER VARYING");
        }

        [Fact]
        public void The_authorization_guard_runs_before_the_update_statement()
        {
            string sql = RejectProcSource();

            int guardAt = sql.IndexOf(
                "Caller is not an approved host secretary", StringComparison.Ordinal);
            int updateAt = sql.IndexOf(
                "UPDATE public.horseparticipationincompetition", StringComparison.Ordinal);

            guardAt.Should().BeGreaterThan(-1);
            updateAt.Should().BeGreaterThan(-1);
            guardAt.Should().BeLessThan(updateAt, "the mutation must never run before authorization is verified");
        }

        [Fact]
        public void The_dal_catches_RN001_and_rethrows_a_validation_exception_carrying_the_sql_message_text()
        {
            string body = DalRejectMethodBody();

            body.Should().Contain("catch (PostgresException ex) when (ex.SqlState == \"RN001\")");
            body.Should().Contain("throw new BL.ValidationException(ex.MessageText);");

            // Must appear before the generic catch, or it is unreachable.
            int rn001At = body.IndexOf("catch (PostgresException ex) when (ex.SqlState == \"RN001\")", StringComparison.Ordinal);
            int genericAt = body.IndexOf("catch (Exception ex)", StringComparison.Ordinal);

            rn001At.Should().BeGreaterThan(-1);
            genericAt.Should().BeGreaterThan(-1);
            rn001At.Should().BeLessThan(genericAt);
        }

        [Fact]
        public void The_controller_catches_ValidationException_and_maps_it_to_409()
        {
            string body = ControllerRejectMethodBody();

            body.Should().Contain("catch (ValidationException ex)");
            body.Should().Contain("return StatusCode(409, ex.Message);");

            // Must appear before the generic catch, or it is unreachable.
            int validationAt = body.IndexOf("catch (ValidationException ex)", StringComparison.Ordinal);
            int genericAt = body.IndexOf("catch (Exception ex)", StringComparison.Ordinal);

            validationAt.Should().BeGreaterThan(-1);
            genericAt.Should().BeGreaterThan(-1);
            validationAt.Should().BeLessThan(genericAt);
        }
    }
}
