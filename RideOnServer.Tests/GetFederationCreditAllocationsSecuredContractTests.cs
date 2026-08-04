using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // Closes a cross-competition disclosure gap on the federation credit
    // allocation-history read path: the Controller authorizes the caller
    // against competitionId/ranchId, but that competitionId was never
    // forwarded past the C# layer - usp_getfederationcreditallocations (194)
    // has no competition parameter and only checks that the requested credit
    // exists anywhere in the system. A HostSecretary authorized for
    // Competition A could supply a FederationExternalCreditId belonging to
    // Competition B and read B's full allocation detail.
    //
    // usp_getfederationcreditallocationssecured (227) is a thin,
    // competition-scoped wrapper that re-confirms the credit belongs to the
    // caller's authorized competition before delegating the actual read to
    // 194 unchanged. This file is DB-free, matching
    // AllocateFederationCreditSecuredContractTests.cs: no mocking framework
    // and no HTTP test host exist in this project, so it proves the C#
    // contract only via bounded source-text assertions against the
    // Controller, BL, DAL and both Stored Procedure files.
    //
    // Deliberately NOT asserted: "zero references to
    // usp_getfederationcreditallocations in the repository" - 194 remains
    // the internal read primitive, called by name from inside 227 (required,
    // tested explicitly below).
    public class GetFederationCreditAllocationsSecuredContractTests
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

        private static string ControllerSource()
        {
            return ReadServerFile("RideOnServer", "Controllers", "CompetitionPaymentsController.cs");
        }

        private static string BlSource()
        {
            return ReadServerFile("RideOnServer", "BL", "CompetitionPayment.cs");
        }

        private static string DalSource()
        {
            return ReadServerFile("RideOnServer", "DAL", "CompetitionPaymentDAL.cs");
        }

        private static string SecuredWrapperSqlSource()
        {
            return ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                "227_usp_GetFederationCreditAllocationsSecured.sql");
        }

        private static string UnscopedPrimitiveSqlSource()
        {
            return ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                "194_usp_GetFederationCreditAllocations.sql");
        }

        // =================================================================
        // Controller: authorization runs before the BL/DAL call, competitionId
        // is bound from the query string (not the path), never from the body.
        // =================================================================

        private static string ControllerActionBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult GetFederationCreditAllocations(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "GetFederationCreditAllocations was expected in CompetitionPaymentsController");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "[HttpGet(\"federation/payers/{payerPersonId}/coverage-status\")]",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_route_takes_competitionId_and_ranchId_as_query_parameters()
        {
            string body = ControllerActionBody();

            body.Should().Contain("[FromQuery] int competitionId");
            body.Should().Contain("[FromQuery] int ranchId");
        }

        [Fact]
        public void Authorization_runs_before_the_bl_call()
        {
            string body = ControllerActionBody();

            int authAt = body.IndexOf("ValidateHostSecretaryCompetitionAccess(", StringComparison.Ordinal);
            int blAt = body.IndexOf("CompetitionPayment.GetFederationCreditAllocations(", StringComparison.Ordinal);

            authAt.Should().BeGreaterThan(-1);
            blAt.Should().BeGreaterThan(-1);
            authAt.Should().BeLessThan(blAt, "the caller must be authorized against competitionId/ranchId before any DAL call");
        }

        [Fact]
        public void The_bl_call_is_given_the_same_competitionId_the_caller_was_authorized_against()
        {
            string body = ControllerActionBody();

            int blAt = body.IndexOf("CompetitionPayment.GetFederationCreditAllocations(", StringComparison.Ordinal);
            blAt.Should().BeGreaterThan(-1);

            string callSite = body.Substring(blAt, 200);

            callSite.Should().Contain("competitionId");
            callSite.Should().Contain("ranchId");
            callSite.Should().Contain("federationExternalCreditId");
        }

        [Fact]
        public void Unauthorized_access_is_mapped_to_403_before_reaching_the_generic_catch()
        {
            string body = ControllerActionBody();

            body.Should().Contain("catch (UnauthorizedAccessException ex)");

            int unauthorizedAt = body.IndexOf("catch (UnauthorizedAccessException ex)", StringComparison.Ordinal);
            int genericAt = body.IndexOf("catch (Exception ex)", StringComparison.Ordinal);

            unauthorizedAt.Should().BeGreaterThan(-1);
            genericAt.Should().BeGreaterThan(-1);
            unauthorizedAt.Should().BeLessThan(genericAt);
        }

        // =================================================================
        // BL: forwards competitionId through to the DAL (it already receives
        // it for authorization - this proves it also reaches the DAL now).
        // =================================================================

        private static string BlMethodBody()
        {
            string source = BlSource();

            int from = source.IndexOf(
                "public static List<FederationCreditAllocationItem> GetFederationCreditAllocations(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "GetFederationCreditAllocations was expected in CompetitionPayment BL");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "public static FederationCoverageStatusItem GetFederationCoverageStatusForPayer(",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_bl_forwards_competitionId_to_the_dal()
        {
            string body = BlMethodBody();

            int dalCallAt = body.IndexOf("dal.GetFederationCreditAllocations(", StringComparison.Ordinal);
            dalCallAt.Should().BeGreaterThan(-1);

            string callSite = body.Substring(dalCallAt, 120);

            callSite.Should().Contain("competitionId");
            callSite.Should().Contain("federationExternalCreditId");
        }

        // =================================================================
        // DAL: calls the secured wrapper, binds both parameters, remains a
        // single round trip, mapping unchanged.
        // =================================================================

        private static string DalMethodBody()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public List<FederationCreditAllocationItem> GetFederationCreditAllocations(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "GetFederationCreditAllocations was expected in CompetitionPaymentDAL");

            string rest = source.Substring(from);

            int to = rest.IndexOf("catch (NpgsqlException ex)", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_dal_method_takes_competitionId_as_its_first_parameter()
        {
            string source = DalSource();

            source.Should().Contain(
                "public List<FederationCreditAllocationItem> GetFederationCreditAllocations(\n            int competitionId,\n            int federationExternalCreditId)"
                    .Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void The_dal_calls_the_secured_wrapper_not_the_unscoped_function_directly()
        {
            string body = DalMethodBody();

            body.Should().Contain("public.usp_getfederationcreditallocationssecured(");
            body.Should().NotContain("public.usp_getfederationcreditallocations(");
        }

        [Fact]
        public void The_dal_binds_competition_id_and_credit_id()
        {
            string body = DalMethodBody();

            body.Should().Contain("\"@competitionId\"");
            body.Should().Contain(").Value = competitionId;");
            body.Should().Contain("\"@federationExternalCreditId\"");
            body.Should().Contain(").Value = federationExternalCreditId;");
        }

        [Fact]
        public void The_dal_makes_exactly_one_round_trip()
        {
            string body = DalMethodBody();

            int connectCount = CountOccurrences(body, "Connect(\"DefaultConnection\")");
            int executeReaderCount = CountOccurrences(body, "ExecuteReader()");

            connectCount.Should().Be(1, "the secured read must remain a single round trip, no C# pre-query");
            executeReaderCount.Should().Be(1);
        }

        [Fact]
        public void The_dal_response_mapping_remains_complete()
        {
            string body = DalMethodBody();

            body.Should().Contain("GetInt(reader, \"FederationCreditAllocationId\")");
            body.Should().Contain("GetInt(reader, \"FederationExternalCreditId\")");
            body.Should().Contain("GetInt(reader, \"BillChargeId\")");
            body.Should().Contain("GetNullableInt(reader, \"EntryId\")");
            body.Should().Contain("GetDecimal(reader, \"AllocatedAmount\")");
            body.Should().Contain("GetDateTime(reader, \"AllocatedAt\")");
            body.Should().Contain("GetNullableString(reader, \"AllocationNotes\")");
            body.Should().Contain("GetInt(reader, \"BillId\")");
            body.Should().Contain("GetInt(reader, \"PaidByPersonId\")");
            body.Should().Contain("GetString(reader, \"PayerFullName\")");
            body.Should().Contain("GetNullableInt(reader, \"RiderFederationMemberId\")");
            body.Should().Contain("GetNullableString(reader, \"RiderFullName\")");
            body.Should().Contain("GetNullableInt(reader, \"HorseId\")");
            body.Should().Contain("GetNullableString(reader, \"HorseName\")");
            body.Should().Contain("GetNullableInt(reader, \"ClassInCompId\")");
            body.Should().Contain("GetNullableString(reader, \"ClassName\")");
            body.Should().Contain("GetNullableDateTime(reader, \"ClassDateTime\")");
            body.Should().Contain("GetDecimal(reader, \"BillChargeAmount\")");
            body.Should().Contain("GetString(reader, \"BillChargeStatus\")");
        }

        // =================================================================
        // Secured wrapper SQL (227): correct signature, delegates to 194,
        // does not duplicate 194's join/projection logic, has no exception
        // handler of its own (propagate, don't swallow).
        // =================================================================

        [Fact]
        public void The_secured_wrapper_file_exists_with_the_expected_signature()
        {
            string source = SecuredWrapperSqlSource();

            source.Should().Contain("CREATE OR REPLACE FUNCTION public.usp_getfederationcreditallocationssecured(");
            source.Should().Contain("p_competitionid integer");
            source.Should().Contain("p_federationexternalcreditid integer");
        }

        [Fact]
        public void The_secured_wrapper_delegates_the_read_to_the_unscoped_primitive()
        {
            string source = SecuredWrapperSqlSource();

            source.Should().Contain("from public.usp_getfederationcreditallocations(");
        }

        private static string SecuredWrapperFunctionBody()
        {
            string source = SecuredWrapperSqlSource();

            int from = source.IndexOf("AS $function$", StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            return source.Substring(from);
        }

        [Fact]
        public void The_secured_wrapper_does_not_duplicate_194s_join_or_projection_logic()
        {
            string body = SecuredWrapperFunctionBody();

            // Columns/joins that belong exclusively to 194's own projection -
            // if any of these appear here it means the join/projection logic
            // got duplicated outside the single source of truth.
            body.Should().NotContain("join public.billcharge");
            body.Should().NotContain("join public.servicerequest");
            body.Should().NotContain("join public.classincompetition");
            body.Should().NotContain("payerfullname");
        }

        [Fact]
        public void The_secured_wrapper_has_no_exception_handler()
        {
            string source = SecuredWrapperSqlSource();

            source.ToLowerInvariant().Should().NotContain("exception when");
        }

        [Fact]
        public void The_secured_wrapper_checks_existence_and_competition_scope_in_the_same_predicate()
        {
            string body = SecuredWrapperFunctionBody();

            int existsAt = body.IndexOf("if not exists (", StringComparison.Ordinal);
            existsAt.Should().BeGreaterThan(-1);

            string existsBlock = body.Substring(existsAt);
            int endAt = existsBlock.IndexOf(") then", StringComparison.Ordinal);
            endAt.Should().BeGreaterThan(-1);

            string predicate = existsBlock.Substring(0, endAt);

            predicate.Should().Contain("fec.federationexternalcreditid = p_federationexternalcreditid");
            predicate.Should().Contain("fec.competitionid = p_competitionid");
        }

        // =================================================================
        // Unscoped primitive (194) is untouched by this change.
        // =================================================================

        [Fact]
        public void The_unscoped_primitive_signature_is_unchanged()
        {
            string source = UnscopedPrimitiveSqlSource();

            source.Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_getfederationcreditallocations(p_federationexternalcreditid integer)");
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
    }
}
