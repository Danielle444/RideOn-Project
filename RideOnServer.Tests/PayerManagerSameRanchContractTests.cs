using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // fix/payer-manager-same-ranch-rule: an admin may manage a payer only
    // when both hold an Approved role at the SAME ranch (admin "אדמין חווה",
    // payer "משלם"). PayerDAL uses the positional CreateCommandWithStoredProcedure
    // helper directly inline (unlike ChangeTrackingDAL's separately-extracted
    // Build...Command methods), so there is no DB-free way to unit test the
    // built NpgsqlCommand here without a live connection or an invasive
    // refactor. Same source-text technique this project already uses for
    // proc-body and DAL-method-body assertions (see the tail of
    // ChangeTrackingAnswerDalCommandTests.cs) - proves ordering, catch
    // wiring, and SQL-guard shape without executing anything. The guard
    // predicate's own boolean logic was additionally proven against 9 live
    // rollback-safe scenarios in Supabase (see the branch report) - this
    // file pins the shape that was proven, so a future edit can't silently
    // drift the SQL away from what was actually tested live.
    public class PayerManagerSameRanchContractTests
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

        private static string PayerDalSource()
        {
            return ReadServerFile("RideOnServer", "DAL", "PayerDAL.cs");
        }

        private static string PayersControllerSource()
        {
            return ReadServerFile("RideOnServer", "Controllers", "PayersController.cs");
        }

        private static string MethodBody(string source, string signature, string nextSignature)
        {
            int from = source.IndexOf(signature, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, $"expected to find {signature}");

            string rest = source.Substring(from);

            int to = rest.IndexOf(nextSignature, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1, $"expected to find {nextSignature} after {signature}");

            return rest.Substring(0, to);
        }

        // =====================================================================
        // DAL: RequestManagedPayer must send RanchId positionally between
        // SystemUserId and FirstName, matching usp_requestmanagedpayer's new
        // (p_systemuserid, p_ranchid, p_firstname, ...) signature exactly -
        // CreateCommandWithStoredProcedure binds by dictionary ENTRY ORDER,
        // not by key name, so a misplaced entry silently binds the wrong SP
        // parameter instead of failing loudly.
        // =====================================================================

        private static string RequestManagedPayerDalBody()
        {
            return MethodBody(
                PayerDalSource(),
                "public int RequestManagedPayer(",
                "public void UpdateManagedPayerBasicDetails(");
        }

        [Fact]
        public void RequestManagedPayer_ParamDictionary_OrdersRanchIdBetweenSystemUserIdAndFirstName()
        {
            string body = RequestManagedPayerDalBody();

            int systemUserIdAt = body.IndexOf("\"@SystemUserId\"", StringComparison.Ordinal);
            int ranchIdAt = body.IndexOf("\"@RanchId\"", StringComparison.Ordinal);
            int firstNameAt = body.IndexOf("\"@FirstName\"", StringComparison.Ordinal);

            systemUserIdAt.Should().BeGreaterThan(-1);
            ranchIdAt.Should().BeGreaterThan(-1, "RanchId must be threaded into the SP call");
            firstNameAt.Should().BeGreaterThan(-1);

            ranchIdAt.Should().BeGreaterThan(systemUserIdAt,
                "usp_requestmanagedpayer's 2nd parameter is p_ranchid, right after p_systemuserid");
            ranchIdAt.Should().BeLessThan(firstNameAt,
                "RanchId must be bound before FirstName to match the SP's positional parameter order");
        }

        [Fact]
        public void RequestManagedPayer_SendsRequestRanchId_NotAHardcodedOrDerivedValue()
        {
            string body = RequestManagedPayerDalBody();

            body.Should().Contain("{ \"@RanchId\", request.RanchId }");
        }

        [Fact]
        public void RequestManagedPayer_CatchesP0001AndThrowsValidationException()
        {
            string body = RequestManagedPayerDalBody();

            body.Should().Contain("catch (PostgresException ex) when (ex.SqlState == \"P0001\")");
            body.Should().Contain("throw new BL.ValidationException(TranslateManagedPayerError(ex.MessageText));");
        }

        // =====================================================================
        // DAL: AddPayerManager (usp_addmanagingadminforpayer, the Payer-
        // initiated direct-add path) must also translate its business-rule
        // guard - previously had no P0001 handling at all, so even the two
        // pre-existing guards ("not an approved ranch admin",
        // "already linked") leaked as raw "Database error: ..." text.
        // =====================================================================

        private static string AddPayerManagerDalBody()
        {
            return MethodBody(
                PayerDalSource(),
                "public void AddPayerManager(",
                "public (int NewPersonId, string Username) CreatePayerWithCredentials(");
        }

        [Fact]
        public void AddPayerManager_CatchesP0001AndThrowsValidationException()
        {
            string body = AddPayerManagerDalBody();

            body.Should().Contain("catch (PostgresException ex) when (ex.SqlState == \"P0001\")");
            body.Should().Contain("throw new BL.ValidationException(TranslateManagedPayerError(ex.MessageText));");
        }

        // =====================================================================
        // Controller: both mutating endpoints that now can raise the new
        // same-ranch guard must map ValidationException to 409 with the
        // translated Hebrew message, matching the existing pattern already
        // used by UpdateManagedPayer/RemoveManagedPayer/AnswerPayerManagerRequest.
        // Without this, the guard's translated message never reaches the
        // client - it would fall into the generic catch(Exception) branch.
        // =====================================================================

        private static string RequestManagedPayerControllerBody()
        {
            return MethodBody(
                PayersControllerSource(),
                "public IActionResult RequestManagedPayer(",
                "[HttpPut(\"{personId}\")]");
        }

        private static string AddPayerManagerControllerBody()
        {
            return MethodBody(
                PayersControllerSource(),
                "public IActionResult AddPayerManager(",
                "[HttpPut(\"{personId}/managers/{adminPersonId}/answer\")]");
        }

        [Fact]
        public void RequestManagedPayerEndpoint_MapsValidationExceptionTo409()
        {
            string body = RequestManagedPayerControllerBody();

            body.Should().Contain("catch (ValidationException ex)");
            body.Should().Contain("StatusCode(StatusCodes.Status409Conflict, ex.Message);");
        }

        [Fact]
        public void AddPayerManagerEndpoint_MapsValidationExceptionTo409()
        {
            string body = AddPayerManagerControllerBody();

            body.Should().Contain("catch (ValidationException ex)");
            body.Should().Contain("StatusCode(StatusCodes.Status409Conflict, ex.Message);");
        }

        // =====================================================================
        // SQL: pin the exact guard shape proven live (see branch report) so a
        // future edit can't silently drift it. Every guard must check
        // rolestatus = 'Approved' on BOTH sides - usp_getpayercompetitionaccount
        // (212) is known to omit this on the payer side, and that omission
        // must not be repeated in the new write-side guards.
        // =====================================================================

        private static string FunctionBody(string sql)
        {
            int bodyStart = sql.IndexOf("AS $function$", StringComparison.Ordinal);
            bodyStart.Should().BeGreaterThan(-1, "expected a $function$ body marker");

            return sql.Substring(bodyStart);
        }

        private static string SqlFile(string fileName)
        {
            return ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName);
        }

        [Fact]
        public void RequestManagedPayerSql_HasRanchIdAsSecondParameter()
        {
            string sql = SqlFile("253_usp_RequestManagedPayer.sql");

            sql.Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_requestmanagedpayer(p_systemuserid integer, p_ranchid integer, p_firstname character varying");
        }

        [Fact]
        public void RequestManagedPayerSql_PayerGuard_ChecksApprovedRoleAtGivenRanch()
        {
            string body = FunctionBody(SqlFile("253_usp_RequestManagedPayer.sql"));

            body.Should().Contain("prr.ranchid = p_ranchid");
            body.Should().Contain("prr.rolestatus = 'Approved'");
            body.Should().Contain("r.rolename = 'משלם'");
            body.Should().Contain("Payer does not hold an approved Payer role in this ranch");

            // the payer-role check must run before the relationship is
            // touched at all (no INSERT/UPDATE before the guard).
            int guardAt = body.IndexOf("Payer does not hold an approved Payer role in this ranch", StringComparison.Ordinal);
            int insertAt = body.IndexOf("INSERT INTO personmanagedbysystemuser", StringComparison.Ordinal);

            guardAt.Should().BeGreaterThan(-1);
            insertAt.Should().BeGreaterThan(-1);
            guardAt.Should().BeLessThan(insertAt);
        }

        [Fact]
        public void AnswerManagedPayerRequestSql_GuardOnlyAppliesToApprovedPath()
        {
            string body = FunctionBody(SqlFile("252_usp_AnswerManagedPayerRequest.sql"));

            int approvedBranchAt = body.IndexOf("IF p_answerstatus = 'Approved' THEN", StringComparison.Ordinal);
            int guardAt = body.IndexOf("No shared approved ranch between admin and payer", StringComparison.Ordinal);

            approvedBranchAt.Should().BeGreaterThan(-1, "the guard must be scoped to the Approved path only");
            guardAt.Should().BeGreaterThan(approvedBranchAt, "the same-ranch guard must live inside the Approved branch");

            // Rejected keeps its exact prior behavior - untouched messages.
            body.Should().Contain("Invalid answer status");
            body.Should().Contain("Pending managed payer request not found");

            // not-found detection must run BEFORE the same-ranch guard, so a
            // request that was never Pending still gets the more specific
            // "not found" message instead of a misleading ranch error.
            int notFoundAt = body.IndexOf("Pending managed payer request not found", StringComparison.Ordinal);
            notFoundAt.Should().BeLessThan(guardAt);
        }

        [Fact]
        public void AnswerManagedPayerRequestSql_Guard_ChecksBothSidesApprovedAtSameRanch()
        {
            string body = FunctionBody(SqlFile("252_usp_AnswerManagedPayerRequest.sql"));

            body.Should().Contain("admin_prr.rolestatus = 'Approved'");
            body.Should().Contain("admin_r.rolename = 'אדמין חווה'");
            body.Should().Contain("payer_prr.rolestatus = 'Approved'");
            body.Should().Contain("payer_r.rolename = 'משלם'");
            body.Should().Contain("payer_prr.ranchid = admin_prr.ranchid");
        }

        [Fact]
        public void AddManagingAdminForPayerSql_Guard_ChecksBothSidesApprovedAtSameRanch()
        {
            string body = FunctionBody(SqlFile("258_usp_AddManagingAdminForPayer.sql"));

            body.Should().Contain("admin_prr.rolestatus = 'Approved'");
            body.Should().Contain("admin_r.rolename = 'אדמין חווה'");
            body.Should().Contain("payer_prr.rolestatus = 'Approved'");
            body.Should().Contain("payer_r.rolename = 'משלם'");
            body.Should().Contain("payer_prr.ranchid = admin_prr.ranchid");

            // must preserve both pre-existing guards and run before the
            // INSERT that auto-approves the relationship.
            body.Should().Contain("The selected manager is not an approved ranch admin");
            body.Should().Contain("This manager is already linked to this payer");

            int guardAt = body.IndexOf("No shared approved ranch between admin and payer", StringComparison.Ordinal);
            int insertAt = body.IndexOf("INSERT INTO personmanagedbysystemuser", StringComparison.Ordinal);

            guardAt.Should().BeGreaterThan(-1);
            insertAt.Should().BeGreaterThan(-1);
            guardAt.Should().BeLessThan(insertAt);
        }

        [Fact]
        public void RemovalProcs_HaveNoRepoFileChangedByThisBranch()
        {
            // usp_removemanagedpayer / usp_removemanagingadminforpayer are
            // explicitly out of scope (task: "Removal of an existing manager
            // relationship must remain unchanged") and were never committed
            // to the repo before this branch either - confirming neither
            // gained a file here is a cheap guard against scope creep.
            string individualDir = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual"));

            Directory.GetFiles(individualDir, "*RemoveManagedPayer*").Should().BeEmpty();
            Directory.GetFiles(individualDir, "*RemoveManagingAdminForPayer*").Should().BeEmpty();
        }
    }
}
