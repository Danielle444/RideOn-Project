using FluentAssertions;
using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.StallBookings;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // DB-free coverage of the ranch-model fix's DAL command-building changes
    // (Phase 2, 2026-08-05). No connection is opened: the Build...Command
    // methods only assemble command text and parameters (an NpgsqlCommand can
    // be constructed and inspected with a null connection), so a null
    // connection is enough to assert the whole mapping. Modeled directly on
    // ChangeEntryRequestDalCommandTests.cs.
    public class StallBookingRanchModelDalCommandTests
    {
        private const int CompetitionIdSentinel = 78;
        private const int OrderedBySystemUserIdSentinel = 622;
        private const int PriceCatalogIdSentinel = 7;
        private const int HostRanchIdSentinel = 11;
        private const int HorseIdSentinel = 249;
        private const int RequestingRanchIdSentinel = 2;

        private static object? ValueOf(NpgsqlCommand command, string parameterName)
        {
            command.Parameters.Contains(parameterName)
                .Should()
                .BeTrue($"the command must bind {parameterName}");

            return command.Parameters[parameterName].Value;
        }

        // =====================================================================
        // BuildCreateStallBookingCommand -> usp_createstallbooking (188)
        // Item 1 (guest-ranch horse): DAL receives whatever the Controller
        // already put into request.RanchId -- these tests pin that the DAL
        // layer itself never re-derives or second-guesses it, and never binds
        // a p_requestingranchid value (the SP derives that itself from HorseId
        // for the non-tack path this method serves).
        // Item 6 (server-derived, not client-supplied): proven at the
        // Controller layer (see StallBookingRanchModelAuthorizationTests) --
        // this test proves the DAL simply trusts whatever request.RanchId
        // holds at call time, which is exactly why the Controller must be the
        // one to overwrite it before calling this.
        // =====================================================================

        private static CreateStallBookingRequest BuildStallBookingRequest(int ranchId)
        {
            return new CreateStallBookingRequest
            {
                CompetitionId = CompetitionIdSentinel,
                OrderedBySystemUserId = OrderedBySystemUserIdSentinel,
                PriceCatalogId = PriceCatalogIdSentinel,
                Notes = "test",
                RanchId = ranchId,
                HorseId = HorseIdSentinel,
                startDate = new DateTime(2026, 9, 15),
                endDate = new DateTime(2026, 9, 18),
                IsForTack = false,
                Payers = new List<CreateStallBookingPayerItem>
                {
                    new CreateStallBookingPayerItem { PayerPersonId = 1630 }
                }
            };
        }

        [Fact]
        public void BuildCreateStallBookingCommand_BindsRanchIdExactlyAsSuppliedOnTheRequest()
        {
            // Simulates the post-fix Controller state: request.RanchId already
            // holds the competition's HostRanchId (11), not the horse's own
            // ranch (2) -- the DAL must forward it unchanged, not re-derive it.
            CreateStallBookingRequest request = BuildStallBookingRequest(HostRanchIdSentinel);

            using NpgsqlCommand command = StallBookingDAL.BuildCreateStallBookingCommand(request, null);

            ValueOf(command, "@ranchId").Should().Be(HostRanchIdSentinel);
            ValueOf(command, "@horseId").Should().Be(HorseIdSentinel);
        }

        [Fact]
        public void BuildCreateStallBookingCommand_NeverBindsARequestingRanchIdParameter()
        {
            CreateStallBookingRequest request = BuildStallBookingRequest(HostRanchIdSentinel);

            using NpgsqlCommand command = StallBookingDAL.BuildCreateStallBookingCommand(request, null);

            // The 11th SP parameter, p_requestingranchid, is DEFAULT NULL and
            // deliberately left unsupplied here for the non-tack path -- the
            // SP derives it itself from horse.ranchid.
            command.Parameters.Contains("@requestingRanchId").Should().BeFalse(
                "the non-tack create path must let the SP derive RequestingRanchId from the horse, not pass a value");
            command.CommandText.Should().NotContain("requestingRanchId");
        }

        [Fact]
        public void BuildCreateStallBookingCommand_CallsTheTenArgumentFunctionSignature()
        {
            CreateStallBookingRequest request = BuildStallBookingRequest(HostRanchIdSentinel);

            using NpgsqlCommand command = StallBookingDAL.BuildCreateStallBookingCommand(request, null);

            command.CommandText.Should().Contain("usp_createstallbooking(");
            command.Parameters.Count.Should().Be(10);
        }

        // =====================================================================
        // BuildCreateTackStallBookingsCommand -> usp_createtackstallbookings (225)
        // Item 3 (tack): DAL receives both HostRanchId (as @ranchId) and
        // RequestingRanchId (as the new 10th parameter).
        // =====================================================================

        private static CreateTackStallBookingsRequest BuildTackRequest(int ranchId, int requestingRanchId)
        {
            return new CreateTackStallBookingsRequest
            {
                CompetitionId = CompetitionIdSentinel,
                OrderedBySystemUserId = OrderedBySystemUserIdSentinel,
                PriceCatalogId = PriceCatalogIdSentinel,
                Notes = "test",
                RanchId = ranchId,
                RequestingRanchId = requestingRanchId,
                StartDate = new DateTime(2026, 9, 15),
                EndDate = new DateTime(2026, 9, 18),
                Quantity = 1,
                Payers = new List<CreateStallBookingPayerItem>
                {
                    new CreateStallBookingPayerItem { PayerPersonId = 374 }
                }
            };
        }

        [Fact]
        public void BuildCreateTackStallBookingsCommand_BindsHostRanchIdAndRequestingRanchIdSeparately()
        {
            CreateTackStallBookingsRequest request = BuildTackRequest(
                ranchId: HostRanchIdSentinel,
                requestingRanchId: RequestingRanchIdSentinel);

            using NpgsqlCommand command = StallBookingDAL.BuildCreateTackStallBookingsCommand(request, null);

            ValueOf(command, "@ranchId").Should().Be(HostRanchIdSentinel);
            ValueOf(command, "@requestingRanchId").Should().Be(RequestingRanchIdSentinel);

            // The two values must be genuinely independent -- pin that they
            // are not accidentally the same sentinel by construction.
            HostRanchIdSentinel.Should().NotBe(RequestingRanchIdSentinel);
        }

        [Fact]
        public void BuildCreateTackStallBookingsCommand_CallsTheTenArgumentFunctionSignature()
        {
            CreateTackStallBookingsRequest request = BuildTackRequest(HostRanchIdSentinel, RequestingRanchIdSentinel);

            using NpgsqlCommand command = StallBookingDAL.BuildCreateTackStallBookingsCommand(request, null);

            command.CommandText.Should().Contain("usp_createtackstallbookings(");
            command.Parameters.Count.Should().Be(10);

            // requestingRanchId must be the LAST positional argument (10th),
            // appearing after payers in the SQL text -- matches the corrected
            // usp_createtackstallbookings(..., p_payers, p_requestingranchid).
            int payersAt = command.CommandText.IndexOf("@payers", StringComparison.Ordinal);
            int requestingRanchAt = command.CommandText.IndexOf("@requestingRanchId", StringComparison.Ordinal);

            payersAt.Should().BeGreaterThan(-1);
            requestingRanchAt.Should().BeGreaterThan(-1);
            requestingRanchAt.Should().BeGreaterThan(payersAt);
        }

        // =====================================================================
        // BuildGetRequestingRanchIdsForStallBookingsCommand ->
        // usp_getrequestingranchidsforstallbookings (233)
        // Item 5 (shavings): the lookup the Controller uses to derive/authorize
        // before ever reaching ShavingsOrderDAL.CreateShavingsOrder.
        // =====================================================================

        [Fact]
        public void BuildGetRequestingRanchIdsForStallBookingsCommand_BindsTheIdListAsAnIntegerArray()
        {
            List<int> stallBookingIds = new List<int> { 501, 502, 503 };

            using NpgsqlCommand command = StallBookingDAL.BuildGetRequestingRanchIdsForStallBookingsCommand(
                stallBookingIds, null);

            command.CommandText.Should().Contain("usp_getrequestingranchidsforstallbookings");

            command.Parameters.Contains("@stallBookingIds").Should().BeTrue();
            command.Parameters["@stallBookingIds"].NpgsqlDbType
                .Should().Be(NpgsqlDbType.Array | NpgsqlDbType.Integer);

            object? value = ValueOf(command, "@stallBookingIds");
            value.Should().BeAssignableTo<int[]>();
            ((int[])value!).Should().BeEquivalentTo(stallBookingIds);
        }

        // =====================================================================
        // BuildSecretaryCreateStallBookingForPayerCommand ->
        // usp_secretarycreatestallbookingforpayer (149)
        // Item 9 (secretary path): p_requestingranchid is bound (DBNull for
        // non-tack, the real value for tack) alongside the unchanged
        // host-ranch-derived call shape.
        // =====================================================================

        [Fact]
        public void BuildSecretaryCreateStallBookingForPayerCommand_BindsRequestingRanchIdAsDbNullForNonTack()
        {
            using NpgsqlCommand command = StallBookingDAL.BuildSecretaryCreateStallBookingForPayerCommand(
                CompetitionIdSentinel, OrderedBySystemUserIdSentinel, payerPersonId: 1630,
                horseId: HorseIdSentinel, startDate: new DateTime(2026, 9, 15), endDate: new DateTime(2026, 9, 18),
                isForTack: false, productId: 3, notes: "test", requestingRanchId: null, connection: null);

            command.CommandText.Should().Contain("p_requestingranchid");
            ValueOf(command, "@requestingRanchId").Should().Be(DBNull.Value);
            ValueOf(command, "@horseId").Should().Be(HorseIdSentinel);
        }

        [Fact]
        public void BuildSecretaryCreateStallBookingForPayerCommand_BindsRequestingRanchIdForTack()
        {
            using NpgsqlCommand command = StallBookingDAL.BuildSecretaryCreateStallBookingForPayerCommand(
                CompetitionIdSentinel, OrderedBySystemUserIdSentinel, payerPersonId: 1630,
                horseId: null, startDate: new DateTime(2026, 9, 15), endDate: new DateTime(2026, 9, 18),
                isForTack: true, productId: 3, notes: "test", requestingRanchId: RequestingRanchIdSentinel, connection: null);

            ValueOf(command, "@requestingRanchId").Should().Be(RequestingRanchIdSentinel);
            ValueOf(command, "@horseId").Should().Be(DBNull.Value);
        }

        [Fact]
        public void BuildSecretaryCreateStallBookingForPayerCommand_MapsEachArgumentByNameExactlyOnce()
        {
            using NpgsqlCommand command = StallBookingDAL.BuildSecretaryCreateStallBookingForPayerCommand(
                CompetitionIdSentinel, OrderedBySystemUserIdSentinel, payerPersonId: 1630,
                horseId: HorseIdSentinel, startDate: new DateTime(2026, 9, 15), endDate: new DateTime(2026, 9, 18),
                isForTack: false, productId: 3, notes: "test", requestingRanchId: null, connection: null);

            string[] expectedPgArgs =
            {
                "p_competitionid", "p_secretarysystemuserid", "p_payerpersonid", "p_horseid",
                "p_startdate", "p_enddate", "p_isfortack", "p_productid", "p_notes", "p_requestingranchid"
            };

            foreach (string pgArg in expectedPgArgs)
            {
                int count = System.Text.RegularExpressions.Regex.Matches(command.CommandText, pgArg).Count;
                count.Should().Be(1, $"{pgArg} must appear exactly once");
            }
        }

        // =====================================================================
        // Items 7/8 regression pins: change-request and cancel-request DAL
        // calls forward RanchId unchanged -- the SQL's own interpretation of
        // it shifted from host to requesting ranch, but nothing in the C#
        // binding needed to change, and these tests pin that it didn't.
        // =====================================================================

        [Fact]
        public void CreateStallBookingChangeRequest_StillForwardsRanchIdPositionallyUnchanged()
        {
            // Regression pin via source inspection (this method was not split
            // into a Build...Command form -- it was not touched by Phase 2,
            // exactly as the pre-implementation trace concluded it shouldn't
            // be). Confirms the DAL source itself still contains the single,
            // unmodified positional binding.
            string source = File.ReadAllText(Path.Combine(
                TestSourceDirectory(), "..", "RideOnServer", "DAL", "StallBookingDAL.cs"));

            source.Should().Contain("public static int CreateStallBookingChangeRequest(");

            int methodAt = source.IndexOf("public static int CreateStallBookingChangeRequest(", StringComparison.Ordinal);
            int nextMethodAt = source.IndexOf("public static int CancelStallBookingByPayer(", methodAt, StringComparison.Ordinal);

            string methodBody = source.Substring(methodAt, nextMethodAt - methodAt);

            methodBody.Should().Contain("cmd.Parameters.AddWithValue(\n                    \"@ranchId\",\n                    request.RanchId\n                );"
                .Replace("\n", Environment.NewLine));
        }

        private static string TestSourceDirectory([System.Runtime.CompilerServices.CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }
    }
}
