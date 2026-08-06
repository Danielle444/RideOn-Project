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
        public void The_sql_return_shape_appends_IsCancelled_and_HasPendingCancellation_last()
        {
            SqlSource().Should().Contain(
                "\"ResponseTime\" timestamp without time zone, \"IsCancelled\" boolean, \"HasPendingCancellation\" boolean)");
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
        public void The_sql_still_dedups_by_shavingsorderid_and_keeps_its_original_ordering()
        {
            string sql = SqlSource();

            sql.Should().Contain("SELECT DISTINCT ON (so.shavingsorderid)");
            sql.Should().Contain(
                "ORDER BY so.shavingsorderid, so.requesteddeliverytime DESC NULLS LAST;");
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
