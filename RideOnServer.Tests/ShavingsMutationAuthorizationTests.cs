using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.Controllers;

namespace RideOnServer.Tests
{
    // Worker shavings-mutation authorization fix (P0, 2026-08-06): coverage for
    // claim / save-delivery-photo / mark-delivered on ShavingsOrdersController.
    // Same constraint and technique as StallBookingRanchModelAuthorizationTests /
    // HealthCertificateAuthorizationTests -- no HTTP test host, no mocking
    // framework in this project. The pure decision (ResolveShavingsMutationAuthorization)
    // is reached by reflection since it is a private static helper; everything else
    // (ordering, error-code mapping, "no client-supplied ranch" shape) is pinned
    // against the real Controller/DAL source text.
    //
    // The DB-level guards inside usp_claimshavingsorder / usp_savedeliveryphoto /
    // usp_markdelivered (host-ranch/role, competition-ended, cancellation,
    // ownership, idempotency) cannot be exercised here without a live connection --
    // those are covered separately by rollback-only smoke tests against the live
    // DB (see the session's final report). This file additionally pins the SQL
    // source text for the guards/signatures that matter for defense-in-depth.
    public class ShavingsMutationAuthorizationTests
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
            return ReadRepoFile("RideOnServer", "Controllers", "ShavingsOrdersController.cs");
        }

        private static string DalSource()
        {
            return ReadRepoFile("RideOnServer", "DAL", "ShavingsOrderDAL.cs");
        }

        // =====================================================================
        // Pure decision: ResolveShavingsMutationAuthorization(hostRanchId, isApprovedRanchWorkerAtHostRanch)
        // Private static, reached by reflection. The enum is a private nested
        // type, so results are compared by name (same technique as
        // HealthCertificateAuthorizationTests' ReadScope/UploadBranch).
        // =====================================================================

        private static readonly MethodInfo Resolver =
            typeof(ShavingsOrdersController)
                .GetMethod(
                    "ResolveShavingsMutationAuthorization",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "ShavingsOrdersController.ResolveShavingsMutationAuthorization was not found. " +
                "If it was renamed, update this test - do not widen its visibility.");

        private static string Resolve(int? hostRanchId, bool isApprovedRanchWorkerAtHostRanch)
        {
            return Resolver.Invoke(null, new object?[] { hostRanchId, isApprovedRanchWorkerAtHostRanch })!
                .ToString()!;
        }

        [Fact]
        public void An_approved_ranch_worker_at_the_host_ranch_is_authorized()
        {
            Resolve(hostRanchId: 11, isApprovedRanchWorkerAtHostRanch: true)
                .Should().Be("Authorized");
        }

        [Fact]
        public void A_caller_without_the_role_at_the_host_ranch_is_denied()
        {
            // Covers Payer, RanchAdmin, HostSecretary, and a RanchWorker of an
            // unrelated ranch alike: all resolve to isApprovedRanchWorkerAtHostRanch = false.
            Resolve(hostRanchId: 11, isApprovedRanchWorkerAtHostRanch: false)
                .Should().Be("Denied");
        }

        [Fact]
        public void A_worker_role_held_at_a_different_ranch_than_the_hosting_one_is_denied()
        {
            // hostRanchId=49 (the order's real host) with isApproved computed against
            // ranch 11 (where the caller actually holds the role) arrives here as false --
            // proves the decision is keyed on the SERVER-RESOLVED host ranch, not any ranch
            // the caller happens to hold the role in.
            Resolve(hostRanchId: 49, isApprovedRanchWorkerAtHostRanch: false)
                .Should().Be("Denied");
        }

        [Fact]
        public void A_nonexistent_order_is_let_through_so_the_stored_procedure_reports_not_found()
        {
            // hostRanchId is null when GetShavingsOrderCompetitionContext found no row.
            // The controller deliberately does not turn this into its own 403/404 --
            // usp_claimshavingsorder / usp_savedeliveryphoto / usp_markdelivered's own
            // RN001 "Shavings order not found" guard is the single source of truth.
            Resolve(hostRanchId: null, isApprovedRanchWorkerAtHostRanch: false)
                .Should().Be("Authorized");

            Resolve(hostRanchId: null, isApprovedRanchWorkerAtHostRanch: true)
                .Should().Be("Authorized");
        }

        // =====================================================================
        // Controller wiring: EnsureCallerIsApprovedRanchWorkerForShavingsOrder
        // runs before the mutating call in all three endpoints, and never reads
        // a client-supplied ranch id (these DTOs carry none).
        // =====================================================================

        private static string ClaimOrderBody()
        {
            return ExtractMethodBody(
                ControllerSource(),
                "public IActionResult ClaimOrder(",
                "[HttpPost(\"save-delivery-photo\")]");
        }

        private static string SaveDeliveryPhotoBody()
        {
            return ExtractMethodBody(
                ControllerSource(),
                "public IActionResult SaveDeliveryPhoto(",
                "[HttpPost(\"mark-delivered\")]");
        }

        private static string MarkDeliveredBody()
        {
            return ExtractMethodBody(
                ControllerSource(),
                "public IActionResult MarkDelivered(",
                "[HttpPost]\n        public ActionResult<int> CreateShavingsOrder(".Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void ClaimOrder_AuthorizesBeforeCallingTheDal()
        {
            string body = ClaimOrderBody();

            int authAt = body.IndexOf("EnsureCallerIsApprovedRanchWorkerForShavingsOrder(", StringComparison.Ordinal);
            int callAt = body.IndexOf("ShavingsOrderDAL.ClaimShavingsOrder(", StringComparison.Ordinal);

            authAt.Should().BeGreaterThan(-1);
            callAt.Should().BeGreaterThan(-1);
            authAt.Should().BeLessThan(callAt, "a rejected caller must never reach the claim write");
        }

        [Fact]
        public void SaveDeliveryPhoto_AuthorizesBeforeCallingTheBl()
        {
            string body = SaveDeliveryPhotoBody();

            int authAt = body.IndexOf("EnsureCallerIsApprovedRanchWorkerForShavingsOrder(", StringComparison.Ordinal);
            int callAt = body.IndexOf("ShavingsOrder.SaveDeliveryPhoto(", StringComparison.Ordinal);

            authAt.Should().BeGreaterThan(-1);
            callAt.Should().BeGreaterThan(-1);
            authAt.Should().BeLessThan(callAt, "a rejected caller must never reach the photo write");
        }

        [Fact]
        public void MarkDelivered_AuthorizesBeforeCallingTheBl()
        {
            string body = MarkDeliveredBody();

            int authAt = body.IndexOf("EnsureCallerIsApprovedRanchWorkerForShavingsOrder(", StringComparison.Ordinal);
            int callAt = body.IndexOf("ShavingsOrder.MarkDelivered(", StringComparison.Ordinal);

            authAt.Should().BeGreaterThan(-1);
            callAt.Should().BeGreaterThan(-1);
            authAt.Should().BeLessThan(callAt, "a rejected caller must never reach the delivery write");
        }

        [Fact]
        public void All_three_endpoints_pass_the_authenticated_callers_own_person_id_to_the_authorization_check()
        {
            // The id passed in must come from UserAccessValidator.GetPersonIdFromClaims,
            // never from the request body -- none of the three request DTOs carry an id
            // for "who is acting" at all (see the DTO-shape tests below).
            ClaimOrderBody().Should().Contain(
                "EnsureCallerIsApprovedRanchWorkerForShavingsOrder(workerSystemUserId, request.ShavingsOrderId);");

            SaveDeliveryPhotoBody().Should().Contain(
                "EnsureCallerIsApprovedRanchWorkerForShavingsOrder(currentPersonId, request.ShavingsOrderId);");

            MarkDeliveredBody().Should().Contain(
                "EnsureCallerIsApprovedRanchWorkerForShavingsOrder(workerSystemUserId, request.ShavingsOrderId);");
        }

        [Fact]
        public void EnsureCallerIsApprovedRanchWorkerForShavingsOrder_ResolvesHostRanchServerSideNotFromTheRequest()
        {
            string source = ControllerSource();

            string body = ExtractMethodBody(
                source,
                "private static void EnsureCallerIsApprovedRanchWorkerForShavingsOrder(",
                "private enum ShavingsMutationAuthorization");

            body.Should().Contain("ShavingsOrderDAL.GetShavingsOrderCompetitionContext(shavingsOrderId)");
            body.Should().Contain("UserAccessValidator.HasUserRoleInRanch(personId, context.HostRanchId, RoleNames.RanchWorker)");

            // No client-supplied ranch value of any spelling is ever consulted here.
            body.Should().NotContain("request.RanchId");
            body.Should().NotContain(".RanchId)");
        }

        // =====================================================================
        // Error-code mapping: ValidationException (raised from RN001 inside the
        // stored procedures) must map to 409, not fall through to the generic
        // 500 handler -- this catch block did not exist before the fix.
        // =====================================================================

        [Fact]
        public void All_three_endpoints_map_ValidationException_to_409_and_UnauthorizedAccessException_to_403()
        {
            foreach ((string body, string endpointName) in new[]
                     {
                         (ClaimOrderBody(), "ClaimOrder"),
                         (SaveDeliveryPhotoBody(), "SaveDeliveryPhoto"),
                         (MarkDeliveredBody(), "MarkDelivered")
                     })
            {
                body.Should().Contain("catch (ValidationException ex)", $"{endpointName} must catch ValidationException");
                body.Should().Contain(
                    "StatusCode(StatusCodes.Status409Conflict, ex.Message);",
                    $"{endpointName} must map ValidationException to 409");
                body.Should().Contain(
                    "StatusCode(StatusCodes.Status403Forbidden, ex.Message);",
                    $"{endpointName} must still map UnauthorizedAccessException to 403");
            }
        }

        // =====================================================================
        // Request DTOs carry no ranch/owner id at all -- a client cannot spoof
        // ranch or ownership through request fields even if it tried.
        // =====================================================================

        [Theory]
        [InlineData(typeof(ClaimShavingsOrderRequest))]
        [InlineData(typeof(SaveDeliveryPhotoRequest))]
        [InlineData(typeof(MarkDeliveredRequest))]
        public void The_mutation_request_dtos_carry_no_ranch_or_worker_identity_field(Type dtoType)
        {
            PropertyInfo[] properties = dtoType.GetProperties(BindingFlags.Public | BindingFlags.Instance);

            properties.Select(p => p.Name).Should().NotContain(
                new[] { "RanchId", "WorkerSystemUserId", "PersonId" },
                "{0} must not let a client claim a ranch or identity through the request body", dtoType.Name);
        }

        // =====================================================================
        // DAL wiring: proc names and positional parameter keys, and that
        // SaveDeliveryPhoto now round-trips a result instead of firing-and-forgetting.
        // =====================================================================

        [Fact]
        public void ClaimShavingsOrder_PassesShavingsOrderIdThenWorkerSystemUserIdToTheUnchangedProcName()
        {
            string dal = DalSource();

            dal.Should().Contain("\"usp_claimshavingsorder\"");

            int keyOrderIdAt = dal.IndexOf("{ \"@shavingsOrderId\", shavingsOrderId }", StringComparison.Ordinal);
            int keyWorkerIdAt = dal.IndexOf("{ \"@workerSystemUserId\", workerSystemUserId }", StringComparison.Ordinal);
            int procNameAt = dal.IndexOf("\"usp_claimshavingsorder\"", StringComparison.Ordinal);

            keyOrderIdAt.Should().BeGreaterThan(-1);
            keyWorkerIdAt.Should().BeGreaterThan(-1);
            keyOrderIdAt.Should().BeLessThan(keyWorkerIdAt,
                "dictionary entry order is positional and must match usp_claimshavingsorder(p_shavingsorderid, p_workersystemuserid)");
            keyWorkerIdAt.Should().BeLessThan(procNameAt + 200);
        }

        [Fact]
        public void SaveDeliveryPhoto_TakesAWorkerSystemUserIdAndReturnsBoolViaExecuteScalar()
        {
            string dal = DalSource();

            MethodInfo method = typeof(RideOnServer.DAL.ShavingsOrderDAL)
                .GetMethod("SaveDeliveryPhoto", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException("ShavingsOrderDAL.SaveDeliveryPhoto was not found.");

            method.ReturnType.Should().Be(typeof(bool), "a silent void return let an invalid order look like success before the fix");

            ParameterInfo[] parameters = method.GetParameters();
            parameters.Select(p => p.Name).Should().Contain("workerSystemUserId");

            string body = ExtractMethodBody(
                dal,
                "public bool SaveDeliveryPhoto(",
                "// No-photo delivery fallback");

            body.Should().Contain("{ \"@WorkerSystemUserId\", workerSystemUserId }");
            body.Should().Contain("command.ExecuteScalar()");
            body.Should().NotContain("ExecuteNonQuery()");
        }

        [Fact]
        public void MarkDelivered_PassesShavingsOrderIdThenWorkerSystemUserIdToTheUnchangedProcName()
        {
            string dal = DalSource();

            dal.Should().Contain("\"usp_markdelivered\"");

            string body = ExtractMethodBody(
                dal,
                "public static bool MarkDelivered(",
                "public static List<WorkerShavingsOrderItem> GetShavingsOrdersByCompetitionForWorker(");

            int keyOrderIdAt = body.IndexOf("{ \"@shavingsOrderId\", shavingsOrderId }", StringComparison.Ordinal);
            int keyWorkerIdAt = body.IndexOf("{ \"@workerSystemUserId\", workerSystemUserId }", StringComparison.Ordinal);

            keyOrderIdAt.Should().BeGreaterThan(-1);
            keyWorkerIdAt.Should().BeGreaterThan(-1);
            keyOrderIdAt.Should().BeLessThan(keyWorkerIdAt,
                "dictionary entry order is positional and must match usp_markdelivered(p_shavingsorderid, p_workersystemuserid)");
        }

        [Fact]
        public void GetShavingsOrderCompetitionContext_ReturnsNullWhenTheReaderYieldsNoRow()
        {
            string dal = DalSource();

            dal.Should().Contain("\"usp_getshavingsordercompetitioncontext\"");

            string body = ExtractMethodBody(
                dal,
                "public static ShavingsOrderCompetitionContext? GetShavingsOrderCompetitionContext(",
                "}\n    }\n}".Replace("\n", Environment.NewLine));

            body.Should().Contain("if (!reader.Read())");
            body.Should().Contain("return null;");
        }

        // =====================================================================
        // SQL source: guard presence, ordering, idempotency, and the signature
        // changes that force DROP + CREATE for save-delivery-photo / mark-delivered.
        // =====================================================================

        private static string SqlProcSource(string fileName)
        {
            return ReadRepoFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName);
        }

        [Fact]
        public void ClaimShavingsOrder_Sql_KeepsItsOriginalTwoArgumentSignature()
        {
            string sql = SqlProcSource("115_usp_ClaimShavingsOrder.sql");

            sql.Should().Contain("CREATE OR REPLACE FUNCTION public.usp_claimshavingsorder(p_shavingsorderid integer, p_workersystemuserid integer)");
            sql.Should().NotContain("DROP FUNCTION", "the signature is unchanged, so a plain REPLACE is correct here");
        }

        // Deployment-race audit (2026-08-06): a bundled DROP+CREATE would remove the old
        // signature the instant this migration runs, breaking any still-running OLD server
        // instance mid-Render-rolling-deploy (it only ever sends the old arg count). Revised
        // to an additive-only overload: this file must CREATE the new signature and must NOT
        // drop the old one. PostgreSQL resolves overloads purely by argument count at the call
        // site (DBServices.CreateCommandWithStoredProcedure sends one positional placeholder
        // per dictionary entry, no named-argument syntax -- proven live, see the session's
        // rollback-only verification), so the old signature stays fully callable by an old
        // server instance for as long as it exists. Dropping it is Phase C, a SEPARATE
        // migration run only after every Render instance is confirmed on the new build.
        [Fact]
        public void SaveDeliveryPhoto_Sql_AddsTheNewFourArgSignatureWithoutDroppingTheOldThreeArgOne()
        {
            string sql = SqlProcSource("168_usp_SaveDeliveryPhoto.sql");

            // Checks the executable statement form specifically (not a bare "DROP FUNCTION"
            // substring match, which would also false-positive on this file's own explanatory
            // header comment warning against adding one).
            sql.Should().NotContain("DROP FUNCTION IF EXISTS",
                "Phase A must be additive-only -- dropping the old signature here would break an old server instance mid-rolling-deploy");
            sql.Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_savedeliveryphoto(",
                "the new signature is created as a genuine overload alongside the untouched old one");
            sql.Should().Contain("p_workersystemuserid integer");
            sql.Should().Contain("RETURNS integer");
            sql.Should().Contain("Phase C", "the file must document that dropping the old signature is a separate, later migration");
        }

        [Fact]
        public void MarkDelivered_Sql_AddsTheNewTwoArgSignatureWithoutDroppingTheOldOneArgOne()
        {
            string sql = SqlProcSource("178_usp_MarkDelivered.sql");

            // Checks the executable statement form specifically (not a bare "DROP FUNCTION"
            // substring match, which would also false-positive on this file's own explanatory
            // header comment warning against adding one).
            sql.Should().NotContain("DROP FUNCTION IF EXISTS",
                "Phase A must be additive-only -- dropping the old signature here would break an old server instance mid-rolling-deploy");
            sql.Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_markdelivered(",
                "the new signature is created as a genuine overload alongside the untouched old one");
            sql.Should().Contain("p_workersystemuserid integer");
            sql.Should().Contain("Phase C", "the file must document that dropping the old signature is a separate, later migration");
        }

        // Live-verified 2026-08-06 (rollback-only transaction, see session report): with both
        // signatures created in the same transaction, calling usp_savedeliveryphoto with 3 args
        // and usp_markdelivered with 1 arg resolved to the OLD overloads and executed their old
        // (unauthenticated) behavior unchanged -- proving an old server instance keeps working
        // against a database that already has the new overloads deployed.

        [Theory]
        [InlineData("115_usp_ClaimShavingsOrder.sql")]
        [InlineData("168_usp_SaveDeliveryPhoto.sql")]
        [InlineData("178_usp_MarkDelivered.sql")]
        public void Every_hardened_proc_guards_host_ranch_role_competition_end_and_cancellation_via_RN001(string fileName)
        {
            string sql = SqlProcSource(fileName);

            sql.Should().Contain("'עובד חווה'", "the role guard must check the RanchWorker role specifically");
            sql.Should().Contain("rolestatus = 'Approved'");
            sql.Should().Contain("Asia/Jerusalem", "competition-ended must use the same business-date convention as usp_GetWorkerHomeShavingsFeed");
            sql.Should().Contain("iscancelled = true");

            // Cancellation blocks on BOTH Pending and Approved (confirmed business rule,
            // 2026-08-07) -- Approved-only was the original, INCOMPLETE version of this guard.
            // A bare "status = 'Approved'" must never reappear on its own: pin the widened
            // IN-list form and explicitly forbid the narrower predicate regressing back in.
            sql.Should().Contain("pcr.status IN ('Pending', 'Approved')",
                "a Pending cancellation is already in flight and must block just as hard as an Approved one");
            sql.Should().NotContain("pcr.status = 'Approved'",
                "Approved-only cancellation blocking was the pre-2026-08-07 bug -- only the widened IN-list form may gate cancellation here " +
                "(this check is scoped to pcr.status specifically so it never collides with the unrelated prr.rolestatus = 'Approved' role guard)");

            // Every guard in this fix uses the established RN001 convention (see 241/242) --
            // count is a floor, not an exact pin, so unrelated future guard additions don't break this test.
            int rn001Count = 0;
            int idx = sql.IndexOf("ERRCODE = 'RN001'", StringComparison.Ordinal);
            while (idx > -1)
            {
                rn001Count++;
                idx = sql.IndexOf("ERRCODE = 'RN001'", idx + 1, StringComparison.Ordinal);
            }

            rn001Count.Should().BeGreaterThanOrEqualTo(5);
        }

        [Fact]
        public void ClaimShavingsOrder_Sql_AllowsAnIdempotentRepeatClaimBySameWorkerButBlocksAnotherWorker()
        {
            string sql = SqlProcSource("115_usp_ClaimShavingsOrder.sql");

            sql.Should().Contain("(workersystemuserid IS NULL OR workersystemuserid = p_WorkerSystemUserId)");
            sql.Should().Contain("AND arrivaltime IS NULL");
            sql.Should().Contain("responsetime       = COALESCE(responsetime, now())",
                "a repeat claim by the same worker must not reset the original seen-at clock");
        }

        [Fact]
        public void SaveDeliveryPhoto_Sql_BlocksReplacingAnExistingPhotoAndEnforcesOwnershipUnderRowLock()
        {
            string sql = SqlProcSource("168_usp_SaveDeliveryPhoto.sql");

            sql.Should().Contain("FOR UPDATE");
            sql.Should().Contain("v_current_worker IS DISTINCT FROM p_workersystemuserid");
            sql.Should().Contain("A delivery photo has already been recorded for this order");
            sql.Should().Contain("arrivaltime       = COALESCE(arrivaltime, now())",
                "adding a photo to a no-photo delivered order must not move arrivaltime");
        }

        [Fact]
        public void MarkDelivered_Sql_EnforcesOwnershipUnderRowLockAndKeepsTheOriginalIdempotencyGuard()
        {
            string sql = SqlProcSource("178_usp_MarkDelivered.sql");

            sql.Should().Contain("FOR UPDATE");
            sql.Should().Contain("v_current_worker IS DISTINCT FROM p_workersystemuserid");
            sql.Should().Contain("AND arrivaltime IS NULL");
        }

        [Fact]
        public void GetShavingsOrderCompetitionContext_Sql_ReturnsCompetitionIdAndHostRanchIdOnly()
        {
            string sql = SqlProcSource("243_usp_GetShavingsOrderCompetitionContext.sql");

            sql.Should().Contain(
                "RETURNS TABLE(\"CompetitionId\" integer, \"HostRanchId\" integer)");
            sql.Should().Contain("FROM public.productrequest pr");
            sql.Should().Contain("INNER JOIN public.competition c ON c.competitionid = pr.competitionid");
        }

        // =====================================================================
        // Late-photo business rule (approved 2026-08-06):
        //   - the worker who owns the delivery may add a missing proof photo later;
        //   - an existing proof photo may never be silently replaced;
        //   - the original ArrivalTime must remain unchanged;
        //   - adding the photo must not create a second delivery event.
        // Each clause is pinned individually here against the SQL source, and all
        // four were additionally exercised together against LIVE data in a
        // rollback-only transaction this session (fixture order claimed+delivered
        // without a photo, arrivaltime fixed at T0): SaveDeliveryPhoto returned 1,
        // deliveryphotourl was set, and arrivaltime read back byte-identical to T0
        // both before and after the call -- see the session report's case 12/13.
        // =====================================================================

        [Fact]
        public void LatePhoto_OwnerOfTheDeliveryMayAddAMissingPhoto()
        {
            string sql = SqlProcSource("168_usp_SaveDeliveryPhoto.sql");

            // The ownership guard compares against workersystemuserid, not deliverystatus or
            // arrivaltime -- so a claimed-and-delivered-without-photo order (workersystemuserid
            // still equals the delivering worker) is not excluded by ownership. Only an existing
            // photo (checked separately, next test) blocks the write.
            sql.Should().Contain("v_current_worker IS DISTINCT FROM p_workersystemuserid");
            sql.Should().NotContain("deliverystatus <> 'Delivered'",
                "the guard must not reject an already-delivered order -- that is exactly the no-photo-yet case this rule protects");
        }

        [Fact]
        public void LatePhoto_AnExistingPhotoIsNeverSilentlyReplaced()
        {
            string sql = SqlProcSource("168_usp_SaveDeliveryPhoto.sql");

            int checkAt = sql.IndexOf("v_existing_photourl IS NOT NULL", StringComparison.Ordinal);
            int raiseAt = sql.IndexOf("A delivery photo has already been recorded for this order", StringComparison.Ordinal);
            int updateAt = sql.IndexOf("UPDATE public.shavingsorder", sql.IndexOf("FOR UPDATE", StringComparison.Ordinal), StringComparison.Ordinal);

            checkAt.Should().BeGreaterThan(-1);
            raiseAt.Should().BeGreaterThan(-1);
            updateAt.Should().BeGreaterThan(-1);
            checkAt.Should().BeLessThan(raiseAt);
            raiseAt.Should().BeLessThan(updateAt, "the existing-photo guard must abort before the UPDATE ever runs, not overwrite then detect");
        }

        [Fact]
        public void LatePhoto_TheOriginalArrivalTimeIsNeverMoved()
        {
            string sql = SqlProcSource("168_usp_SaveDeliveryPhoto.sql");

            // COALESCE(arrivaltime, now()) is the whole mechanism: if arrivaltime is already
            // set (the no-photo-delivered case this rule targets), the expression evaluates to
            // the EXISTING value -- now() is never reached. A plain `= now()` here would silently
            // move the delivered-at clock every time a photo is added.
            sql.Should().Contain("arrivaltime       = COALESCE(arrivaltime, now())");
            sql.Should().NotContain("arrivaltime       = now()");
        }

        [Fact]
        public void LatePhoto_AddingTheMissingPhotoDoesNotCreateASecondDeliveryEvent()
        {
            string sql = SqlProcSource("168_usp_SaveDeliveryPhoto.sql");

            // "No second delivery event" means: exactly one UPDATE statement touches the row (no
            // INSERT of a second delivery/event/history row exists anywhere in this proc), and
            // deliverystatus is set to the same idempotent literal 'Delivered' it already carried
            // -- not re-derived, not toggled, not incremented.
            int updateCount = 0;
            int idx = sql.IndexOf("UPDATE public.shavingsorder", StringComparison.Ordinal);
            while (idx > -1)
            {
                updateCount++;
                idx = sql.IndexOf("UPDATE public.shavingsorder", idx + 1, StringComparison.Ordinal);
            }
            updateCount.Should().Be(1, "a late photo add must be exactly one UPDATE on the existing row, not a new row/event");

            sql.Should().NotContain("INSERT INTO");
            sql.Should().Contain("deliverystatus    = 'Delivered'");
        }
    }
}
