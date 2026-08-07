using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // DB-free coverage of the RanchWorker shavings cancellation-lifecycle fix for
    // usp_getshavingsordersforworkerbycompetition (114): IsCancelled/HasPendingCancellation
    // added to the return shape, DTO and DAL mapping. Same no-connection, source-text-pinning
    // approach as WorkerHomeShavingsFeedTests (see its own header for the rationale) - proc 114
    // and proc 190 are siblings sharing the exact same lifecycle-derivation technique.
    public class ShavingsOrdersForWorkerByCompetitionTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
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
                    "114_usp_GetShavingsOrdersForWorkerByCompetition.sql"));

            File.Exists(path).Should().BeTrue("the 114 stored procedure file was expected at {0}", path);

            return File.ReadAllText(path).Replace("\r\n", "\n");
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "ShavingsOrderDAL.cs"));

            File.Exists(path).Should().BeTrue("ShavingsOrderDAL.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        // Bounded by the next public static method - GetShavingsOrdersByCompetitionForWorker
        // sits immediately before GetWorkerHomeShavingsFeed in ShavingsOrderDAL.cs.
        private static string GetShavingsOrdersByCompetitionForWorkerBody()
        {
            string dalSource = DalSource();

            string startMarker =
                "public static List<WorkerShavingsOrderItem> GetShavingsOrdersByCompetitionForWorker(";
            int from = dalSource.IndexOf(startMarker, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "{0} was expected in ShavingsOrderDAL", startMarker);

            string rest = dalSource.Substring(from);

            string endMarker =
                "public static List<WorkerShavingsOrderItem> GetWorkerHomeShavingsFeed(";
            int to = rest.IndexOf(endMarker, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_sql_file_exists_and_declares_the_expected_signature()
        {
            SqlSource().Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_getshavingsordersforworkerbycompetition(p_competitionid integer, p_ranchid integer)");
        }

        [Fact]
        public void The_sql_return_shape_appends_IsCancelled_and_HasPendingCancellation_before_the_destination_columns()
        {
            // Trailing ", RequestingRanchName" reflects the 2026-08-07 append (see below) --
            // HasUnassignedStalls is no longer the final column.
            SqlSource().Should().Contain(
                "\"ResponseTime\" timestamp without time zone, \"IsCancelled\" boolean, \"HasPendingCancellation\" boolean, \"DeliveryDestinations\" jsonb, \"HasUnassignedStalls\" boolean, \"RequestingRanchName\" character varying)");
        }

        // =================================================================
        // Delivery destination (Slice 1).
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
            string body = FunctionBody();

            body.Should().Contain("rr.ranchid = dr.requestingranchid");
            body.Should().NotContain("rr.ranchid = c.hostranchid");
        }

        [Fact]
        public void The_sql_carries_requestingranchid_through_the_existing_destination_rows_cte_not_a_second_stallbooking_join()
        {
            string body = FunctionBody();

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
            string body = GetShavingsOrdersByCompetitionForWorkerBody();

            body.Should().Contain(
                "RequestingRanchName = reader[\"RequestingRanchName\"] as string,");
        }

        // Scoped to the function body (from AS $function$ onward), not the whole file - the
        // header comments deliberately narrate what was REMOVED ("DISTINCT ON is no longer
        // needed") and would otherwise trip a naive whole-file NotContain("DISTINCT ON") check.
        private static string FunctionBody()
        {
            string sql = SqlSource();
            int at = sql.IndexOf("AS $function$", StringComparison.Ordinal);
            at.Should().BeGreaterThan(-1);
            return sql.Substring(at);
        }

        [Fact]
        public void The_sql_resolves_the_physical_stall_via_stallassignment_ranchid_not_stallbooking()
        {
            // Proven join key (Blocker 1): stallassignment.ranchid, matching the deployed
            // sibling proc usp_GetAssignedStallPrices (135) - never stallbooking.ranchid or
            // stallbooking.requestingranchid, which are a different ranch concept entirely.
            string sql = SqlSource();

            sql.Should().Contain(
                "LEFT JOIN public.stall s\n            ON s.ranchid = sa.ranchid\n           AND s.compoundid = sa.compoundid\n           AND s.stallid = sa.stallid");

            FunctionBody().Should().NotContain("s.ranchid = sb.ranchid");
            FunctionBody().Should().NotContain("s.ranchid = sb.requestingranchid");
        }

        [Fact]
        public void The_sql_does_not_use_distinct_anywhere_as_a_multiplying_join_workaround()
        {
            string body = FunctionBody();

            body.Should().NotContain("DISTINCT ON");
            body.Should().NotContain("SELECT DISTINCT ");
        }

        [Fact]
        public void The_sql_pre_aggregates_destinations_to_one_row_per_shavingsorderid_before_the_main_query()
        {
            string sql = SqlSource();

            sql.Should().Contain("destination_json AS (");
            sql.Should().Contain("destination_flags AS (");
            sql.Should().Contain("GROUP BY shavingsorderid");
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

            // The legacy single-stall lookup (a second stallbooking/stall join kept only to
            // populate StallNumber) must not exist alongside the new aggregation - it would
            // reintroduce the exact row-multiplication the destination CTEs were built to fix.
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
        public void The_sql_has_no_competition_date_filter_so_historical_visibility_is_unchanged()
        {
            // 114 has never had a date-window predicate (unlike 190) - it powers the
            // competition-scoped screen's full history, including past competitions. This
            // slice must not introduce one as a side effect of the destination rewrite.
            string sql = SqlSource();

            sql.Should().NotContain("v_businessdate");
            sql.Should().NotContain("requesteddeliverytime::date");
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
        public void The_destination_dtos_expose_the_approved_contract_shape()
        {
            PropertyInfo[] compoundProps = typeof(ShavingsDestinationCompound).GetProperties();
            compoundProps.Select(p => p.Name).Should().BeEquivalentTo("CompoundId", "CompoundName", "Stalls");
            typeof(ShavingsDestinationCompound).GetProperty("CompoundId")!.PropertyType.Should().Be(typeof(int));
            typeof(ShavingsDestinationCompound).GetProperty("CompoundName")!.PropertyType.Should().Be(typeof(string));
            typeof(ShavingsDestinationCompound).GetProperty("Stalls")!.PropertyType
                .Should().Be(typeof(List<ShavingsDestinationStall>));

            PropertyInfo[] stallProps = typeof(ShavingsDestinationStall).GetProperties();
            stallProps.Select(p => p.Name).Should().BeEquivalentTo("StallId", "StallNumber", "IsTackStall");
            typeof(ShavingsDestinationStall).GetProperty("StallId")!.PropertyType.Should().Be(typeof(int));
            typeof(ShavingsDestinationStall).GetProperty("StallNumber")!.PropertyType.Should().Be(typeof(string));
            typeof(ShavingsDestinationStall).GetProperty("IsTackStall")!.PropertyType.Should().Be(typeof(bool));
        }

        [Fact]
        public void The_dal_maps_DeliveryDestinations_and_HasUnassignedStalls_from_the_reader()
        {
            string body = GetShavingsOrdersByCompetitionForWorkerBody();

            body.Should().Contain("DeliveryDestinations = ParseDeliveryDestinations(reader[\"DeliveryDestinations\"]),");
            body.Should().Contain("HasUnassignedStalls = Convert.ToBoolean(reader[\"HasUnassignedStalls\"]),");
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
        public void The_sql_does_not_filter_out_cancelled_orders_unlike_190()
        {
            // Deliberate asymmetry: 114 feeds a screen with an existing non-actionable
            // historical grouping, so cancelled orders stay queryable here (locked on the
            // client) rather than being excluded at the SQL layer the way 190 excludes them.
            SqlSource().Should().NotContain("NOT EXISTS");
        }

        [Fact]
        public void The_sql_orders_by_shavingsorderid_with_no_distinct_on_needed_anymore()
        {
            // Superseded by the destination-aggregation rewrite (Slice 1): DISTINCT ON existed
            // solely to dedupe the old per-order join to a single (broken) stall lookup. With
            // that join replaced by destination CTEs pre-aggregated to one row per
            // shavingsorderid, a plain ORDER BY cannot be multiplied by anything left in the
            // main query, so DISTINCT ON is no longer needed - see
            // The_sql_does_not_use_distinct_anywhere_as_a_multiplying_join_workaround.
            SqlSource().Should().Contain("ORDER BY so.shavingsorderid;");
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
        public void The_dal_names_the_stored_procedure()
        {
            DalSource().Should().Contain("\"usp_getshavingsordersforworkerbycompetition\"");
        }

        [Fact]
        public void The_dal_maps_IsCancelled_and_HasPendingCancellation_from_the_reader()
        {
            string body = GetShavingsOrdersByCompetitionForWorkerBody();

            body.Should().Contain("IsCancelled = Convert.ToBoolean(reader[\"IsCancelled\"]),");
            body.Should().Contain(
                "HasPendingCancellation = Convert.ToBoolean(reader[\"HasPendingCancellation\"]),");
        }

        [Fact]
        public void The_dal_method_declares_competitionId_then_ranchId_matching_the_sql_parameter_order()
        {
            MethodInfo method = typeof(ShavingsOrderDAL)
                .GetMethod("GetShavingsOrdersByCompetitionForWorker", BindingFlags.Public | BindingFlags.Static)
                ?? throw new InvalidOperationException(
                    "ShavingsOrderDAL.GetShavingsOrdersByCompetitionForWorker was not found.");

            ParameterInfo[] parameters = method.GetParameters();

            parameters.Should().HaveCount(2);
            parameters.Select(p => p.Name).Should().Equal("competitionId", "ranchId");
            parameters.Select(p => p.ParameterType).Should().AllBeEquivalentTo(typeof(int));

            method.ReturnType.Should().Be(typeof(List<WorkerShavingsOrderItem>));
        }
    }
}
