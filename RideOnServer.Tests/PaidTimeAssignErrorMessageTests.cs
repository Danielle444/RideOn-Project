using System.Reflection;
using FluentAssertions;
using RideOnServer.Controllers;

namespace RideOnServer.Tests
{
    // DB-free coverage of the assign endpoint's error-message gate, mirroring
    // PaidTimeUnassignErrorMessageTests. The production logic lives in a PRIVATE
    // static helper on PaidTimeRequestsController and is reached here by
    // reflection rather than by widening its visibility, since the controller
    // method itself needs a JWT principal and a live connection.
    //
    // What the gate must guarantee:
    //   * the eight controlled Hebrew messages reachable from assign
    //     (two from public.usp_assignpaidtimerequest, six from
    //     public.usp_recalculatepaidtimeslotassignments) reach the secretary
    //     verbatim;
    //   * the one dynamic message (occupied entry order + horse name) is
    //     accepted ONLY in its exact template shape, and is REBUILT from the
    //     captured order/name rather than echoed;
    //   * everything else - internal English SP/BL messages, raw
    //     PostgreSQL/Npgsql detail, near-misses - collapses to the generic
    //     Hebrew message.
    //
    // Prefix note: a live controlled message arrives as
    //   "Database error: P0001: <text>"
    // because Npgsql 8 builds PostgresException.Message as
    // "{SqlState}: {MessageText}" and the DAL then wraps it. Every case below is
    // therefore exercised under all four prefix shapes.
    public class PaidTimeAssignErrorMessageTests
    {
        private const string GenericMessage = "אירעה שגיאה בשיבוץ בקשת פייד־טיים";

        private const string DatabaseErrorPrefix = "Database error: ";
        private const string SqlStatePrefix = "P0001: ";

        private static readonly MethodInfo Resolver =
            typeof(PaidTimeRequestsController)
                .GetMethod(
                    "ResolveAssignErrorMessage",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "PaidTimeRequestsController.ResolveAssignErrorMessage(string) was not found. " +
                "If it was renamed, update this test - do not widen its visibility.");

        private static string Resolve(string? message)
        {
            return (string)Resolver.Invoke(null, new object?[] { message })!;
        }

        // The four shapes a message can arrive in: bare, DAL-wrapped,
        // SQLSTATE-prefixed, and the real live shape (both).
        private static IEnumerable<string> AllPrefixShapes(string message)
        {
            yield return message;
            yield return DatabaseErrorPrefix + message;
            yield return SqlStatePrefix + message;
            yield return DatabaseErrorPrefix + SqlStatePrefix + message;
        }

        // The eight controlled fixed messages, exactly as raised by the deployed
        // functions (verified against pg_get_functiondef, not only the repo .sql).
        public static TheoryData<string> ControlledMessages()
        {
            return new TheoryData<string>
            {
                // public.usp_assignpaidtimerequest
                "לא ניתן לשבץ בקשה שבוטלה",
                "לא ניתן לשבץ בקשה בסלוט שפורסם",
                // public.usp_recalculatepaidtimeslotassignments
                "השיבוץ הידני יוצר חפיפה בתוך הסלוט",
                "אין מספיק זמן בסלוט להשלמת השיבוץ לפי סדר הכניסה הנוכחי",
                "השיבוץ הידני יוצר חפיפה בזמני המאמן",
                "השיבוץ הידני יוצר חפיפה בזמני הרוכב",
                "השיבוץ הידני יוצר חפיפה בזמני הסוס",
                "קיים יותר משיבוץ אחד באותו מיקום בסלוט"
            };
        }

        // ===== 1. every fixed message, under every prefix shape =====
        [Theory]
        [MemberData(nameof(ControlledMessages))]
        public void Returns_the_exact_message_for_every_allowlisted_message_and_prefix_shape(string message)
        {
            foreach (string wrapped in AllPrefixShapes(message))
            {
                Resolve(wrapped).Should().Be(message, "input was [{0}]", wrapped);
            }
        }

        // ===== 2 + 3. the dynamic occupied-order message =====
        private const string OccupiedOrderTemplateOrder = "3";
        private const string OccupiedOrderTemplateName = "רוח צפונית";

        private static string OccupiedOrder(string order, string name)
        {
            return "המקום " + order + " כבר תפוס על ידי " + name +
                ". יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים";
        }

        [Fact]
        public void Accepts_the_dynamic_occupied_order_message_under_every_prefix_shape()
        {
            string message = OccupiedOrder(OccupiedOrderTemplateOrder, OccupiedOrderTemplateName);

            foreach (string wrapped in AllPrefixShapes(message))
            {
                Resolve(wrapped).Should().Be(message, "input was [{0}]", wrapped);
            }
        }

