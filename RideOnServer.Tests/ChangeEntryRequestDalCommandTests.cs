using System.Text.RegularExpressions;
using FluentAssertions;
using Npgsql;
using NpgsqlTypes;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // DB-free coverage of the two commands built by ChangeEntryRequestDAL for
    // the Stage 1 security-hardening slice (POST /api/ChangeEntryRequests). No
    // connection is opened: the builders only assemble command text and
    // parameters, so a null connection is enough to assert the whole mapping.
    //
    // Modeled directly on EntryDalInsertEntryCommandTests.cs - that file exists
    // because ChangeEntryRequestDAL's OWN insert method used to go through
    // DBServices.CreateCommandWithStoredProcedure (a Dictionary bound strictly
    // by insertion order, emitting "SELECT * FROM fn(@p1, @p2, ...)"). This
    // slice replaces that call entirely with named PostgreSQL argument
    // notation, so these tests pin the new shape and guard against ever
    // reverting to the positional helper for either new function.
    public class ChangeEntryRequestDalCommandTests
    {
        private const int OriginalEntrySentinel = 111;
        private const int NewEntrySentinel = 222;
        private const int FineIdSentinel = 333;
        private const int PersonIdSentinel = 444;
        private const int CompetitionIdSentinel = 555;
        private const decimal FineAmountSentinel = 12.5m;

        private static object? ValueOf(NpgsqlCommand command, string parameterName)
        {
            command.Parameters.Contains(parameterName)
                .Should()
                .BeTrue($"the command must bind {parameterName}");

            return command.Parameters[parameterName].Value;
        }

        private static void AssertNotPositionalHelperShape(NpgsqlCommand command)
        {
            // Same guard as EntryDalInsertEntryCommandTests.cs Case 4 - the
            // "SELECT * FROM fn(@p1, @p2, ...)" shape means the call was routed
            // back through CreateCommandWithStoredProcedure, which is exactly
            // what this migration removes.
            command.CommandText.Should().NotContain("SELECT * FROM ");
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

        // =====================================================================
        // BuildInsertChangeEntryRequestSecuredCommand -> usp_insertchangeentryrequestsecured (219)
        // =====================================================================

        public static TheoryData<string, string> SecuredInsertArgumentMapping =>
            new TheoryData<string, string>
            {
                { "originalentryid_param", "@originalEntryId" },
                { "newentryid_param", "@newEntryId" },
                { "status_param", "@status" },
                { "iscancelled_param", "@isCancelled" },
                { "fineid_param", "@fineId" },
                { "fineamountsnapshot_param", "@fineAmountSnapshot" },
                { "personid_param", "@personId" },
                { "competitionid_param", "@competitionId" }
            };

        [Fact]
        public void BuildInsertChangeEntryRequestSecuredCommand_CallsTheSecuredFunctionByName()
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildInsertChangeEntryRequestSecuredCommand(
                OriginalEntrySentinel, NewEntrySentinel, false, FineIdSentinel, FineAmountSentinel,
                PersonIdSentinel, CompetitionIdSentinel, null);

            command.CommandText.Should().Contain("public.usp_insertchangeentryrequestsecured");

            // Must never call the old, still-deployed 6-argument function.
            command.CommandText.Should().NotMatchRegex(
                @"public\.usp_insertchangeentryrequestsecured\b.*\bpublic\.usp_insertchangeentryrequest\b");
            command.CommandText.Should().NotContain("public.usp_insertchangeentryrequest(");
        }

        [Theory]
        [MemberData(nameof(SecuredInsertArgumentMapping))]
        public void BuildInsertChangeEntryRequestSecuredCommand_MapsEachArgumentByNameExactlyOnce(
            string pgArgumentName,
            string npgsqlParameterName)
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildInsertChangeEntryRequestSecuredCommand(
                OriginalEntrySentinel, NewEntrySentinel, false, FineIdSentinel, FineAmountSentinel,
                PersonIdSentinel, CompetitionIdSentinel, null);

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

        [Fact]
        public void BuildInsertChangeEntryRequestSecuredCommand_BindsAllEightParametersWithCorrectValuesAndTypes()
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildInsertChangeEntryRequestSecuredCommand(
                OriginalEntrySentinel, NewEntrySentinel, false, FineIdSentinel, FineAmountSentinel,
                PersonIdSentinel, CompetitionIdSentinel, null);

            command.Parameters.Count.Should().Be(8);

            ValueOf(command, "@originalEntryId").Should().Be(OriginalEntrySentinel);
            ValueOf(command, "@newEntryId").Should().Be(NewEntrySentinel);
            ValueOf(command, "@status").Should().Be("Pending");
            ValueOf(command, "@isCancelled").Should().Be(false);
            ValueOf(command, "@fineId").Should().Be(FineIdSentinel);
            ValueOf(command, "@fineAmountSnapshot").Should().Be(FineAmountSentinel);
            ValueOf(command, "@personId").Should().Be(PersonIdSentinel);
            ValueOf(command, "@competitionId").Should().Be(CompetitionIdSentinel);

            command.Parameters["@originalEntryId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@newEntryId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@status"].NpgsqlDbType.Should().Be(NpgsqlDbType.Text);
            command.Parameters["@isCancelled"].NpgsqlDbType.Should().Be(NpgsqlDbType.Boolean);
            command.Parameters["@fineId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@fineAmountSnapshot"].NpgsqlDbType.Should().Be(NpgsqlDbType.Numeric);
            command.Parameters["@personId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@competitionId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
        }

        [Fact]
        public void BuildInsertChangeEntryRequestSecuredCommand_NullNewEntryAndFine_BindDbNullNotZero()
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildInsertChangeEntryRequestSecuredCommand(
                OriginalEntrySentinel, newEntryId: null, isCancelled: true, fineId: null,
                fineAmountSnapshot: null, PersonIdSentinel, CompetitionIdSentinel, null);

            ValueOf(command, "@newEntryId").Should().Be(DBNull.Value);
            ValueOf(command, "@fineId").Should().Be(DBNull.Value);
            ValueOf(command, "@fineAmountSnapshot").Should().Be(DBNull.Value);

            // personId/competitionId must never be nulled out - they are the
            // caller-context values the SP-level defense-in-depth depends on.
            ValueOf(command, "@personId").Should().Be(PersonIdSentinel);
            ValueOf(command, "@competitionId").Should().Be(CompetitionIdSentinel);
        }

        [Fact]
        public void BuildInsertChangeEntryRequestSecuredCommand_DoesNotUsePositionalStoredProcedureHelper()
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildInsertChangeEntryRequestSecuredCommand(
                OriginalEntrySentinel, NewEntrySentinel, false, FineIdSentinel, FineAmountSentinel,
                PersonIdSentinel, CompetitionIdSentinel, null);

            AssertNotPositionalHelperShape(command);
        }

        // =====================================================================
        // BuildGetAuthorizationContextCommand -> usp_getchangeentryrequestauthorizationcontext (218)
        // =====================================================================

        public static TheoryData<string, string> ContextArgumentMapping =>
            new TheoryData<string, string>
            {
                { "p_originalentryid", "@originalEntryId" },
                { "p_newentryid", "@newEntryId" },
                { "p_competitionid", "@competitionId" },
                { "p_personid", "@personId" }
            };

        [Fact]
        public void BuildGetAuthorizationContextCommand_CallsTheLookupFunctionByName()
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildGetAuthorizationContextCommand(
                OriginalEntrySentinel, NewEntrySentinel, CompetitionIdSentinel, PersonIdSentinel, null);

            command.CommandText.Should().Contain("public.usp_getchangeentryrequestauthorizationcontext");
        }

        [Theory]
        [MemberData(nameof(ContextArgumentMapping))]
        public void BuildGetAuthorizationContextCommand_MapsEachArgumentByNameExactlyOnce(
            string pgArgumentName,
            string npgsqlParameterName)
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildGetAuthorizationContextCommand(
                OriginalEntrySentinel, NewEntrySentinel, CompetitionIdSentinel, PersonIdSentinel, null);

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
        }

        [Fact]
        public void BuildGetAuthorizationContextCommand_NullNewEntryId_BindsDbNull()
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildGetAuthorizationContextCommand(
                OriginalEntrySentinel, newEntryId: null, CompetitionIdSentinel, PersonIdSentinel, null);

            ValueOf(command, "@newEntryId").Should().Be(DBNull.Value);
            ValueOf(command, "@originalEntryId").Should().Be(OriginalEntrySentinel);
            ValueOf(command, "@competitionId").Should().Be(CompetitionIdSentinel);
            ValueOf(command, "@personId").Should().Be(PersonIdSentinel);
        }

        [Fact]
        public void BuildGetAuthorizationContextCommand_DoesNotUsePositionalStoredProcedureHelper()
        {
            using NpgsqlCommand command = ChangeEntryRequestDAL.BuildGetAuthorizationContextCommand(
                OriginalEntrySentinel, NewEntrySentinel, CompetitionIdSentinel, PersonIdSentinel, null);

            AssertNotPositionalHelperShape(command);
        }
    }
}
