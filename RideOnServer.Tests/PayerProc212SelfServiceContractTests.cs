using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // payer-proc212-self-service-hardening (2026-08-07): the Admin
    // "view a managed payer" screen (GET /Payers/competition-account) and the
    // Payer self-service screen (GET /Payers/my-competition-account) used to
    // share one BL/DAL/proc path, with self-service forcing
    // payerPersonId = currentPersonId to satisfy Proc 212's
    // personmanagedbysystemuser managed-payer check - a check that has
    // nothing to do with self-identity and denied legitimate Payers who have
    // no self-managed row (the normal case). This split gives self-service
    // its own proc (usp_getmypayercompetitionaccount) with its own
    // authorization predicate, while the Admin path's proc, method, and
    // authorization are preserved byte-for-byte.
    //
    // DB-free, matching every other contract test file in this project: no
    // mocking framework and no HTTP test host exist here, so this proves the
    // C# contract and the SQL text contract only, using the same two
    // techniques already established - reflection over public signatures,
    // and bounded source-text assertions over the real BL/DAL/Controller/SQL
    // files (see HealthCertificateRejectionContractTests for the precedent
    // this follows). Live-DB guarantees (the ACL revoke taking effect, the
    // Approved-Payer-role predicate actually blocking/allowing correctly, the
    // Admin path's output being byte-identical to before) are proven against
    // live data in rolled-back transactions as part of this change's DB
    // verification, not here.
    public class PayerProc212SelfServiceContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ReadRepoFile(params string[] relativeParts)
        {
            string[] parts = new string[relativeParts.Length + 2];
            parts[0] = TestSourceDirectory();
            parts[1] = "..";
            Array.Copy(relativeParts, 0, parts, 2, relativeParts.Length);

            string path = Path.GetFullPath(Path.Combine(parts));

            File.Exists(path).Should().BeTrue("expected a file at {0}", path);

            return File.ReadAllText(path);
        }

        private static string ControllerSource() =>
            ReadRepoFile("RideOnServer", "Controllers", "PayersController.cs");

        private static string BlSource() =>
            ReadRepoFile("RideOnServer", "BL", "Payer.cs");

        private static string DalSource() =>
            ReadRepoFile("RideOnServer", "DAL", "PayerDAL.cs");

        private static string AdminProcSource() =>
            ReadRepoFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                "212_usp_GetPayerCompetitionAccount.sql");

        private static string BodyProcSource() =>
            ReadRepoFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                "250_usp_GetPayerCompetitionAccountBody.sql");

        private static string SelfServiceProcSource() =>
            ReadRepoFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                "251_usp_GetMyPayerCompetitionAccount.sql");

        private static string MigrationSource() =>
            ReadRepoFile(
                "RideOnDB", "migrations", "payer_proc212_self_service_split.sql");

        // Header comments legitimately narrate the audit context in prose
        // (e.g. explaining WHY a proc has no personmanagedbysystemuser check
        // by naming the thing it deliberately does not depend on) - "must not
        // depend on X" assertions below scope to the actual function body,
        // never the header comment, to avoid a false failure on documentation.
        private static string ExtractFunctionBody(string sql)
        {
            int from = sql.IndexOf("AS $function$", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "expected a plpgsql function body marker");

            return sql.Substring(from);
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
        // 1. Admin endpoint still calls the Admin BL/DAL/proc path, unchanged.
        // =================================================================

        private static string AdminActionBody()
        {
            string source = ControllerSource();
            int from = source.IndexOf(
                "public IActionResult GetPayerCompetitionAccount(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            int to = source.IndexOf(
                "[HttpGet(\"my-competition-account\")]", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            return source.Substring(from, to - from);
        }

        [Fact]
        public void The_admin_action_still_calls_Payer_GetPayerCompetitionAccount_with_four_arguments()
        {
            string body = AdminActionBody();

            body.Should().Contain("Payer.GetPayerCompetitionAccount(");
            body.Should().Contain("currentPersonId,");
            body.Should().Contain("competitionId,");
            body.Should().Contain("ranchId,");
            body.Should().Contain("payerPersonId");

            // payerPersonId on the Admin path is still a real query parameter -
            // this route, unlike self-service, legitimately views ANOTHER
            // person's account and must keep accepting it.
            ControllerSource().Should().Contain("[FromQuery] int payerPersonId");
        }

        [Fact]
        public void The_admin_action_role_gate_is_unchanged_RanchAdmin()
        {
            AdminActionBody().Should().Contain("RoleNames.RanchAdmin");
        }

        [Fact]
        public void The_admin_bl_method_still_targets_the_four_arg_dal_method()
        {
            string source = BlSource();
            int from = source.IndexOf(
                "internal static string GetPayerCompetitionAccount(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            int to = source.IndexOf(
                "internal static string GetMyPayerCompetitionAccount(", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string body = source.Substring(from, to - from);

            body.Should().Contain("dal.GetPayerCompetitionAccount(");
            body.Should().NotContain("dal.GetMyPayerCompetitionAccount(");
        }

        [Fact]
        public void The_admin_dal_method_still_calls_the_unchanged_four_arg_proc_name()
        {
            string source = DalSource();
            int from = source.IndexOf(
                "public string GetPayerCompetitionAccount(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            // Stop before the self-service method's own leading doc comment
            // (which legitimately names the sibling proc/method) rather than
            // at its signature, so this slice covers ONLY the admin method's
            // real code.
            int to = source.IndexOf(
                "// Self-service path (fix/payer-proc212-self-service-hardening)",
                StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string body = source.Substring(from, to - from);

            body.Should().Contain("\"usp_getpayercompetitionaccount\"");
            body.Should().Contain("\"@p_adminsystemuserid\", systemUserId");
            body.Should().NotContain("usp_getmypayercompetitionaccount");
        }

        // =================================================================
        // 2. Self-service endpoint can ONLY call the self-service path -
        //    never the Admin method, never with an admin-identity parameter.
        // =================================================================

        private static string SelfServiceActionBody()
        {
            string source = ControllerSource();
            int from = source.IndexOf(
                "public IActionResult GetMyCompetitionAccount(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            int to = source.IndexOf(
                "[HttpGet(\"secretary/competition-payers\")]", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            return source.Substring(from, to - from);
        }

        [Fact]
        public void The_self_service_action_calls_GetMyPayerCompetitionAccount_not_the_admin_method()
        {
            string body = SelfServiceActionBody();

            body.Should().Contain("Payer.GetMyPayerCompetitionAccount(");
            body.Should().NotContain("Payer.GetPayerCompetitionAccount(");
        }

        [Fact]
        public void The_self_service_bl_method_targets_the_self_service_dal_method_only()
        {
            string source = BlSource();
            int from = source.IndexOf(
                "internal static string GetMyPayerCompetitionAccount(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            int to = source.IndexOf(
                "internal static List<DTOs.Payers.CompetitionPayerForSecretaryItem> GetCompetitionPayersForSecretary(",
                StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            string body = source.Substring(from, to - from);

            body.Should().Contain("dal.GetMyPayerCompetitionAccount(");
            body.Should().NotContain("dal.GetPayerCompetitionAccount(");
        }

        [Fact]
        public void The_self_service_dal_method_calls_the_new_three_arg_proc_and_never_binds_an_admin_identity()
        {
            string source = DalSource();
            int from = source.IndexOf(
                "public string GetMyPayerCompetitionAccount(", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string body = source.Substring(from);
            int to = body.IndexOf(
                "public List<CompetitionPayerForSecretaryItem> GetCompetitionPayersForSecretary(",
                StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            body = body.Substring(0, to);

            body.Should().Contain("\"usp_getmypayercompetitionaccount\"");
            body.Should().NotContain("@p_adminsystemuserid");
            body.Should().NotContain("usp_getpayercompetitionaccount\"");
        }

        [Fact]
        public void The_self_service_dal_method_has_exactly_three_parameters()
        {
            MethodInfo method = typeof(PayerDAL)
                .GetMethod("GetMyPayerCompetitionAccount", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException("PayerDAL.GetMyPayerCompetitionAccount was not found.");

            method.GetParameters().Should().HaveCount(3);
        }

        // =================================================================
        // 3. payerPersonId for self-service is JWT/currentPersonId only -
        //    never a query or body input on this route.
        // =================================================================

        [Fact]
        public void The_self_service_route_accepts_no_payerPersonId_parameter_at_all()
        {
            MethodInfo action = typeof(RideOnServer.Controllers.PayersController)
                .GetMethod("GetMyCompetitionAccount", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException("GetMyCompetitionAccount was not found.");

            action.GetParameters()
                .Select(p => p.Name)
                .Should().NotContain("payerPersonId");
        }

        [Fact]
        public void The_self_service_action_derives_identity_only_from_the_jwt_claims()
        {
            string body = SelfServiceActionBody();

            body.Should().Contain("UserAccessValidator.GetPersonIdFromClaims(User)");

            // currentPersonId (JWT-derived) must be the FIRST argument passed
            // to the self-service BL call - not competitionId or ranchId,
            // which come from [FromQuery] and are the only client-controlled
            // inputs on this route.
            int callAt = body.IndexOf("Payer.GetMyPayerCompetitionAccount(", StringComparison.Ordinal);
            callAt.Should().BeGreaterThan(-1);

            string afterCall = body.Substring(callAt + "Payer.GetMyPayerCompetitionAccount(".Length);
            string firstArg = afterCall.Split(',')[0].Trim();

            firstArg.Should().Be("currentPersonId");
        }

        [Fact]
        public void The_self_service_action_still_requires_an_approved_payer_role_in_the_ranch()
        {
            string body = SelfServiceActionBody();

            body.Should().Contain("UserAccessValidator.EnsureUserHasRoleInRanch(");
            body.Should().Contain("RoleNames.Payer");
        }

        // =================================================================
        // 4. Admin managed-payer authorization remains present, unchanged.
        // =================================================================

        [Fact]
        public void The_admin_proc_still_checks_personmanagedbysystemuser_exactly_as_before()
        {
            string sql = AdminProcSource();

            sql.Should().Contain("from public.personmanagedbysystemuser m");
            sql.Should().Contain("m.systemuserid = p_adminsystemuserid");
            sql.Should().Contain("m.personid = p_payerpersonid");
            sql.Should().Contain("m.approvalstatus = 'Approved'");
            sql.Should().Contain("prr.ranchid = p_ranchid");
            sql.Should().Contain("r.rolename = 'משלם'");
            sql.Should().Contain("raise exception 'Payer is not managed by this admin in this ranch';");
        }

        [Fact]
        public void The_admin_proc_signature_is_unchanged_body_only_replace()
        {
            string sql = AdminProcSource();

            sql.Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_getpayercompetitionaccount(p_competitionid integer, p_ranchid integer, p_payerpersonid integer, p_adminsystemuserid integer)");
            sql.Should().NotContain("DROP FUNCTION");
            sql.Should().NotContain("p_isselfservice");
        }

        [Fact]
        public void The_admin_proc_now_delegates_to_the_shared_body_instead_of_inlining_it()
        {
            string sql = AdminProcSource();

            sql.Should().Contain("return public.usp_getpayercompetitionaccount_body(p_competitionid, p_ranchid, p_payerpersonid);");

            // The heavy CTE body must be gone from this file now - it lives in
            // 250 only. class_items/stall_items/shavings_items/fine_items are
            // markers of the inlined body that must not remain here.
            sql.Should().NotContain("class_items as (");
            sql.Should().NotContain("stall_items as (");
            sql.Should().NotContain("jsonb_build_object(");
        }

        // =================================================================
        // 5. Self-service Approved-Payer-role predicate is present, and does
        //    NOT depend on personmanagedbysystemuser at all.
        // =================================================================

        [Fact]
        public void The_self_service_proc_checks_an_approved_payer_role_in_the_ranch()
        {
            string sql = SelfServiceProcSource();

            sql.Should().Contain("from public.personranchrole prr");
            sql.Should().Contain("prr.personid = p_payerpersonid");
            sql.Should().Contain("prr.ranchid = p_ranchid");
            sql.Should().Contain("prr.rolestatus = 'Approved'");
            sql.Should().Contain("r.rolename = 'משלם'");
        }

        [Fact]
        public void The_self_service_proc_has_no_personmanagedbysystemuser_dependency()
        {
            ExtractFunctionBody(SelfServiceProcSource()).Should().NotContain("personmanagedbysystemuser");
        }

        [Fact]
        public void The_self_service_proc_has_no_adminsystemuserid_parameter()
        {
            string sql = SelfServiceProcSource();

            sql.Should().Contain(
                "CREATE FUNCTION public.usp_getmypayercompetitionaccount(p_competitionid integer, p_ranchid integer, p_payerpersonid integer)");
            ExtractFunctionBody(sql).Should().NotContain("p_adminsystemuserid");
        }

        [Fact]
        public void The_self_service_proc_delegates_to_the_same_shared_body_as_the_admin_proc()
        {
            SelfServiceProcSource().Should().Contain(
                "return public.usp_getpayercompetitionaccount_body(p_competitionid, p_ranchid, p_payerpersonid);");
        }

        // =================================================================
        // 6. The shared body has zero authorization logic of its own - both
        //    callers are responsible for authorizing before they reach it.
        // =================================================================

        [Fact]
        public void The_shared_body_proc_has_no_authorization_predicate_at_all()
        {
            string sql = BodyProcSource();

            sql.Should().Contain(
                "CREATE FUNCTION public.usp_getpayercompetitionaccount_body(p_competitionid integer, p_ranchid integer, p_payerpersonid integer)");

            string functionBody = ExtractFunctionBody(sql);
            functionBody.Should().NotContain("personmanagedbysystemuser");
            functionBody.Should().NotContain("personranchrole");
        }

        [Fact]
        public void The_shared_body_proc_preserves_every_cte_and_json_key_from_the_original_inline_body()
        {
            string sql = BodyProcSource();

            // Spot-check every CTE name and every top-level JSON key from the
            // pre-split proc - a dropped CTE or renamed/removed JSON key here
            // would silently break the response contract for both callers.
            string[] expectedCtes =
            {
                "payer_base as (", "charge_allocations as (", "payer_charges as (",
                "class_charge_history as (", "class_charge_summary as (", "class_items as (",
                "paidtime_charge_summary as (", "paidtime_items as (",
                "product_charge_summary as (", "stall_items as (",
                "shavings_charge_existence as (", "shavings_items as (",
                "fine_items as (", "summary_values as (", "final_summary as ("
            };

            foreach (string cte in expectedCtes)
            {
                sql.Should().Contain(cte, "CTE {0} must survive the extraction unchanged", cte);
            }

            string[] expectedTopLevelJsonKeys =
            {
                "'payer',", "'summary',", "'classes',", "'paidTimes',", "'stalls',",
                "'shavings',", "'fines',"
            };

            foreach (string key in expectedTopLevelJsonKeys)
            {
                sql.Should().Contain(key, "top-level JSON key {0} must survive the extraction unchanged", key);
            }
        }

        // =================================================================
        // 7. ACL: all three functions' intended REVOKE statements are present.
        // =================================================================

        [Fact]
        public void The_migration_revokes_execute_from_all_four_grantees_on_all_three_functions()
        {
            string sql = MigrationSource();

            string[] targets =
            {
                "public.usp_getpayercompetitionaccount(integer, integer, integer, integer)",
                "public.usp_getpayercompetitionaccount_body(integer, integer, integer)",
                "public.usp_getmypayercompetitionaccount(integer, integer, integer)"
            };

            foreach (string target in targets)
            {
                string needle = $"REVOKE EXECUTE ON FUNCTION {target}";
                sql.Should().Contain(needle, "expected an EXECUTE revoke for {0}", target);
            }

            // Every revoke line must name all four grantees together, not a
            // subset - a partial revoke would leave the RPC-bypass open.
            CountOccurrences(sql, "FROM PUBLIC, anon, authenticated, service_role;").Should().Be(3);
        }

        [Fact]
        public void The_migration_does_not_grant_execute_back_to_public_anon_authenticated_or_service_role()
        {
            string sql = MigrationSource();

            sql.Should().NotContain("GRANT EXECUTE");
            sql.Should().NotContain("TO anon");
            sql.Should().NotContain("TO authenticated");
            sql.Should().NotContain("TO service_role");
            sql.Should().NotContain("TO PUBLIC");
        }

        // =================================================================
        // 8. No same-name overload exists anywhere in this change.
        // =================================================================

        [Fact]
        public void No_file_declares_a_second_usp_getpayercompetitionaccount_signature()
        {
            // The admin proc file must declare usp_getpayercompetitionaccount
            // exactly once, with exactly the original 4-arg signature - never
            // a second overload of the same name.
            string sql = AdminProcSource();

            CountOccurrences(sql, "FUNCTION public.usp_getpayercompetitionaccount(").Should().Be(1);
            sql.Should().NotContain("usp_getpayercompetitionaccount(p_competitionid integer, p_ranchid integer, p_payerpersonid integer, p_adminsystemuserid integer, ");
        }

        [Fact]
        public void The_self_service_and_body_procs_use_distinct_names_not_an_overload()
        {
            // usp_getmypayercompetitionaccount and usp_getpayercompetitionaccount_body
            // are different names entirely - Postgres overload ambiguity only
            // arises between functions sharing a name, so this is definitionally
            // safe, but pinned here so a future rename toward the admin proc's
            // name cannot land unnoticed.
            SelfServiceProcSource().Should().Contain("FUNCTION public.usp_getmypayercompetitionaccount(");
            SelfServiceProcSource().Should().NotContain("FUNCTION public.usp_getpayercompetitionaccount(");

            BodyProcSource().Should().Contain("FUNCTION public.usp_getpayercompetitionaccount_body(");
            BodyProcSource().Should().NotContain("FUNCTION public.usp_getpayercompetitionaccount(");
        }

        // =================================================================
        // 9. Response JSON contract is unchanged for both callers - both
        //    still return a raw JSON string that the controller deserializes
        //    to a JsonElement and returns via Ok(...), the same shape as
        //    before this change on the Admin path.
        // =================================================================

        [Fact]
        public void Both_dal_methods_return_the_procs_result_as_a_raw_json_string_the_same_way()
        {
            string source = DalSource();

            CountOccurrences(source, "return result.ToString() ?? \"{}\";").Should().Be(2);
            CountOccurrences(source, "if (result == null || result == DBNull.Value)").Should().BeGreaterThanOrEqualTo(2);
        }

        [Fact]
        public void Both_controller_actions_deserialize_and_return_the_json_the_same_way()
        {
            string adminBody = AdminActionBody();
            string selfServiceBody = SelfServiceActionBody();

            foreach (string body in new[] { adminBody, selfServiceBody })
            {
                body.Should().Contain("JsonElement account = JsonSerializer.Deserialize<JsonElement>(accountJson);");
                body.Should().Contain("return Ok(account);");
            }
        }

        [Fact]
        public void Both_bl_methods_return_a_bare_string_matching_the_original_signature_shape()
        {
            MethodInfo adminMethod = typeof(Payer)
                .GetMethod("GetPayerCompetitionAccount", BindingFlags.NonPublic | BindingFlags.Static)
                ?? throw new InvalidOperationException("Payer.GetPayerCompetitionAccount was not found.");

            MethodInfo selfServiceMethod = typeof(Payer)
                .GetMethod("GetMyPayerCompetitionAccount", BindingFlags.NonPublic | BindingFlags.Static)
                ?? throw new InvalidOperationException("Payer.GetMyPayerCompetitionAccount was not found.");

            adminMethod.ReturnType.Should().Be(typeof(string));
            selfServiceMethod.ReturnType.Should().Be(typeof(string));
        }
    }
}
