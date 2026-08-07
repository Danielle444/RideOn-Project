using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // Health Certificates C1: approving a certificate previously always
    // succeeded regardless of whether the target row existed, had a file, or
    // was Pending - usp_ApproveHealthCertificate returned void and both the
    // DAL and the Controller ignored whatever ExecuteNonQuery reported.
    //
    // The fix moves the entire eligibility decision into
    // usp_ApproveHealthCertificate (repo file 186), which now returns a real
    // boolean. That decision is proven true/false for every eligible and
    // ineligible case (missing row, NULL/empty/whitespace hcpath, already
    // Approved, Rejected) against live data in a rolled-back transaction as
    // part of this change's DB verification - not here, and deliberately not
    // duplicated in C#.
    //
    // This file is DB-free, matching HealthCertificateAuthorizationTests: no
    // mocking framework and no HTTP test host exist in this project, so it
    // proves the C# contract only, using the same two techniques already
    // established there - reflection over public signatures, and bounded
    // source-text assertions over the real BL/DAL/Controller files - that the
    // procedure's boolean result reaches BL, DAL and the HTTP response
    // unmodified.
    public class HealthCertificateApprovalContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ControllerSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "Controllers", "HorsesController.cs"));

            File.Exists(path).Should().BeTrue("HorsesController.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "HorseDAL.cs"));

            File.Exists(path).Should().BeTrue("HorseDAL.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static int CountOccurrences(string haystack, string needle)
        {
            int count = 0;
            int index = 0;

            while ((index = haystack.IndexOf(needle, index, StringComparison.Ordinal)) != -1)
            {
                count++;
                index += needle.Length;
            }

            return count;
        }

        // =================================================================
        // 1/2. BL and DAL return bool, not void.
        // =================================================================

        [Fact]
        public void The_bl_approve_method_returns_bool()
        {
            MethodInfo method = typeof(HorseParticipationInCompetition)
                .GetMethod("ApproveHealthCertificate", BindingFlags.Public | BindingFlags.Static)
                ?? throw new InvalidOperationException(
                    "HorseParticipationInCompetition.ApproveHealthCertificate was not found.");

            method.ReturnType.Should().Be(
                typeof(bool),
                "the caller needs a real success/failure result, not void");
        }

        [Fact]
        public void The_dal_approve_method_returns_bool()
        {
            MethodInfo method = typeof(HorseDAL)
                .GetMethod("ApproveHealthCertificate", BindingFlags.Public | BindingFlags.Instance)
                ?? throw new InvalidOperationException(
                    "HorseDAL.ApproveHealthCertificate was not found.");

            method.ReturnType.Should().Be(
                typeof(bool),
                "the stored procedure's result must not be discarded");
        }

        // =================================================================
        // 3. DAL reads the procedure's result instead of discarding it.
        // =================================================================

        // Bounded the same way HealthCertificateAuthorizationTests.DalMethodBody
        // bounds the read methods: from the method signature to the closing
        // "throw;" of its own catch block. IndexOf matches this as a substring
        // regardless of the exact indent depth, so it is not sensitive to
        // reformatting.
        private static string DalApproveMethodBody()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public bool ApproveHealthCertificate(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "ApproveHealthCertificate was expected in HorseDAL");

            string rest = source.Substring(from);

            int to = rest.IndexOf("            throw;", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_dal_reads_the_procedure_result_via_ExecuteScalar_not_ExecuteNonQuery()
        {
            string body = DalApproveMethodBody();

            body.Should().Contain(
                "ExecuteScalar()",
                "the caller must see whether a row was actually updated");

            body.Should().NotContain(
                "ExecuteNonQuery()",
                "ExecuteNonQuery's return value was ignored - exactly what let this endpoint always succeed before");
        }

        [Fact]
        public void The_dal_fails_safe_on_null_or_an_unexpected_scalar_type()
        {
            string body = DalApproveMethodBody();

            // null/DBNull and any non-bool scalar must fall through to false -
            // never to an unconditional "return true".
            body.Should().Contain("result == null || result == DBNull.Value");
            body.Should().Contain("result is bool approved");

            body.Should().NotContain(
                "Convert.ToBoolean",
                "Convert.ToBoolean throws or silently coerces an unexpected type instead of failing safe to false");
        }

        [Fact]
        public void The_dal_still_makes_exactly_one_round_trip()
        {
            string body = DalApproveMethodBody();

            CountOccurrences(body, "CreateCommandWithStoredProcedure(")
                .Should().Be(1, "ApproveHealthCertificate must be a single round trip, not an N+1");

            CountOccurrences(body, "Connect(\"DefaultConnection\")")
                .Should().Be(1, "ApproveHealthCertificate must open exactly one connection");
        }

        [Fact]
        public void The_dal_preserves_the_existing_four_parameter_positional_order()
        {
            string body = DalApproveMethodBody();

            int horseAt = body.IndexOf("\"@HorseId\"", StringComparison.Ordinal);
            int competitionAt = body.IndexOf("\"@CompetitionId\"", StringComparison.Ordinal);
            int approverAt = body.IndexOf("\"@HcApproverSystemUserId\"", StringComparison.Ordinal);
            int dateAt = body.IndexOf("\"@HcApprovalDate\"", StringComparison.Ordinal);

            horseAt.Should().BeGreaterThan(-1);
            competitionAt.Should().BeGreaterThan(-1);
            approverAt.Should().BeGreaterThan(-1);
            dateAt.Should().BeGreaterThan(-1);

            // CreateCommandWithStoredProcedure binds by dictionary INSERTION
            // order, not by key text, so this literal ordering is the real
            // positional contract with usp_ApproveHealthCertificate's four
            // declared parameters (p_HorseId, p_CompetitionId,
            // p_HcApproverSystemUserId, p_HcApprovalDate).
            horseAt.Should().BeLessThan(competitionAt);
            competitionAt.Should().BeLessThan(approverAt);
            approverAt.Should().BeLessThan(dateAt);
        }

        // =================================================================
        // 4/5/6. Controller captures the bool and branches: false->409, true->200.
        // =================================================================

        // Bounded from the method signature to the generic catch clause's own
        // Console.WriteLine line, which is unique to this endpoint and contains
        // no embedded newline, so it is not sensitive to CRLF/LF differences.
        private static string ControllerApproveMethodBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult ApproveHealthCertificate(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "ApproveHealthCertificate was expected in HorsesController");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "Console.WriteLine($\"Error in ApproveHealthCertificate:",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_controller_captures_the_bl_result_instead_of_ignoring_it()
        {
            ControllerApproveMethodBody().Should().Contain(
                "bool approved = HorseParticipationInCompetition.ApproveHealthCertificate(request, currentPersonId);");
        }

        [Fact]
        public void A_false_result_returns_409_with_the_approved_fixed_hebrew_message()
        {
            string body = ControllerApproveMethodBody();

            body.Should().Contain("if (!approved)");
            body.Should().Contain(
                "return StatusCode(409, \"לא ניתן לאשר את תעודת הבריאות: היא אינה קיימת, לא הועלה עבורה קובץ, או שאינה ממתינה לאישור.\");");
        }

        [Fact]
        public void A_true_result_still_returns_the_original_200_success_response()
        {
            ControllerApproveMethodBody().Should().Contain(
                "return Ok(new { message = \"תעודת הבריאות אושרה בהצלחה\" });");
        }

        [Fact]
        public void The_bool_is_captured_and_checked_before_the_success_response_can_run()
        {
            string body = ControllerApproveMethodBody();

            int boolAt = body.IndexOf("bool approved =", StringComparison.Ordinal);
            int ifAt = body.IndexOf("if (!approved)", StringComparison.Ordinal);
            int conflictAt = body.IndexOf("StatusCode(409,", StringComparison.Ordinal);
            int okAt = body.IndexOf("return Ok(new { message", StringComparison.Ordinal);

            boolAt.Should().BeGreaterThan(-1);
            ifAt.Should().BeGreaterThan(-1);
            conflictAt.Should().BeGreaterThan(-1);
            okAt.Should().BeGreaterThan(-1);

            // Proves the shape is "capture -> check -> conflict, then fall
            // through to success" - not an unconditional 200 with an
            // unreachable check placed elsewhere.
            boolAt.Should().BeLessThan(ifAt);
            ifAt.Should().BeLessThan(conflictAt);
            conflictAt.Should().BeLessThan(okAt);

            // and each appears exactly once - no second, redundant branch.
            CountOccurrences(body, "bool approved =").Should().Be(1);
            CountOccurrences(body, "StatusCode(409,").Should().Be(1);
        }

        [Fact]
        public void No_raw_database_or_exception_text_reaches_the_409_response()
        {
            // The same property HealthCertificateAuthorizationTests pins for the
            // existing 500 path - the approve endpoint's own 409 path must not
            // regress by echoing ex.Message or any other non-fixed text. Scoped
            // to ApproveHealthCertificate's own body (not the whole controller
            // source) because the sibling reject endpoint deliberately does use
            // StatusCode(409, ex.Message) on its own, separate ValidationException
            // path - see HealthCertificateRejectionContractTests - which is out
            // of scope for this approve-specific assertion.
            ControllerApproveMethodBody().Should().NotContain("StatusCode(409, ex.Message)");
        }
    }
}
