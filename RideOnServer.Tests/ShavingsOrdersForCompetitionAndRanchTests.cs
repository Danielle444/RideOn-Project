using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // DB-free coverage of the delivery-destination addition (Slice 1) to
    // usp_getshavingsordersforcompetitionandranch (176) - the secretary web shavings list.
    // Same no-connection, source-text-pinning approach as
    // ShavingsOrdersForWorkerByCompetitionTests / WorkerHomeShavingsFeedTests (its siblings for
    // proc 114/190) - see those files for the join-key proof, not repeated here. This proc
    // previously exposed no stall/compound data at all, so there is no prior behavior to
    // preserve for that part of the shape; requesting-ranch scoping and billing columns are
    // the parts that must stay byte-for-byte unchanged.
    public class ShavingsOrdersForCompetitionAndRanchTests
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
                    "176_usp_GetShavingsOrdersForCompetitionAndRanch.sql"));

            File.Exists(path).Should().BeTrue("the 176 stored procedure file was expected at {0}", path);

            return File.ReadAllText(path).Replace("\r\n", "\n");
        }

        // Scoped to the function body (from AS $function$ onward), not the whole file - the
        // header comments deliberately narrate what was REMOVED ("SELECT DISTINCT is no longer
        // needed") and would otherwise trip a naive whole-file NotContain("SELECT DISTINCT") check.
        private static string FunctionBody()
        {
            string sql = SqlSource();
            int at = sql.IndexOf("AS $function$", StringComparison.Ordinal);
            at.Should().BeGreaterThan(-1);
            return sql.Substring(at);
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "ShavingsOrderDAL.cs"));

            File.Exists(path).Should().BeTrue("ShavingsOrderDAL.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        // Bounded by the next public static method - GetShavingsOrdersForCompetitionAndRanch
        // sits immediately before CancelShavingsOrderByPayer in ShavingsOrderDAL.cs.
        private static string GetShavingsOrdersForCompetitionAndRanchBody()
        {
            string dalSource = DalSource();

            string startMarker =
                "public static List<CompetitionShavingsOrderListItem> GetShavingsOrdersForCompetitionAndRanch(";
            int from = dalSource.IndexOf(startMarker, StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1, "{0} was expected in ShavingsOrderDAL", startMarker);

            string rest = dalSource.Substring(from);

            string endMarker = "public static int CancelShavingsOrderByPayer(";
            int to = rest.IndexOf(endMarker, StringComparison.Ordinal);
            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        // =================================================================
        // 1. Signature and return shape.
        // =================================================================

        [Fact]
        public void The_sql_file_exists_and_declares_the_expected_signature()
        {
            SqlSource().Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_getshavingsordersforcompetitionandranch(\n    p_competitionid integer,\n    p_ranchid integer\n)");
        }

        [Fact]
        public void The_return_shape_appends_DeliveryDestinations_and_HasUnassignedStalls_last()
        {
            string sql = SqlSource();

            int hasPendingAt = sql.IndexOf("\"HasPendingCancellation\" boolean,", StringComparison.Ordinal);
            int destinationsAt = sql.IndexOf("\"DeliveryDestinations\" jsonb,", StringComparison.Ordinal);
            int unassignedAt = sql.IndexOf("\"HasUnassignedStalls\" boolean", StringComparison.Ordinal);

            hasPendingAt.Should().BeGreaterThan(-1);
            destinationsAt.Should().BeGreaterThan(-1);
            unassignedAt.Should().BeGreaterThan(-1);
            hasPendingAt.Should().BeLessThan(destinationsAt);
            destinationsAt.Should().BeLessThan(unassignedAt);
        }

        [Fact]
        public void Every_pre_existing_output_column_is_still_present_unchanged()
        {
            string sql = SqlSource();

            sql.Should().Contain("\"ShavingsOrderId\" integer,");
            sql.Should().Contain("\"RequestedDeliveryTime\" timestamp without time zone,");
            sql.Should().Contain("\"BagQuantity\" smallint,");
            sql.Should().Contain("\"DeliveryStatus\" character varying,");
            sql.Should().Contain("\"Notes\" character varying,");
            sql.Should().Contain("\"WorkerSystemUserId\" integer,");
            sql.Should().Contain("\"OrderedByName\" text,");
            sql.Should().Contain("\"PriceCatalogId\" integer,");
            sql.Should().Contain("\"ItemPrice\" numeric,");
            sql.Should().Contain("\"TotalAmount\" numeric,");
            sql.Should().Contain("\"Seen\" timestamp without time zone,");
            sql.Should().Contain("\"Delivered\" timestamp without time zone,");
            sql.Should().Contain("\"PrequestDatetime\" timestamp with time zone,");
            sql.Should().Contain("\"DeliveryPhotoUrl\" text,");
            sql.Should().Contain("\"IsCancelled\" boolean,");
            sql.Should().Contain("\"HasPendingCancellation\" boolean,");
        }

        // =================================================================
        // 2. Requesting-ranch scoping is unchanged in meaning, moved to a
        //    non-multiplying EXISTS.
        // =================================================================

        [Fact]
        public void The_ranch_scoping_still_keys_off_stallbooking_requestingranchid()
        {
            SqlSource().Should().Contain("sb2.requestingranchid = p_ranchid");
        }

        [Fact]
        public void The_ranch_scoping_uses_a_non_multiplying_exists_not_an_inline_join()
        {
            SqlSource().Should().Contain(
                "AND EXISTS (\n          SELECT 1\n          FROM public.shavingsorderforstallbooking sofb2\n          JOIN public.stallbooking sb2 ON sb2.stallbookingid = sofb2.stallbookingid\n          WHERE sofb2.shavingsorderid = so.shavingsorderid\n            AND sb2.requestingranchid = p_ranchid\n      )");
        }

        [Fact]
        public void The_sql_does_not_use_distinct_anywhere_as_a_multiplying_join_workaround()
        {
            string body = FunctionBody();

            body.Should().NotContain("SELECT DISTINCT ");
            body.Should().NotContain("DISTINCT ON");
        }

        [Fact]
        public void No_inline_shavingsorderforstallbooking_or_stallbooking_join_remains_in_the_main_query()
        {
            // Both tables may only appear inside destination_rows and inside the ranch-scoping
            // EXISTS subquery above - never as a direct join on the main FROM clause, which is
            // exactly what used to multiply the base row.
            string sql = SqlSource();

            sql.Should().NotContain("INNER JOIN shavingsorderforstallbooking sosb");
            sql.Should().NotContain("INNER JOIN stallbooking sb ON sb.stallbookingid = sosb.stallbookingid");
        }

        // =================================================================
        // 3. Billing calculations unchanged.
        // =================================================================

        [Fact]
        public void The_billing_subquery_and_projection_are_unchanged()
        {
            string sql = SqlSource();

            sql.Should().Contain(
                "LEFT JOIN (\n        SELECT bpr.prequestid, SUM(bpr.amounttopay) AS totalamount\n        FROM billproductrequest bpr\n        GROUP BY bpr.prequestid\n    ) bpr_total ON bpr_total.prequestid = pr.prequestid");

            sql.Should().Contain("COALESCE(bpr_total.totalamount, 0) AS totalamount,");
            sql.Should().Contain("pc.itemprice,");
        }

        [Fact]
        public void The_lifecycle_columns_are_unchanged()
        {
            string sql = SqlSource();

            sql.Should().Contain("so.responsetime AS \"Seen\",");
            sql.Should().Contain("so.arrivaltime  AS \"Delivered\",");
            sql.Should().Contain("pr.prequestdatetime AS \"PrequestDatetime\",");
        }

        [Fact]
        public void The_ordering_is_unchanged()
        {
            SqlSource().Should().Contain("ORDER BY so.requesteddeliverytime DESC;");
        }

        // =================================================================
        // 4. Delivery destination aggregation.
        // =================================================================

        [Fact]
        public void The_sql_resolves_the_physical_stall_via_stallassignment_ranchid_not_stallbooking()
        {
            SqlSource().Should().Contain(
                "LEFT JOIN public.stall s\n            ON s.ranchid = sa.ranchid\n           AND s.compoundid = sa.compoundid\n           AND s.stallid = sa.stallid");

            FunctionBody().Should().NotContain("s.ranchid = sb.ranchid");
            FunctionBody().Should().NotContain("s.ranchid = sb.requestingranchid");
        }

        [Fact]
        public void The_sql_pre_aggregates_destinations_to_one_row_per_shavingsorderid()
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
        public void The_sql_carries_IsForTack_through_to_IsTackStall_on_the_stall_object()
        {
            SqlSource().Should().Contain("'IsTackStall', isfortack");
        }

        [Fact]
        public void This_proc_has_no_legacy_StallNumber_column_to_preserve()
        {
            // Unlike 114/190, this proc never had a StallNumber column - confirmed nothing
            // added one as part of this slice.
            SqlSource().Should().NotContain("\"StallNumber\"");
        }

        // =================================================================
        // 5. DTO and DAL mapping.
        // =================================================================

        [Fact]
        public void The_dto_exposes_DeliveryDestinations_and_HasUnassignedStalls_with_the_correct_types()
        {
            PropertyInfo? destinations = typeof(CompetitionShavingsOrderListItem).GetProperty("DeliveryDestinations");
            PropertyInfo? unassigned = typeof(CompetitionShavingsOrderListItem).GetProperty("HasUnassignedStalls");

            destinations.Should().NotBeNull();
            destinations!.PropertyType.Should().Be(typeof(List<ShavingsDestinationCompound>));

            unassigned.Should().NotBeNull();
            unassigned!.PropertyType.Should().Be(typeof(bool));
        }

        [Fact]
        public void The_dal_names_the_stored_procedure()
        {
            DalSource().Should().Contain("\"usp_getshavingsordersforcompetitionandranch\"");
        }

        [Fact]
        public void The_dal_maps_DeliveryDestinations_and_HasUnassignedStalls_from_the_reader()
        {
            string body = GetShavingsOrdersForCompetitionAndRanchBody();

            body.Should().Contain("DeliveryDestinations = ParseDeliveryDestinations(reader[\"deliverydestinations\"]),");
            body.Should().Contain("HasUnassignedStalls = Convert.ToBoolean(reader[\"hasunassignedstalls\"])");
        }

        [Fact]
        public void The_dal_still_maps_every_pre_existing_field_by_the_same_lowercase_reader_keys()
        {
            string body = GetShavingsOrdersForCompetitionAndRanchBody();

            body.Should().Contain("reader[\"shavingsorderid\"]");
            body.Should().Contain("reader[\"totalamount\"]");
            body.Should().Contain("reader[\"iscancelled\"]");
            body.Should().Contain("reader[\"haspendingcancellation\"]");
        }

        [Fact]
        public void The_dal_method_declares_competitionId_then_ranchId()
        {
            MethodInfo method = typeof(ShavingsOrderDAL)
                .GetMethod("GetShavingsOrdersForCompetitionAndRanch", BindingFlags.Public | BindingFlags.Static)
                ?? throw new InvalidOperationException(
                    "ShavingsOrderDAL.GetShavingsOrdersForCompetitionAndRanch was not found.");

            ParameterInfo[] parameters = method.GetParameters();

            parameters.Should().HaveCount(2);
            parameters.Select(p => p.Name).Should().Equal("competitionId", "ranchId");
            parameters.Select(p => p.ParameterType).Should().AllBeEquivalentTo(typeof(int));

            method.ReturnType.Should().Be(typeof(List<CompetitionShavingsOrderListItem>));
        }
    }
}
