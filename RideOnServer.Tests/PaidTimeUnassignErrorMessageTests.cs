using System.Reflection;
using FluentAssertions;
using RideOnServer.Controllers;

namespace RideOnServer.Tests
{
    // DB-free coverage of the unassign endpoint's error-message gate. The
    // production logic lives in a PRIVATE static helper on
    // PaidTimeRequestsController; it is reached here by reflection rather than by
    // widening its visibility, since the controller method itself needs a JWT
    // principal and a live connection and is therefore not unit-testable.
    //
    // What the gate must guarantee: the controlled Hebrew business messages
    // raised by public.usp_recalculatepaidtimeslotassignments reach the
    // secretary verbatim (with the DAL's "Database error: " wrap removed), and
    // everything else — internal English SP messages, raw PostgreSQL/Npgsql
    // detail, near-misses — collapses to the generic Hebrew message.
    public class PaidTimeUnassignErrorMessageTests
    {
        private const string GenericMessage = "אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים";

        private const string DatabaseErrorPrefix = "Database error: ";

        private static readonly MethodInfo Resolver =
            typeof(PaidTimeRequestsController)
                .GetMethod(
                    "ResolveUnassignErrorMessage",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "PaidTimeRequestsController.ResolveUnassignErrorMessage(string) was not found. " +
                "If it was renamed, update this test - do not widen its visibility.");

        private static string Resolve(string? message)
        {
            return (string)Resolver.Invoke(null, new object?[] { message })!;
        }

        // The six controlled messages, exactly as raised by
        // public.usp_recalculatepaidtimeslotassignments (verified against the
        // deployed function, not only the repo .sql file).
        public static TheoryData<string> ControlledMessages()
        {
            return new TheoryData<string>
            {
                "השיבוץ הידני יוצר חפיפה בתוך הסלוט",
                "אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי",
                "השיבוץ הידני יוצר חפיפה בזמני המאמן",
                "השיבוץ הידני יוצר חפיפה בזמני הרוכב",
                "השיבוץ הידני יוצר חפיפה בזמני הסוס",
                "קיים יותר משיבוץ אחד באותו מיקום בסלוט"
            };
        }

        // ===== 1. exact allowlisted message, no prefix =====
        [Theory]
        [MemberData(nameof(ControlledMessages))]
        public void Returns_the_exact_message_for_an_allowlisted_message_without_a_prefix(string message)
        {
            Resolve(message).Should().Be(message);
        }

        // ===== 2. exact allowlisted message behind the DAL's wrap =====
        [Theory]
        [MemberData(nameof(ControlledMessages))]
        public void Strips_the_database_error_prefix_and_returns_the_clean_hebrew_message(string message)
        {
            Resolve(DatabaseErrorPrefix + message).Should().Be(message);
        }

        [Fact]
        public void Strips_only_one_leading_database_error_prefix()
        {
            // A doubled prefix is not something the DAL produces; if it ever
            // appeared it must NOT be peeled twice into an allowlist hit.
            string doubled = DatabaseErrorPrefix + DatabaseErrorPrefix +
                "השיבוץ הידני יוצר חפיפה בזמני המאמן";

            Resolve(doubled).Should().Be(GenericMessage);
        }

        // ===== 3. unknown Hebrew-containing database error =====
        [Fact]
        public void Returns_the_generic_message_for_an_unknown_hebrew_containing_database_error()
        {
            // A real PostgreSQL constraint error can quote Hebrew ROW DATA while
            // still naming tables and constraints. "Contains Hebrew" must never
            // be enough to pass the gate.
            string leaky = DatabaseErrorPrefix +
                "duplicate key value violates unique constraint \"paidtimerequest_pkey\" " +
                "DETAIL: Key (horsename)=(סוסון) already exists.";

            Resolve(leaky).Should().Be(GenericMessage);
        }

        [Fact]
        public void Returns_the_generic_message_for_an_unlisted_hebrew_business_message()
        {
            // Raised by usp_assignpaidtimerequest, NOT reachable from unassign.
            Resolve(DatabaseErrorPrefix + "לא ניתן לשבץ בקשה שבוטלה")
                .Should().Be(GenericMessage);
        }

        // ===== 4. internal English SP messages =====
        [Theory]
        [InlineData("Paid time request not found for this ranch")]
        [InlineData("Paid time slot not found for this ranch")]
        [InlineData("Invalid assigned order")]
        public void Returns_the_generic_message_for_internal_english_sp_messages(string message)
        {
            Resolve(message).Should().Be(GenericMessage);
            Resolve(DatabaseErrorPrefix + message).Should().Be(GenericMessage);
        }

        // ===== 5. infrastructure / schema-shaped PostgreSQL errors =====
        [Theory]
        [InlineData("57014: canceling statement due to statement timeout")]
        [InlineData("40P01: deadlock detected DETAIL: Process 18321 waits for ShareLock on transaction 994512")]
        [InlineData("42P01: relation \"paidtimerequest\" does not exist")]
        [InlineData("Failed to connect to 10.0.0.7:5432")]
        [InlineData("28P01: password authentication failed for user \"rideon_app\"")]
        public void Returns_the_generic_message_for_infrastructure_and_schema_errors(string message)
        {
            Resolve(DatabaseErrorPrefix + message).Should().Be(GenericMessage);
        }

        [Fact]
        public void Never_echoes_a_connection_string_or_host_detail()
        {
            string raw = DatabaseErrorPrefix +
                "Npgsql.NpgsqlException: Host=db.sxplumrexbolpwqacpiz.supabase.co;Database=postgres";

            Resolve(raw).Should().Be(GenericMessage);
            Resolve(raw).Should().NotContain("supabase.co");
        }

        // ===== 6. partial / near-miss allowlist matches =====
        [Theory]
        // prefix of a controlled message
        [InlineData("השיבוץ הידני יוצר חפיפה")]
        // controlled message with technical text appended
        [InlineData("השיבוץ הידני יוצר חפיפה בזמני המאמן (slot 412, request 9931)")]
        // controlled message embedded in a larger raw error
        [InlineData("ERROR: השיבוץ הידני יוצר חפיפה בזמני הרוכב CONTEXT: PL/pgSQL function usp_recalculatepaidtimeslotassignments(integer,integer) line 88")]
        // trailing whitespace / newline
        [InlineData("השיבוץ הידני יוצר חפיפה בזמני הסוס ")]
        [InlineData("השיבוץ הידני יוצר חפיפה בזמני הסוס\n")]
        // wrong wording
        [InlineData("השיבוץ הידני יוצר חפיפה בזמני הסוסים")]
        public void Returns_the_generic_message_for_partial_or_near_miss_matches(string message)
        {
            Resolve(message).Should().Be(GenericMessage);
            Resolve(DatabaseErrorPrefix + message).Should().Be(GenericMessage);
        }

        // ===== defensive =====
        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("Database error: ")]
        public void Returns_the_generic_message_for_empty_and_null_input(string? message)
        {
            Resolve(message).Should().Be(GenericMessage);
        }
    }
}