        [Theory]
        // order boundaries: 1 and 4 digits
        [InlineData("1", "רוח צפונית")]
        [InlineData("9999", "רוח צפונית")]
        // name boundaries: 1 and 60 characters
        [InlineData("7", "א")]
        [InlineData("7", "אאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאא")]
        // names that are ordinary free text
        [InlineData("12", "Barn 12 / סוסון")]
        [InlineData("12", "אורוות \"השרון\"")]
        public void Rebuilds_the_dynamic_message_to_the_controlled_template(string order, string name)
        {
            string message = OccupiedOrder(order, name);

            // The returned string is built from the captured groups, so it is the
            // template by construction - never the candidate that came in.
            Resolve(DatabaseErrorPrefix + SqlStatePrefix + message).Should().Be(message);
        }

        [Fact]
        public void Does_not_echo_the_candidate_string_instance_for_a_dynamic_match()
        {
            string message = OccupiedOrder("5", "רוח צפונית");
            string candidate = DatabaseErrorPrefix + SqlStatePrefix + message;

            string resolved = Resolve(candidate);

            resolved.Should().Be(message);
            resolved.Should().NotContain(DatabaseErrorPrefix);
            resolved.Should().NotContain("P0001");
        }

        // ===== 4. dynamic near-misses =====
        public static TheoryData<string> DynamicNearMisses()
        {
            string valid = OccupiedOrder("3", "רוח צפונית");

            return new TheoryData<string>
            {
                // appended technical tail
                valid + " (slot 412, request 9931)",
                valid + " DETAIL: Key (assignedorder)=(3) already exists.",
                // embedded in a larger raw error
                "ERROR: " + valid +
                    " CONTEXT: PL/pgSQL function usp_assignpaidtimerequest(integer,integer,integer,integer) line 61",
                // leading text
                "שגיאה: " + valid,
                // trailing whitespace / newline
                valid + " ",
                valid + "\n",
                valid + "\r\n",
                // newline inside the name
                OccupiedOrder("3", "רוח\nצפונית"),
                OccupiedOrder("3", "רוח\rצפונית"),
                // empty name
                "המקום 3 כבר תפוס על ידי . יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים",
                // order over 4 digits, and a non-numeric order
                OccupiedOrder("12345", "רוח צפונית"),
                OccupiedOrder("", "רוח צפונית"),
                OccupiedOrder("3א", "רוח צפונית"),
                // name over 60 characters (61)
                OccupiedOrder("3", "אאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאא"),
                // partial matches
                "המקום 3 כבר תפוס על ידי רוח צפונית",
                "המקום 3 כבר תפוס",
                "כבר תפוס על ידי רוח צפונית. יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים",
                // wrong wording inside the template
                "המקום 3 כבר תפוסה על ידי רוח צפונית. יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים"
            };
        }

        [Theory]
        [MemberData(nameof(DynamicNearMisses))]
        public void Returns_the_generic_message_for_dynamic_near_misses(string message)
        {
            foreach (string wrapped in AllPrefixShapes(message))
            {
                Resolve(wrapped).Should().Be(GenericMessage, "input was [{0}]", wrapped);
            }
        }

        [Fact]
        public void Name_length_boundary_is_exactly_sixty_characters()
        {
            string sixty = new string('א', 60);
            string sixtyOne = new string('א', 61);

            Resolve(OccupiedOrder("3", sixty)).Should().Be(OccupiedOrder("3", sixty));
            Resolve(OccupiedOrder("3", sixtyOne)).Should().Be(GenericMessage);
        }

