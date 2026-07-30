using System.Text.RegularExpressions;
using FluentAssertions;
using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.Competition.Entry;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // DB-free coverage of the public.usp_insertentry call built by
    // EntryDAL.BuildInsertEntryCommand. No connection is opened: the builder only
    // assembles the command text and its parameters, so a null connection is
    // enough to assert the whole mapping.
    //
    // What these tests exist to prevent:
    //
    //   EntryDAL.InsertEntry used to hand a Dictionary to
    //   DBServices.CreateCommandWithStoredProcedure, which emits
    //   "SELECT * FROM fn(@p1, @p2, ...)" and binds strictly by insertion order.
    //   The dictionary listed the payer sixth and the coach seventh; the live
    //   function takes p_coachfederationmemberid sixth and p_paidbypersonid
    //   seventh. The two were therefore crossed on the wire, silently, because
    //   federationmember.federationmemberid is itself a person.personid - so
    //   every guard and foreign key still passed whenever the payer happened to
    //   be a federation member. A null coach additionally nulled
    //   p_paidbypersonid and made the function raise 'Payer not found'.
    //
    // The sentinels below are far apart and pairwise distinct so that a crossed
    // value can never be mistaken for a correct one.
    public class EntryDalInsertEntryCommandTests
    {
        private const int CoachSentinel = 777777;
        private const int PayerSentinel = 111111;

        private const int ClassInCompSentinel = 101;
        private const int OrderedBySentinel = 202;
        private const int RanchSentinel = 303;
        private const int HorseSentinel = 404;
        private const int RiderSentinel = 505;
        private const string PrizeSentinel = "SENTINEL-PRIZE";

        // Every value distinct, so no assertion can pass by aliasing.
        private static CreateEntryRequest Request(int? coach = CoachSentinel)
        {
            return new CreateEntryRequest
            {
                ClassInCompId = ClassInCompSentinel,
                OrderedBySystemUserId = OrderedBySentinel,
                RanchId = RanchSentinel,
                HorseId = HorseSentinel,
                RiderFederationMemberId = RiderSentinel,
                CoachFederationMemberId = coach,
                PaidByPersonId = PayerSentinel,
                PrizeRecipientName = PrizeSentinel
            };
        }

        private static object? ValueOf(NpgsqlCommand command, string parameterName)
        {
            command.Parameters.Contains(parameterName)
                .Should()
                .BeTrue($"the command must bind {parameterName}");

            return command.Parameters[parameterName].Value;
        }

        // The eight live arguments of
        //   public.usp_insertentry(integer, integer, integer, integer, integer,
        //                          integer, integer, character varying)
        // paired with the Npgsql parameter each one must be mapped to.
        public static TheoryData<string, string> ExpectedArgumentMapping =>
            new TheoryData<string, string>
            {
                { "p_classincompid", "@classInCompId" },
                { "p_orderedbysystemuserid", "@orderedBySystemUserId" },
                { "p_ranchid", "@ranchId" },
                { "p_horseid", "@horseId" },
                { "p_riderfederationmemberid", "@riderFederationMemberId" },
                { "p_coachfederationmemberid", "@coachFederationMemberId" },
                { "p_paidbypersonid", "@paidByPersonId" },
                { "p_prizerecipientname", "@prizeRecipientName" }
            };

        // Case 1 - the regression this whole file is about. Fails under the old
        // positional dictionary (which put the payer in argument 6 and the coach
        // in argument 7), passes with named arguments.
        [Fact]
        public void BuildInsertEntryCommand_MapsCoachAndPayerToTheirOwnArguments()
        {
            using NpgsqlCommand command =
                EntryDAL.BuildInsertEntryCommand(Request(), null);

            // The call must be by name, not by position.
            command.CommandText.Should().MatchRegex(
                @"p_coachfederationmemberid\s*:=\s*@coachFederationMemberId");
            command.CommandText.Should().MatchRegex(
                @"p_paidbypersonid\s*:=\s*@paidByPersonId");

            ValueOf(command, "@coachFederationMemberId").Should().Be(CoachSentinel);
            ValueOf(command, "@paidByPersonId").Should().Be(PayerSentinel);

            // Explicitly assert the crossed shape is absent, so a future edit that
            // reintroduces the swap cannot pass by satisfying only the above.
            ValueOf(command, "@coachFederationMemberId").Should().NotBe(PayerSentinel);
            ValueOf(command, "@paidByPersonId").Should().NotBe(CoachSentinel);
        }

        // Case 2 - a null coach must stay null and must leave the payer alone.
        // Under the old positional binding this produced a null p_paidbypersonid
        // and the live function raised 'Payer not found', so no-coach
        // registrations failed every time.
        [Fact]
        public void BuildInsertEntryCommand_NullCoach_KeepsPayerIntact()
        {
            using NpgsqlCommand command =
                EntryDAL.BuildInsertEntryCommand(Request(coach: null), null);

            ValueOf(command, "@coachFederationMemberId").Should().Be(DBNull.Value);
            ValueOf(command, "@paidByPersonId").Should().Be(PayerSentinel);
        }

        // Case 3a - every live argument name appears exactly once and is mapped to
        // the Npgsql parameter it is supposed to carry.
        [Theory]
        [MemberData(nameof(ExpectedArgumentMapping))]
        public void BuildInsertEntryCommand_MapsEachLiveArgumentExactlyOnce(
            string pgArgumentName,
            string npgsqlParameterName)
        {
            using NpgsqlCommand command =
                EntryDAL.BuildInsertEntryCommand(Request(), null);

            Regex.Matches(command.CommandText, Regex.Escape(pgArgumentName))
                .Count
                .Should()
                .Be(1, $"{pgArgumentName} must appear exactly once");

            Regex.Matches(
                    command.CommandText,
                    Regex.Escape(pgArgumentName) + @"\s*:=\s*" + Regex.Escape(npgsqlParameterName))
                .Count
                .Should()
                .Be(1, $"{pgArgumentName} must be mapped explicitly to {npgsqlParameterName}");

            command.Parameters.Contains(npgsqlParameterName).Should().BeTrue();
        }

        // Case 3b - the full contract: the right function, exactly eight
        // parameters, and the right NpgsqlDbType on each.
        [Fact]
        public void BuildInsertEntryCommand_BindsAllEightParametersWithCorrectTypes()
        {
            using NpgsqlCommand command =
                EntryDAL.BuildInsertEntryCommand(Request(), null);

            command.CommandText.Should().Contain("public.usp_insertentry");
            command.Parameters.Count.Should().Be(8);

            foreach (string integerParameter in new[]
                     {
                         "@classInCompId",
                         "@orderedBySystemUserId",
                         "@ranchId",
                         "@horseId",
                         "@riderFederationMemberId",
                         "@coachFederationMemberId",
                         "@paidByPersonId"
                     })
            {
                command.Parameters[integerParameter]
                    .NpgsqlDbType
                    .Should()
                    .Be(NpgsqlDbType.Integer, $"{integerParameter} is an integer argument");
            }

            // p_prizerecipientname is character varying in the live function.
            command.Parameters["@prizeRecipientName"]
                .NpgsqlDbType
                .Should()
                .Be(NpgsqlDbType.Varchar);

            // Remaining non-crossable values, asserted so a wholesale reordering
            // cannot slip through on the coach/payer pair alone.
            ValueOf(command, "@classInCompId").Should().Be(ClassInCompSentinel);
            ValueOf(command, "@orderedBySystemUserId").Should().Be(OrderedBySentinel);
            ValueOf(command, "@ranchId").Should().Be(RanchSentinel);
            ValueOf(command, "@horseId").Should().Be(HorseSentinel);
            ValueOf(command, "@riderFederationMemberId").Should().Be(RiderSentinel);
            ValueOf(command, "@prizeRecipientName").Should().Be(PrizeSentinel);
        }

        // Case 4 - the command must NOT be the output of
        // DBServices.CreateCommandWithStoredProcedure. That helper is order-bound
        // by construction: it emits "SELECT * FROM <fn>(@p1, @p2, ...)" and names
        // its parameters p1..pN. If any of that shape reappears here, the call has
        // been routed back through the positional helper and the swap can return.
        [Fact]
        public void BuildInsertEntryCommand_DoesNotUsePositionalStoredProcedureHelper()
        {
            using NpgsqlCommand command =
                EntryDAL.BuildInsertEntryCommand(Request(), null);

            command.CommandText.Should().NotContain("SELECT * FROM");
            command.CommandText.Should().NotMatchRegex(@"@p\d+\b");

            foreach (NpgsqlParameter parameter in command.Parameters)
            {
                parameter.ParameterName
                    .Should()
                    .NotMatchRegex(
                        @"^p\d+$",
                        "positional p1..pN names mean CreateCommandWithStoredProcedure built this command");
            }
        }
    }
}
