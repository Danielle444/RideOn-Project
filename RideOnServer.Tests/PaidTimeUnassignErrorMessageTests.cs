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
    // secretary verbatim (with the server-side wraps removed), and everything
    // else — internal English SP messages, raw PostgreSQL/Npgsql detail,
    // near-misses — collapses to the generic Hebrew message.
    //
    // Regression this file now pins: a live controlled message arrives as
    //   "Database error: P0001: <text>"
    // because Npgsql 8 builds PostgresException.Message as
    // "{SqlState}: {MessageText}" (plpgsql's `raise exception` is always P0001)
    // and the DAL then wraps that. The first version of this gate stripped only
    // "Database error: ", so NO controlled message ever reached the exact-match
    // check and every real unassign failure collapsed to the generic text. Every
    // case below is therefore exercised under all four prefix shapes.
    public class PaidTimeUnassignErrorMessageTests
    {
        private const string GenericMessage = "אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים";

        private const string DatabaseErrorPrefix = "Database error: ";
        private const string SqlStatePrefix = "P0001: ";

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

        // ===== 2. exact allowlisted message behind the server-side wraps =====
        [Theory]
        [MemberData(nameof(ControlledMessages))]
        public void Strips_the_database_error_prefix_and_returns_the_clean_hebrew_message(string message)
        {
            Resolve(DatabaseErrorPrefix + message).Should().Be(message);
        }

        [Theory]
        [MemberData(nameof(ControlledMessages))]
        public void Strips_the_sqlstate_prefix_and_returns_the_clean_hebrew_message(string message)
        {
            Resolve(SqlStatePrefix + message).Should().Be(message);
        }

        // The shape a real unassign failure actually has.
        [Theory]
        [MemberData(nameof(ControlledMessages))]
        public void Strips_both_live_prefixes_and_returns_the_clean_hebrew_message(string message)
        {
            Resolve(DatabaseErrorPrefix + SqlStatePrefix + message).Should().Be(message);
        }

        [Theory]
        // A doubled prefix is not something the DAL or Npgsql produces; if one
        // ever appeared it must NOT be peeled twice into an allowlist hit.
        [InlineData("Database error: Database error: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: Database error: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: P0001: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("P0001: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        // wrong order: the DAL wrap is only ever the outermost one
        [InlineData("P0001: Database error: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        // a SQLSTATE-shaped segment that is not the leading one stays put
        [InlineData("some text P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        public void Peels_each_prefix_at_most_once(string message)
        {
            Resolve(message).Should().Be(GenericMessage);
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

        [Theory]
        // Raised by usp_assignpaidtimerequest, NOT reachable from unassign. These
        // must stay rejected here even though assign now allowlists them, and
        // under every prefix shape the shared normalization can produce.
        [InlineData("לא ניתן לשבץ בקשה שבוטלה")]
        [InlineData("לא ניתן לשבץ בקשה בסלוט שפורסם")]
        [InlineData("המקום 3 כבר תפוס על ידי רוח צפונית. יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים")]
        public void Returns_the_generic_message_for_an_unlisted_hebrew_business_message(string message)
        {
            Resolve(message).Should().Be(GenericMessage);
            Resolve(DatabaseErrorPrefix + message).Should().Be(GenericMessage);
            Resolve(SqlStatePrefix + message).Should().Be(GenericMessage);
            Resolve(DatabaseErrorPrefix + SqlStatePrefix + message).Should().Be(GenericMessage);
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
            Resolve(SqlStatePrefix + message).Should().Be(GenericMessage);
            Resolve(DatabaseErrorPrefix + SqlStatePrefix + message).Should().Be(GenericMessage);
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
            Resolve(message).Should().Be(GenericMessage);
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
            Resolve(SqlStatePrefix + message).Should().Be(GenericMessage);
            Resolve(DatabaseErrorPrefix + SqlStatePrefix + message).Should().Be(GenericMessage);
        }

        // ===== defensive =====
        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("Database error: ")]
        [InlineData("P0001: ")]
        [InlineData("Database error: P0001: ")]
        public void Returns_the_generic_message_for_empty_and_null_input(string? message)
        {
            Resolve(message).Should().Be(GenericMessage);
        }
    }
}
