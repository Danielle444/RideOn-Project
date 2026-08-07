using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.Controllers;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // DB-free coverage of D4 ("my shavings for today"): GET worker-home-feed,
    // ShavingsOrder.GetWorkerHomeFeed, ShavingsOrderDAL.GetWorkerHomeShavingsFeed,
    // WorkerShavingsOrderItem.CompetitionId, and the new stored procedure file.
    //
    // No connection is opened and nothing is mocked, mirroring
    // HealthCertificateAuthorizationTests / EntryDalInsertEntryCommandTests: the
    // controller and DAL methods need a JWT principal / a live connection to run
    // for real, so authorization, envelope shape, parameter order and stored
    // procedure wiring are pinned against the source text and reflected member
    // signatures instead.
    public class WorkerHomeShavingsFeedTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ControllerSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(),
                    "..",
                    "RideOnServer",
                    "Controllers",
                    "ShavingsOrdersController.cs"));

            File.Exists(path).Should().BeTrue("ShavingsOrdersController.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "ShavingsOrderDAL.cs"));

            File.Exists(path).Should().BeTrue("ShavingsOrderDAL.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string BlSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "BL", "ShavingsOrder.cs"));

            File.Exists(path).Should().BeTrue("ShavingsOrder.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string SqlSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(),
                    "..",
                    "RideOnDB",
                    "StoredProcedures",
                    "PostgreSQL",
                    "Individual",
                    "190_usp_GetWorkerHomeShavingsFeed.sql"));

            File.Exists(path).Should().BeTrue(
                "the D4 stored procedure file was expected at {0}", path);

            return File.ReadAllText(path).Replace("\r\n", "\n");
        }

        // Scoped to the function body (from AS $function$ onward), not the whole file - the
        // header comments deliberately narrate what was REMOVED ("DISTINCT ON is no longer
        // needed") and would otherwise trip a naive whole-file NotContain("DISTINCT ON") check.
        private static string SqlFunctionBody()
        {
            string sql = SqlSource();
            int at = sql.IndexOf("AS $function$", StringComparison.Ordinal);
            at.Should().BeGreaterThan(-1);
            return sql.Substring(at);
        }

        // Bounded by the next action's [HttpGet(...)], since GetWorkerHomeFeed sits
        // immediately before worker-by-competition in the controller.
        private static string ControllerMethodBody(string source, string fromMarker, string toMarker)
        {
            int from = source.IndexOf(fromMarker, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "{0} was expected in ShavingsOrdersController", fromMarker);

            string rest = source.Substring(from);

            int to = rest.IndexOf(toMarker, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1, "the body of {0} could not be bounded", fromMarker);

            return rest.Substring(0, to);
        }

        // Bounded by the DAL method's own "return orders;" - the method has no
        // try/catch (unlike the HorseDAL readers), so this is the first line that
        // is unambiguously past its body.
        private static string DalMethodBody(string dalSource, string methodSignature)
        {
            int from = dalSource.IndexOf(methodSignature, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "{0} was expected in ShavingsOrderDAL", methodSignature);

            string rest = dalSource.Substring(from);

            int to = rest.IndexOf("return orders;", StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        private const string ControllerMethodStart = "public IActionResult GetWorkerHomeFeed(";
        private const string ControllerMethodEnd = "[HttpGet(\"worker-by-competition\")]";
        private const string DalMethodStart =
            "public static List<WorkerShavingsOrderItem> GetWorkerHomeShavingsFeed(";

        private static string GetWorkerHomeFeedBody()
        {
            return ControllerMethodBody(ControllerSource(), ControllerMethodStart, ControllerMethodEnd);
        }

        private static string GetWorkerHomeShavingsFeedBody()
        {
            return DalMethodBody(DalSource(), DalMethodStart);
        }

        // =================================================================
        // 1. Controller route, verb and request shape.
        // =================================================================

        [Fact]
        public void The_endpoint_is_a_get_at_worker_home_feed()
        {
            MethodInfo action = typeof(ShavingsOrdersController)
                .GetMethod("GetWorkerHomeFeed", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException("GetWorkerHomeFeed was not found.");

            HttpGetAttribute? attribute = action
                .GetCustomAttributes<HttpGetAttribute>()
                .FirstOrDefault();

            attribute.Should().NotBeNull("the action must be a GET");
            attribute!.Template.Should().Be("worker-home-feed");
        }

        [Fact]
        public void The_endpoint_accepts_only_ranchId_from_the_caller()
        {
            MethodInfo action = typeof(ShavingsOrdersController)
                .GetMethod("GetWorkerHomeFeed", BindingFlags.Public | BindingFlags.Instance)!;

            ParameterInfo[] parameters = action.GetParameters();

            parameters.Should().HaveCount(1, "a workerSystemUserId parameter here would let the client supply its own identity");
            parameters[0].Name.Should().Be("ranchId");
            parameters[0].ParameterType.Should().Be(typeof(int));
        }

        // =================================================================
        // 2. Worker identity comes from claims, not from the request.
        // =================================================================

        [Fact]
        public void The_worker_id_is_read_from_claims_inside_the_body()
        {
            GetWorkerHomeFeedBody().Should().Contain(
                "int workerSystemUserId = UserAccessValidator.GetPersonIdFromClaims(User);");
        }

        [Fact]
        public void No_workerSystemUserId_value_is_read_from_the_request()
        {
            string body = GetWorkerHomeFeedBody();

            body.Should().NotContain("[FromQuery] int workerSystemUserId");
            body.Should().NotContain("[FromBody]");
            body.Should().NotContain("Request.Query[\"workerSystemUserId\"]");
        }

        // =================================================================
        // 3. RanchWorker authorization, checked before the feed is read.
        // =================================================================

        [Fact]
        public void The_endpoint_checks_ranchworker_authorization_with_the_claims_id_and_the_query_ranchId()
        {
            string body = GetWorkerHomeFeedBody();

            body.Should().Contain(
                "UserAccessValidator.EnsureUserHasRoleInRanch(\n                    workerSystemUserId,\n                    ranchId,\n                    RoleNames.RanchWorker\n                );"
                    .Replace("\n", Environment.NewLine));
        }

        [Fact]
        public void Authorization_runs_before_the_feed_is_fetched()
        {
            string body = GetWorkerHomeFeedBody();

            int authAt = body.IndexOf("EnsureUserHasRoleInRanch(", StringComparison.Ordinal);
            int fetchAt = body.IndexOf("ShavingsOrder.GetWorkerHomeFeed(", StringComparison.Ordinal);

            authAt.Should().BeGreaterThan(-1);
            fetchAt.Should().BeGreaterThan(-1);
            authAt.Should().BeLessThan(fetchAt, "an unauthorized worker must never reach the DAL");
        }

        [Fact]
        public void A_denied_authorization_still_produces_the_safe_403()
        {
            string body = GetWorkerHomeFeedBody();

            body.Should().Contain("catch (UnauthorizedAccessException ex)");
            body.Should().Contain("return StatusCode(StatusCodes.Status403Forbidden, ex.Message);");
        }

        // =================================================================
        // 4. Response envelope.
        // =================================================================

        [Fact]
        public void The_endpoint_returns_the_data_envelope()
        {
            GetWorkerHomeFeedBody().Should().Contain("return Ok(new { data = orders });");
        }

        [Fact]
        public void The_endpoint_does_not_leak_raw_exception_text_on_failure()
        {
            string body = GetWorkerHomeFeedBody();

            body.Should().Contain("return StatusCode(500, \"שגיאה בשליפת הזמנות הנסורת להיום\");");
            body.Should().NotContain("StatusCode(500, ex.Message)");
        }

        // =================================================================
        // 5. DAL: stored procedure name and parameter order.
        // =================================================================

        [Fact]
        public void The_dal_names_the_worker_home_feed_stored_procedure()
        {
            DalSource().Should().Contain("\"usp_getworkerhomeshavingsfeed\"");
        }

        [Fact]
        public void The_dal_method_declares_workerSystemUserId_then_ranchId()
        {
            MethodInfo method = typeof(ShavingsOrderDAL)
                .GetMethod("GetWorkerHomeShavingsFeed", BindingFlags.Public | BindingFlags.Static)
                ?? throw new InvalidOperationException(
                    "ShavingsOrderDAL.GetWorkerHomeShavingsFeed was not found.");

            ParameterInfo[] parameters = method.GetParameters();

            parameters.Should().HaveCount(2);
            parameters.Select(p => p.Name).Should().Equal("workerSystemUserId", "ranchId");
            parameters.Select(p => p.ParameterType).Should().AllBeEquivalentTo(typeof(int));

            method.ReturnType.Should().Be(typeof(List<WorkerShavingsOrderItem>));
        }

        [Fact]
        public void The_parameter_dictionary_binds_workerSystemUserId_before_ranchId()
        {
            // CreateCommandWithStoredProcedure binds strictly by dictionary
            // insertion order into p1, p2, ... - so the entry order here must
            // match usp_getworkerhomeshavingsfeed(p_workersystemuserid, p_ranchid)
            // exactly, the same class of bug EntryDalInsertEntryCommandTests exists
            // to catch on usp_insertentry.
            string body = GetWorkerHomeShavingsFeedBody();

            int workerEntryAt = body.IndexOf("{ \"@workerSystemUserId\", workerSystemUserId }", StringComparison.Ordinal);
            int ranchEntryAt = body.IndexOf("{ \"@ranchId\", ranchId }", StringComparison.Ordinal);

            workerEntryAt.Should().BeGreaterThan(-1);
            ranchEntryAt.Should().BeGreaterThan(-1);
            workerEntryAt.Should().BeLessThan(ranchEntryAt);
        }

        [Fact]
        public void The_dal_method_issues_exactly_one_stored_procedure_call()
        {
            string body = GetWorkerHomeShavingsFeedBody();

            int occurrences = 0;
            int index = body.IndexOf("CreateCommandWithStoredProcedure(", StringComparison.Ordinal);

            while (index > -1)
            {
                occurrences++;
                index = body.IndexOf("CreateCommandWithStoredProcedure(", index + 1, StringComparison.Ordinal);
            }

            occurrences.Should().Be(1, "the feed must be a single round trip, not an N+1");
        }

        // =================================================================
        // 6. CompetitionId mapping, and the ResponseTime decision.
        // =================================================================

        [Fact]
        public void The_dto_exposes_a_nullable_competitionId()
        {
            PropertyInfo? property = typeof(WorkerShavingsOrderItem).GetProperty("CompetitionId");

            property.Should().NotBeNull();
            property!.PropertyType.Should().Be(typeof(int?));
        }

        [Fact]
        public void The_dal_maps_competitionId_from_the_reader()
        {
            GetWorkerHomeShavingsFeedBody().Should().Contain(
                "CompetitionId = reader[\"CompetitionId\"] == DBNull.Value ? null : Convert.ToInt32(reader[\"CompetitionId\"]),");
        }

        // The proc returns ResponseTime (see the RETURNS TABLE shape and the
        // ORDER BY key), exactly like usp_getworkershavingsorders does for the
        // pre-existing GetWorkerShavingsOrders method - and that established
        // sibling also does not surface ResponseTime on WorkerShavingsOrderItem.
        // This is a deliberate, pre-existing convention in this DTO, not a new
        // omission introduced here: there is nothing on the DTO to map the
        // returned column into, so this test pins the omission as consistent
        // with the sibling method rather than leaving it an unverified assumption.
        [Fact]
        public void ResponseTime_is_returned_by_the_proc_but_the_dto_has_no_such_property_so_neither_worker_dal_method_maps_it()
        {
            SqlSource().Should().Contain("\"ResponseTime\" timestamp without time zone");

            typeof(WorkerShavingsOrderItem).GetProperty("ResponseTime").Should().BeNull(
                "WorkerShavingsOrderItem has never exposed ResponseTime - adding it here without the DTO " +
                "having the property would be inventing a field, not mapping one");

            string dal = DalSource();

            dal.Should().NotContain("reader[\"ResponseTime\"]");
        }

        // =================================================================
        // 7. BL forwards straight to the DAL with the same argument order.
        // =================================================================

        [Fact]
        public void The_bl_method_declares_workerSystemUserId_then_ranchId_and_forwards_to_the_dal()
        {
            MethodInfo method = typeof(ShavingsOrder)
                .GetMethod("GetWorkerHomeFeed", BindingFlags.Public | BindingFlags.Static)
                ?? throw new InvalidOperationException("ShavingsOrder.GetWorkerHomeFeed was not found.");

            ParameterInfo[] parameters = method.GetParameters();

            parameters.Should().HaveCount(2);
            parameters.Select(p => p.Name).Should().Equal("workerSystemUserId", "ranchId");

            BlSource().Should().Contain(
                "return ShavingsOrderDAL.GetWorkerHomeShavingsFeed(workerSystemUserId, ranchId);");
        }

        // =================================================================
        // 8. The stored procedure file: signature, timezone fix, and filters.
        // =================================================================

        [Fact]
        public void The_sql_file_exists_and_declares_the_expected_signature()
        {
            SqlSource().Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_getworkerhomeshavingsfeed(p_workersystemuserid integer, p_ranchid integer)");
        }

        [Fact]
        public void The_sql_computes_one_israel_business_date_and_never_uses_raw_current_date()
        {
            string sql = SqlSource();

            sql.Should().Contain(
                "v_businessdate := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date;");

            // Every occurrence of CURRENT_DATE would resolve in the session/UTC
            // timezone, not Israel's - which is exactly the bug this fix closes.
            sql.ToUpperInvariant().Should().NotContain("CURRENT_DATE");
        }

        [Fact]
        public void The_sql_uses_the_business_date_for_delivery_and_the_competition_end_bound()
        {
            string sql = SqlSource();

            sql.Should().Contain("so.requesteddeliverytime::date <= v_businessdate");
            sql.Should().Contain("c.competitionenddate >= v_businessdate");
        }

        // =================================================================
        // Overdue widening (Slice 1, approved business change - kept as its own
        // test, separate from the destination-aggregation coverage below).
        // =================================================================

        [Fact]
        public void The_sql_includes_overdue_undelivered_orders_not_just_todays_exact_date()
        {
            string sql = SqlSource();

            sql.Should().Contain("so.requesteddeliverytime::date <= v_businessdate",
                "the feed must now include today AND any earlier undelivered date");

            sql.Should().NotContain("so.requesteddeliverytime::date = v_businessdate",
                "the old exact-equality predicate must be fully replaced, not left alongside the new one");
        }

        [Fact]
        public void Every_other_predicate_on_the_feed_is_unchanged_by_the_overdue_widening()
        {
            // The date comparison operator is the ONLY predicate this slice touches - every
            // other filter (ownership/claim, competition end date, competition status,
            // delivered exclusion, approved-cancellation exclusion) must be byte-for-byte the
            // same text as before.
            string sql = SqlSource();

            sql.Should().Contain("(so.workersystemuserid = p_WorkerSystemUserId OR so.workersystemuserid IS NULL)");
            sql.Should().Contain("c.competitionenddate >= v_businessdate");
            sql.Should().Contain("(c.competitionstatus IS NULL OR c.competitionstatus NOT IN ('טיוטה','בוטלה'))");
            sql.Should().Contain("so.arrivaltime IS NULL");
            sql.Should().Contain("COALESCE(so.deliverystatus, 'Pending') <> 'Delivered'");
        }

        // Shavings/stall prep legitimately happens before a competition's
        // official start date (live evidence: shavingsorderid 519, 65 live
        // orders with requesteddeliverytime before competitionstartdate) - an
        // order due today must not be hidden just because "today" is still
        // before the competition's own start date. Only the upper bound
        // (competitionenddate) still gates the feed, so an order stops
        // appearing once its competition has actually ended.
        [Fact]
        public void The_sql_no_longer_gates_on_the_competition_start_date()
        {
            SqlSource().Should().NotContain("c.competitionstartdate <= v_businessdate");
        }

        [Theory]
        [InlineData("c.hostranchid = p_RanchId")]
        [InlineData("(so.workersystemuserid = p_WorkerSystemUserId OR so.workersystemuserid IS NULL)")]
        [InlineData("so.requesteddeliverytime::date <= v_businessdate")]
        [InlineData("c.competitionenddate >= v_businessdate")]
        [InlineData("(c.competitionstatus IS NULL OR c.competitionstatus NOT IN ('טיוטה','בוטלה'))")]
        [InlineData("so.arrivaltime IS NULL")]
        [InlineData("COALESCE(so.deliverystatus, 'Pending') <> 'Delivered'")]
        public void The_sql_contains_every_required_filter_predicate(string predicate)
        {
            SqlSource().Should().Contain(predicate);
        }

        [Fact]
        public void The_sql_never_admits_an_order_claimed_by_a_different_worker()
        {
            // The only worker-scoping predicate is the mine-or-unclaimed OR; there
            // is no separate branch that would let a foreign claim through.
            string sql = SqlSource();

            sql.Should().Contain(
                "(so.workersystemuserid = p_WorkerSystemUserId OR so.workersystemuserid IS NULL)");

            int occurrences = 0;
            int index = sql.IndexOf("workersystemuserid", StringComparison.OrdinalIgnoreCase);

            while (index > -1)
            {
                occurrences++;
                index = sql.IndexOf("workersystemuserid", index + 1, StringComparison.OrdinalIgnoreCase);
            }

            // so.workersystemuserid: SELECT projection, the WHERE predicate (twice),
            // and worker.personid join has its own column name - the projection and
            // WHERE clause account for 3 occurrences of so.workersystemuserid.
            occurrences.Should().BeGreaterThanOrEqualTo(3);
        }

        [Fact]
        public void The_sql_excludes_delivered_orders()
        {
            string sql = SqlSource();

            sql.Should().Contain("so.arrivaltime IS NULL");
            sql.Should().Contain("COALESCE(so.deliverystatus, 'Pending') <> 'Delivered'");
        }

        [Fact]
        public void The_return_shape_includes_competitionId_and_competitionName()
        {
            SqlSource().Should().Contain("\"CompetitionId\" integer, \"CompetitionName\" character varying");
        }

        [Fact]
        public void The_final_ordering_is_by_shavingsorderid_with_no_distinct_on_needed_anymore()
        {
            // Superseded by the destination-aggregation rewrite (Slice 1): DISTINCT ON existed
            // solely to dedupe the old per-order join to a single (broken) stall lookup - see
            // the destination-aggregation section below. The client still re-sorts for
            // "mine first"; this proc no longer needs DISTINCT ON to produce one row per order.
            SqlSource().Should().Contain("ORDER BY so.shavingsorderid;");
            SqlSource().Should().NotContain("DISTINCT ON");
        }

        // =================================================================
        // 9. RanchWorker shavings cancellation lifecycle (own productchangerequest).
        // =================================================================

        [Fact]
        public void The_sql_return_shape_appends_IsCancelled_and_HasPendingCancellation_before_the_destination_columns()
        {
            // Trailing ", RequestingRanchName" reflects the 2026-08-07 append (see below) --
            // HasUnassignedStalls is no longer the final column.
            SqlSource().Should().Contain(
                "\"ResponseTime\" timestamp without time zone, \"IsCancelled\" boolean, \"HasPendingCancellation\" boolean, \"DeliveryDestinations\" jsonb, \"HasUnassignedStalls\" boolean, \"RequestingRanchName\" character varying)");
        }

        [Fact]
        public void The_sql_derives_IsCancelled_from_an_approved_cancellation_request_on_the_orders_own_id()
        {
            string sql = SqlSource();

            sql.Should().Contain(
                "EXISTS (\n            SELECT 1 FROM public.productchangerequest pcr\n" +
                "            WHERE pcr.originalprequestid = so.shavingsorderid\n" +
                "              AND pcr.iscancelled = true\n" +
                "              AND pcr.status = 'Approved'\n" +
                "        ) AS \"IsCancelled\",");
        }

        [Fact]
        public void The_sql_derives_HasPendingCancellation_from_a_pending_cancellation_request_on_the_orders_own_id()
        {
            string sql = SqlSource();

            sql.Should().Contain(
                "EXISTS (\n            SELECT 1 FROM public.productchangerequest pcr\n" +
                "            WHERE pcr.originalprequestid = so.shavingsorderid\n" +
                "              AND pcr.iscancelled = true\n" +
                "              AND pcr.status = 'Pending'\n" +
                "        ) AS \"HasPendingCancellation\"");
        }

        [Fact]
        public void The_sql_excludes_a_terminal_cancelled_order_from_the_home_feed_entirely()
        {
            string sql = SqlSource();

            // The home feed has no historical/non-actionable area (unlike the
            // competition-scoped list, 114), so a terminal-cancelled order is excluded
            // the same way an already-delivered one already is above it.
            sql.Should().Contain(
                "AND NOT EXISTS (\n          SELECT 1 FROM public.productchangerequest pcr\n" +
                "          WHERE pcr.originalprequestid = so.shavingsorderid\n" +
                "            AND pcr.iscancelled = true\n" +
                "            AND pcr.status = 'Approved'\n" +
                "      )");
        }

        [Fact]
        public void The_sql_does_not_exclude_a_pending_cancellation_from_the_home_feed()
        {
            // Only one terminal-exclusion EXISTS clause should exist (status = 'Approved'),
            // never a second one gated on status = 'Pending' - a pending cancellation must
            // stay visible per business rule 1, locked on the client instead.
            string sql = SqlSource();

            int approvedExclusionCount = 0;
            int index = sql.IndexOf("AND NOT EXISTS (", StringComparison.Ordinal);
            while (index > -1)
            {
                approvedExclusionCount++;
                index = sql.IndexOf("AND NOT EXISTS (", index + 1, StringComparison.Ordinal);
            }

            approvedExclusionCount.Should().Be(1);
        }

        [Fact]
        public void A_rejected_cancellation_request_is_neither_a_status_the_sql_special_cases_nor_an_exclusion_reason()
        {
            // IsCancelled/HasPendingCancellation/the terminal exclusion only ever
            // branch on 'Approved' or 'Pending' (pinned above) - a 'Rejected'
            // productchangerequest row therefore matches none of the three EXISTS/
            // NOT EXISTS clauses, so a rejected-cancellation order falls through to
            // the same predicates as an order with no cancellation request at all:
            // included, IsCancelled=false, HasPendingCancellation=false. Pinning the
            // literal's absence here means introducing a 'Rejected' special case
            // later would be a deliberate, reviewed change, not a silent drift.
            SqlSource().Should().NotContain("'Rejected'");
        }

        [Fact]
        public void The_dto_exposes_IsCancelled_and_HasPendingCancellation_as_non_nullable_bools()
        {
            PropertyInfo? isCancelled = typeof(WorkerShavingsOrderItem).GetProperty("IsCancelled");
            PropertyInfo? hasPendingCancellation =
                typeof(WorkerShavingsOrderItem).GetProperty("HasPendingCancellation");

            isCancelled.Should().NotBeNull();
            isCancelled!.PropertyType.Should().Be(typeof(bool));

            hasPendingCancellation.Should().NotBeNull();
            hasPendingCancellation!.PropertyType.Should().Be(typeof(bool));
        }

        [Fact]
        public void The_dal_maps_IsCancelled_and_HasPendingCancellation_from_the_reader()
        {
            string body = GetWorkerHomeShavingsFeedBody();

            body.Should().Contain("IsCancelled = Convert.ToBoolean(reader[\"IsCancelled\"]),");
            body.Should().Contain(
                "HasPendingCancellation = Convert.ToBoolean(reader[\"HasPendingCancellation\"]),");
        }

        // =================================================================
        // 10. Delivery destination (Slice 1) - same design as proc 114, see that
        //     test file's own header for the join-key proof; only the parts
        //     specific to this proc's own query shape are re-pinned here.
        // =================================================================

        [Fact]
        public void The_sql_return_shape_appends_DeliveryDestinations_and_HasUnassignedStalls_in_order()
        {
            string sql = SqlSource();

            int destinationsAt = sql.IndexOf("\"DeliveryDestinations\" jsonb", StringComparison.Ordinal);
            int unassignedAt = sql.IndexOf("\"HasUnassignedStalls\" boolean,", StringComparison.Ordinal);

            destinationsAt.Should().BeGreaterThan(-1);
            unassignedAt.Should().BeGreaterThan(-1);
            destinationsAt.Should().BeLessThan(unassignedAt);
        }

        // =================================================================
        // Requesting ranch name (2026-08-07).
        // =================================================================

        [Fact]
        public void The_sql_return_shape_appends_RequestingRanchName_last()
        {
            string sql = SqlSource();

            int unassignedAt = sql.IndexOf("\"HasUnassignedStalls\" boolean,", StringComparison.Ordinal);
            int requestingRanchAt = sql.IndexOf("\"RequestingRanchName\" character varying)", StringComparison.Ordinal);

            unassignedAt.Should().BeGreaterThan(-1);
            requestingRanchAt.Should().BeGreaterThan(-1);
            unassignedAt.Should().BeLessThan(requestingRanchAt);
        }

        [Fact]
        public void The_sql_resolves_RequestingRanchName_from_requestingranchid_not_hostranchid()
        {
            string body = SqlFunctionBody();

            body.Should().Contain("rr.ranchid = dr.requestingranchid");
            body.Should().NotContain("rr.ranchid = c.hostranchid");
        }

        [Fact]
        public void The_sql_carries_requestingranchid_through_the_existing_destination_rows_cte_not_a_second_stallbooking_join()
        {
            string body = SqlFunctionBody();

            body.Should().Contain("sb.requestingranchid");
            body.Should().Contain("FROM destination_rows dr");

            int stallBookingJoins = 0;
            int index = body.IndexOf("JOIN public.stallbooking", StringComparison.Ordinal);
            while (index > -1)
            {
                stallBookingJoins++;
                index = body.IndexOf("JOIN public.stallbooking", index + 1, StringComparison.Ordinal);
            }

            stallBookingJoins.Should().Be(1, "requestingranchid must be carried through destination_rows, not a second join");
        }

        [Fact]
        public void The_dto_exposes_RequestingRanchName_as_a_string_distinct_from_RanchName()
        {
            PropertyInfo? requestingRanchName = typeof(WorkerShavingsOrderItem).GetProperty("RequestingRanchName");
            PropertyInfo? ranchName = typeof(WorkerShavingsOrderItem).GetProperty("RanchName");

            requestingRanchName.Should().NotBeNull();
            requestingRanchName!.PropertyType.Should().Be(typeof(string));

            ranchName.Should().NotBeNull("RanchName must remain a separate field -- its one populated source means the HOST ranch");
        }

        [Fact]
        public void The_dal_maps_RequestingRanchName_from_the_reader()
        {
            string body = GetWorkerHomeShavingsFeedBody();

            body.Should().Contain(
                "RequestingRanchName = reader[\"RequestingRanchName\"] as string,");
        }

        [Fact]
        public void The_sql_resolves_the_physical_stall_via_stallassignment_ranchid_not_stallbooking()
        {
            string sql = SqlSource();

            sql.Should().Contain(
                "LEFT JOIN public.stall s\n            ON s.ranchid = sa.ranchid\n           AND s.compoundid = sa.compoundid\n           AND s.stallid = sa.stallid");

            SqlFunctionBody().Should().NotContain("s.ranchid = sb.ranchid");
            SqlFunctionBody().Should().NotContain("s.ranchid = sb.requestingranchid");
        }

        [Fact]
        public void The_sql_does_not_use_distinct_anywhere_as_a_multiplying_join_workaround()
        {
            string body = SqlFunctionBody();

            body.Should().NotContain("DISTINCT ON");
            body.Should().NotContain("SELECT DISTINCT ");
        }

        [Fact]
        public void The_sql_pre_aggregates_destinations_to_one_row_per_shavingsorderid_before_the_main_query()
        {
            string sql = SqlSource();

            sql.Should().Contain("destination_json AS (");
            sql.Should().Contain("destination_flags AS (");
        }

        [Fact]
        public void The_sql_coalesces_destinations_to_an_empty_array_and_the_flag_to_false()
        {
            string sql = SqlSource();

            sql.Should().Contain("COALESCE(dj.deliverydestinations, '[]'::jsonb) AS \"DeliveryDestinations\"");
            sql.Should().Contain("COALESCE(df.hasunassignedstalls, false) AS \"HasUnassignedStalls\"");
        }

        [Fact]
        public void The_sql_keeps_StallNumber_as_a_typed_null_literal_with_no_backing_join()
        {
            string sql = SqlSource();

            sql.Should().Contain("NULL::character varying AS \"StallNumber\"");

            int stallBookingJoins = 0;
            int index = sql.IndexOf("JOIN public.stallbooking", StringComparison.Ordinal);
            while (index > -1)
            {
                stallBookingJoins++;
                index = sql.IndexOf("JOIN public.stallbooking", index + 1, StringComparison.Ordinal);
            }

            stallBookingJoins.Should().Be(1, "the only stallbooking join must be the one inside destination_rows");
        }

        [Fact]
        public void The_sql_carries_IsForTack_through_to_IsTackStall_on_the_stall_object()
        {
            SqlSource().Should().Contain("'IsTackStall', isfortack");
        }

        [Fact]
        public void The_dto_exposes_DeliveryDestinations_and_HasUnassignedStalls_with_the_correct_types()
        {
            PropertyInfo? destinations = typeof(WorkerShavingsOrderItem).GetProperty("DeliveryDestinations");
            PropertyInfo? unassigned = typeof(WorkerShavingsOrderItem).GetProperty("HasUnassignedStalls");

            destinations.Should().NotBeNull();
            destinations!.PropertyType.Should().Be(typeof(List<ShavingsDestinationCompound>));

            unassigned.Should().NotBeNull();
            unassigned!.PropertyType.Should().Be(typeof(bool));
        }

        [Fact]
        public void The_dal_maps_DeliveryDestinations_and_HasUnassignedStalls_from_the_reader()
        {
            string body = GetWorkerHomeShavingsFeedBody();

            body.Should().Contain("DeliveryDestinations = ParseDeliveryDestinations(reader[\"DeliveryDestinations\"]),");
            body.Should().Contain("HasUnassignedStalls = Convert.ToBoolean(reader[\"HasUnassignedStalls\"]),");
        }
    }
}
