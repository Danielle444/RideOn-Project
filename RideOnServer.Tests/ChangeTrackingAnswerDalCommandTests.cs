using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using FluentAssertions;
using Npgsql;
using NpgsqlTypes;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // change-request-answer-scoping slice: POST /api/ChangeTracking/answer must
    // bind the target requestId to the exact competitionId the caller was
    // already authorized for, instead of trusting requestId + competitionId
    // merely because both arrived in the same client request.
    //
    // Same constraints as every other *DalCommandTests.cs file in this project
    // (no HTTP test host, no mocking framework): command builders are pure
    // functions of their arguments, so they can be exercised with a null
    // connection - no DB access required. Modeled directly on
    // ChangeEntryRequestDalCommandTests.cs.
    public class ChangeTrackingAnswerDalCommandTests
    {
        private const int RequestIdSentinel = 777;
        private const int AnsweredBySentinel = 888;
        private const int CompetitionIdSentinel = 999;
        private const string ApprovedStatus = "Approved";

        private static object? ValueOf(NpgsqlCommand command, string parameterName)
        {
            command.Parameters.Contains(parameterName)
                .Should()
                .BeTrue($"the command must bind {parameterName}");

            return command.Parameters[parameterName].Value;
        }

        private static void AssertNotPositionalHelperShape(NpgsqlCommand command)
        {
            // Same guard as ChangeEntryRequestDalCommandTests.cs - the
            // "SELECT * FROM fn(@p1, @p2, ...)" shape means the call was routed
            // through the positional CreateCommandWithStoredProcedure helper,
            // which this slice does not use for either builder.
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
        // BuildAnswerChangeEntryRequestSecuredCommand -> usp_answerchangeentryrequestsecured (221)
        // =====================================================================

        public static TheoryData<string, string> EntryArgumentMapping =>
            new TheoryData<string, string>
            {
                { "p_changeentryrequestid", "@requestId" },
                { "p_answerstatus", "@answerStatus" },
                { "p_answeredbysystemuserid", "@answeredBySystemUserId" },
                { "p_competitionid", "@competitionId" },
                { "p_notes", "@notes" }
            };

        [Fact]
        public void BuildAnswerChangeEntryRequestSecuredCommand_CallsTheSecuredFunctionByName()
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerChangeEntryRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, null, null);

            command.CommandText.Should().Contain("public.usp_answerchangeentryrequestsecured");

            // Must never call the old, still-deployed 4-argument function.
            command.CommandText.Should().NotMatchRegex(
                @"public\.usp_answerchangeentryrequestsecured\b.*\bpublic\.usp_answerchangeentryrequest\b");
            command.CommandText.Should().NotContain("public.usp_answerchangeentryrequest(");
        }

        [Theory]
        [MemberData(nameof(EntryArgumentMapping))]
        public void BuildAnswerChangeEntryRequestSecuredCommand_MapsEachArgumentByNameExactlyOnce(
            string pgArgumentName,
            string npgsqlParameterName)
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerChangeEntryRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, null, null);

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
        public void BuildAnswerChangeEntryRequestSecuredCommand_BindsAllFiveParametersWithCorrectValuesAndTypes()
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerChangeEntryRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, "some notes", null);

            command.Parameters.Count.Should().Be(5);

            ValueOf(command, "@requestId").Should().Be(RequestIdSentinel);
            ValueOf(command, "@answerStatus").Should().Be(ApprovedStatus);
            ValueOf(command, "@answeredBySystemUserId").Should().Be(AnsweredBySentinel);
            ValueOf(command, "@competitionId").Should().Be(CompetitionIdSentinel);
            ValueOf(command, "@notes").Should().Be("some notes");

            command.Parameters["@requestId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@answerStatus"].NpgsqlDbType.Should().Be(NpgsqlDbType.Text);
            command.Parameters["@answeredBySystemUserId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@competitionId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@notes"].NpgsqlDbType.Should().Be(NpgsqlDbType.Text);
        }

        [Fact]
        public void BuildAnswerChangeEntryRequestSecuredCommand_BlankNotes_BindsDbNullNotEmptyString()
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerChangeEntryRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, "   ", null);

            ValueOf(command, "@notes").Should().Be(DBNull.Value);

            // competitionId must never be nulled out - it is the caller-context
            // value the SP-level competition-binding guard depends on.
            ValueOf(command, "@competitionId").Should().Be(CompetitionIdSentinel);
        }

        [Fact]
        public void BuildAnswerChangeEntryRequestSecuredCommand_DoesNotUsePositionalStoredProcedureHelper()
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerChangeEntryRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, null, null);

            AssertNotPositionalHelperShape(command);
        }

        // =====================================================================
        // BuildAnswerProductChangeRequestSecuredCommand -> usp_answerproductchangerequestsecured (222)
        // =====================================================================

        public static TheoryData<string, string> ProductArgumentMapping =>
            new TheoryData<string, string>
            {
                { "p_productchangerequestid", "@requestId" },
                { "p_answerstatus", "@answerStatus" },
                { "p_answeredbysystemuserid", "@answeredBySystemUserId" },
                { "p_competitionid", "@competitionId" },
                { "p_notes", "@notes" }
            };

        [Fact]
        public void BuildAnswerProductChangeRequestSecuredCommand_CallsTheSecuredFunctionByName()
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerProductChangeRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, null, null);

            command.CommandText.Should().Contain("public.usp_answerproductchangerequestsecured");

            // Must never call the old, still-deployed 4-argument function.
            command.CommandText.Should().NotMatchRegex(
                @"public\.usp_answerproductchangerequestsecured\b.*\bpublic\.usp_answerproductchangerequest\b");
            command.CommandText.Should().NotContain("public.usp_answerproductchangerequest(");
        }

        [Theory]
        [MemberData(nameof(ProductArgumentMapping))]
        public void BuildAnswerProductChangeRequestSecuredCommand_MapsEachArgumentByNameExactlyOnce(
            string pgArgumentName,
            string npgsqlParameterName)
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerProductChangeRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, null, null);

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
        public void BuildAnswerProductChangeRequestSecuredCommand_BindsAllFiveParametersWithCorrectValuesAndTypes()
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerProductChangeRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, "some notes", null);

            command.Parameters.Count.Should().Be(5);

            ValueOf(command, "@requestId").Should().Be(RequestIdSentinel);
            ValueOf(command, "@answerStatus").Should().Be(ApprovedStatus);
            ValueOf(command, "@answeredBySystemUserId").Should().Be(AnsweredBySentinel);
            ValueOf(command, "@competitionId").Should().Be(CompetitionIdSentinel);
            ValueOf(command, "@notes").Should().Be("some notes");

            command.Parameters["@requestId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@answerStatus"].NpgsqlDbType.Should().Be(NpgsqlDbType.Text);
            command.Parameters["@answeredBySystemUserId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@competitionId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Integer);
            command.Parameters["@notes"].NpgsqlDbType.Should().Be(NpgsqlDbType.Text);
        }

        [Fact]
        public void BuildAnswerProductChangeRequestSecuredCommand_BlankNotes_BindsDbNullNotEmptyString()
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerProductChangeRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, "", null);

            ValueOf(command, "@notes").Should().Be(DBNull.Value);
            ValueOf(command, "@competitionId").Should().Be(CompetitionIdSentinel);
        }

        [Fact]
        public void BuildAnswerProductChangeRequestSecuredCommand_DoesNotUsePositionalStoredProcedureHelper()
        {
            using NpgsqlCommand command = ChangeTrackingDAL.BuildAnswerProductChangeRequestSecuredCommand(
                RequestIdSentinel, ApprovedStatus, AnsweredBySentinel, CompetitionIdSentinel, null, null);

            AssertNotPositionalHelperShape(command);
        }

        // =====================================================================
        // Source-text: AnswerSecretaryChangeRequest calls the new builders for
        // both branches and never references the old bare function names -
        // proves the DAL mutation path itself, not just the builders in
        // isolation. Same technique as ChangeEntryRequestCreateAuthorizationTests.cs.
        // =====================================================================

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

        private static string DalSource()
        {
            return ReadServerFile("RideOnServer", "DAL", "ChangeTrackingDAL.cs");
        }

        private static string AnswerSecretaryChangeRequestMethodBody()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public int AnswerSecretaryChangeRequest(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "AnswerSecretaryChangeRequest was expected in ChangeTrackingDAL");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "public int GetHostSecretaryPendingChangeRequestsCount(",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void AnswerSecretaryChangeRequest_CallsBothSecuredBuilders_ForEntryAndProductBranches()
        {
            string body = AnswerSecretaryChangeRequestMethodBody();

            body.Should().Contain("BuildAnswerChangeEntryRequestSecuredCommand(");
            body.Should().Contain("BuildAnswerProductChangeRequestSecuredCommand(");

            int entryBranchAt = body.IndexOf(
                "request.RequestSource == \"Entry\"", StringComparison.Ordinal);
            int productBranchAt = body.IndexOf(
                "request.RequestSource == \"Product\"", StringComparison.Ordinal);

            entryBranchAt.Should().BeGreaterThan(-1);
            productBranchAt.Should().BeGreaterThan(-1);
            entryBranchAt.Should().BeLessThan(productBranchAt);
        }

        [Fact]
        public void AnswerSecretaryChangeRequest_PassesCompetitionId_ForBothBranches()
        {
            string body = AnswerSecretaryChangeRequestMethodBody();

            Regex.Matches(body, Regex.Escape("request.CompetitionId")).Count
                .Should()
                .Be(2, "CompetitionId must be threaded into both the Entry and Product secured calls");
        }

        [Fact]
        public void AnswerSecretaryChangeRequest_NeverCallsTheOldUnsecuredFunctionNames()
        {
            string body = AnswerSecretaryChangeRequestMethodBody();

            body.Should().NotContain("public.usp_answerchangeentryrequest(");
            body.Should().NotContain("public.usp_answerproductchangerequest(");
        }

        // =====================================================================
        // SQL-file assertions: the competition predicate exists in the initial
        // lookup, before every mutation statement, and the downstream mutation
        // sections known from 210/211 remain present untouched in 221/222.
        // =====================================================================

        private static string SqlFile(string fileName)
        {
            return ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName);
        }

        private static int FirstMutationStatementIndex(string sql)
        {
            int updateAt = sql.IndexOf("update public.", StringComparison.Ordinal);
            int insertAt = sql.IndexOf("insert into public.", StringComparison.Ordinal);

            if (updateAt == -1) return insertAt;
            if (insertAt == -1) return updateAt;

            return Math.Min(updateAt, insertAt);
        }

        [Fact]
        public void EntrySecuredSql_CompetitionPredicate_AppearsBeforeAnyMutation()
        {
            string sql = SqlFile("221_usp_AnswerChangeEntryRequestSecured.sql");

            int predicateAt = sql.IndexOf(
                "and cic.competitionid = p_competitionid", StringComparison.Ordinal);
            int firstMutationAt = FirstMutationStatementIndex(sql);

            predicateAt.Should().BeGreaterThan(-1, "the competition-binding predicate must exist");
            firstMutationAt.Should().BeGreaterThan(-1, "expected at least one mutation statement");
            predicateAt.Should().BeLessThan(firstMutationAt,
                "the competition guard must run before any mutation");
        }

        [Fact]
        public void ProductSecuredSql_CompetitionPredicate_AppearsBeforeAnyMutation()
        {
            string sql = SqlFile("222_usp_AnswerProductChangeRequestSecured.sql");

            int predicateAt = sql.IndexOf(
                "and original_pr.competitionid = p_competitionid", StringComparison.Ordinal);
            int firstMutationAt = FirstMutationStatementIndex(sql);

            predicateAt.Should().BeGreaterThan(-1, "the competition-binding predicate must exist");
            firstMutationAt.Should().BeGreaterThan(-1, "expected at least one mutation statement");
            predicateAt.Should().BeLessThan(firstMutationAt,
                "the competition guard must run before any mutation");
        }

        // Scoped to the actual function body (AS $function$ ... $function$),
        // excluding the file's header comment - the header's own prose
        // explains the fallthrough by quoting the message text, which would
        // otherwise double-count against a whole-file search.
        private static string FunctionBody(string sql)
        {
            int bodyStart = sql.IndexOf("AS $function$", StringComparison.Ordinal);
            bodyStart.Should().BeGreaterThan(-1, "expected a $function$ body marker");

            return sql.Substring(bodyStart);
        }

        [Fact]
        public void EntrySecuredSql_MismatchAndNotFound_ShareTheSameExceptionMessage()
        {
            string body = FunctionBody(SqlFile("221_usp_AnswerChangeEntryRequestSecured.sql"));

            // No distinct cross-competition error was introduced - a foreign
            // requestId and a nonexistent requestId both fall through to this
            // single existing message, exactly once.
            Regex.Matches(body, Regex.Escape("Change entry request not found")).Count
                .Should()
                .Be(1);

            body.Should().NotContain("RN001");
        }

        [Fact]
        public void ProductSecuredSql_MismatchAndNotFound_ShareTheSameExceptionMessage()
        {
            string body = FunctionBody(SqlFile("222_usp_AnswerProductChangeRequestSecured.sql"));

            Regex.Matches(body, Regex.Escape("Product change request not found")).Count
                .Should()
                .Be(1);

            body.Should().NotContain("RN001");
        }

        [Fact]
        public void EntrySecuredSql_RetainsAllKnownDownstreamMutationSections()
        {
            string sql = SqlFile("221_usp_AnswerChangeEntryRequestSecured.sql");

            sql.Should().Contain("Only pending change entry requests can be answered");
            sql.Should().Contain("Cannot answer change request for a paid entry");
            sql.Should().Contain("entrystatus = 'Rejected'");
            sql.Should().Contain("then 'CancelledAfterStart'");
            sql.Should().Contain("entrystatus = 'Replaced'");
            sql.Should().Contain("'Entry cancellation fine. FineId='");
            sql.Should().Contain("'Entry change fine. FineId='");
            sql.Should().Contain("after competition start - full charge kept");
            sql.Should().Contain("update public.bill b");
        }

        [Fact]
        public void ProductSecuredSql_RetainsAllKnownDownstreamMutationSections()
        {
            string sql = SqlFile("222_usp_AnswerProductChangeRequestSecured.sql");

            sql.Should().Contain("Only pending product change requests can be answered");
            sql.Should().Contain("Cannot answer change request for a paid product request");
            sql.Should().Contain("Approved product cancellation request");
            sql.Should().Contain("Replaced by product change request");
            sql.Should().Contain("Could not calculate new stall price");
            sql.Should().Contain("public.usp_recalculatebillamount(v_bill_id)");
        }
    }
}