        // ===== 5. prefixes are peeled at most once =====
        [Theory]
        [InlineData("Database error: Database error: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: P0001: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: Database error: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("P0001: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        public void Peels_each_prefix_at_most_once(string message)
        {
            Resolve(message).Should().Be(GenericMessage);
        }

        [Theory]
        // a SQLSTATE-shaped segment that is not at the very start must not be peeled
        [InlineData("ERROR: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("some text P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: ERROR: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        public void Does_not_peel_a_sqlstate_that_is_not_the_leading_segment(string message)
        {
            Resolve(message).Should().Be(GenericMessage);
        }

        [Theory]
        // the DAL prefix must be peeled before the SQLSTATE, and only in that order
        [InlineData("P0001: Database error: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        public void Does_not_peel_the_database_prefix_after_a_sqlstate(string message)
        {
            Resolve(message).Should().Be(GenericMessage);
        }

        // ===== 6. infrastructure / schema / auth / connection / deadlock =====
        [Theory]
        [InlineData("57014: canceling statement due to statement timeout")]
        [InlineData("40P01: deadlock detected DETAIL: Process 18321 waits for ShareLock on transaction 994512")]
        [InlineData("42P01: relation \"paidtimerequest\" does not exist")]
        [InlineData("42883: function public.usp_assignpaidtimerequest(integer,integer,integer,integer) does not exist")]
        [InlineData("23505: duplicate key value violates unique constraint \"paidtimerequest_pkey\"")]
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

        [Fact]
        public void Returns_the_generic_message_for_an_unknown_hebrew_containing_database_error()
        {
            // A real PostgreSQL constraint error can quote Hebrew ROW DATA while
            // still naming tables and constraints. "Contains Hebrew" must never
            // be enough to pass the gate.
            string leaky = DatabaseErrorPrefix + SqlStatePrefix +
                "duplicate key value violates unique constraint \"paidtimerequest_pkey\" " +
                "DETAIL: Key (horsename)=(סוסון) already exists.";

            Resolve(leaky).Should().Be(GenericMessage);
        }

        // ===== 7. internal English BL / SP messages =====
        [Theory]
        // public.usp_assignpaidtimerequest
        [InlineData("Invalid assigned order")]
        [InlineData("Paid time request not found for this ranch")]
        [InlineData("Assigned paid time slot not found for this ranch")]
        [InlineData("Cannot assign paid time request to a slot from another competition")]
        // public.usp_recalculatepaidtimeslotassignments
        [InlineData("Paid time slot not found for this ranch")]
        // RideOnServer.BL.PaidTimeRequest.AssignPaidTimeRequest guards
        [InlineData("Request is required")]
        [InlineData("Invalid RanchId")]
        [InlineData("Invalid PaidTimeRequestId")]
        [InlineData("Invalid AssignedCompSlotId")]
        [InlineData("Invalid AssignedOrder")]
        public void Returns_the_generic_message_for_internal_english_messages(string message)
        {
            foreach (string wrapped in AllPrefixShapes(message))
            {
                Resolve(wrapped).Should().Be(GenericMessage, "input was [{0}]", wrapped);
            }
        }

        // ===== 8. defensive =====
        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("Database error: ")]
        [InlineData("P0001: ")]
        [InlineData("Database error: P0001: ")]
        public void Returns_the_generic_message_for_empty_and_null_input(string? message)
        {
            Resolve(message).Should().Be(GenericMessage);
        }

        // ===== near-miss on the fixed allowlist itself =====
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
        [InlineData("לא ניתן לשבץ בקשה שבוטלה.")]
        public void Returns_the_generic_message_for_partial_or_near_miss_matches(string message)
        {
            Resolve(message).Should().Be(GenericMessage);
            Resolve(DatabaseErrorPrefix + SqlStatePrefix + message).Should().Be(GenericMessage);
        }

        // ===== 9. the two flows keep separate allowlists =====
        private static readonly MethodInfo UnassignResolver =
            typeof(PaidTimeRequestsController)
                .GetMethod(
                    "ResolveUnassignErrorMessage",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "PaidTimeRequestsController.ResolveUnassignErrorMessage(string) was not found.");

        [Theory]
        // raised by usp_assignpaidtimerequest only - proc 123 cannot raise these,
        // so the shared normalization must not make them reachable from unassign.
        [InlineData("לא ניתן לשבץ בקשה שבוטלה")]
        [InlineData("לא ניתן לשבץ בקשה בסלוט שפורסם")]
        public void Assign_only_messages_are_still_rejected_by_the_unassign_resolver(string message)
        {
            const string unassignGeneric = "אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים";

            foreach (string wrapped in AllPrefixShapes(message))
            {
                string resolved = (string)UnassignResolver.Invoke(null, new object?[] { wrapped })!;
                resolved.Should().Be(unassignGeneric, "input was [{0}]", wrapped);
            }
        }

        [Fact]
        public void The_dynamic_occupied_order_message_is_rejected_by_the_unassign_resolver()
        {
            const string unassignGeneric = "אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים";
            string message = OccupiedOrder("3", "רוח צפונית");

            string resolved = (string)UnassignResolver.Invoke(
                null,
                new object?[] { DatabaseErrorPrefix + SqlStatePrefix + message })!;

            resolved.Should().Be(unassignGeneric);
        }
    }
}
