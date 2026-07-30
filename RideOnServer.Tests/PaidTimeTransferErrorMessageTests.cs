using System.Reflection;
using FluentAssertions;
using RideOnServer.Controllers;

namespace RideOnServer.Tests
{
    // DB-free coverage of the transfer endpoint's error-message gate, mirroring
    // PaidTimeAssignErrorMessageTests and PaidTimeUnassignErrorMessageTests. The
    // production logic lives in a PRIVATE static helper on
    // PaidTimeRequestsController and is reached here by reflection rather than by
    // widening its visibility, since the controller method itself needs a JWT
    // principal and a live connection.
    //
    // POST api/PaidTimeRequests/transfer-to-slot serves TWO user actions from the
    // secretary's slot-registrations modal, and the resolver takes a bool to tell
    // them apart:
    //   isUnassign = false -> "העבר" with a target slot   (transfer)
    //   isUnassign = true  -> "בטל שיבוץ", NewSlotInCompId = null (modal unassign)
    //
    // What the gate must guarantee:
    //   * the six controlled Hebrew messages raised by
    //     public.usp_recalculatepaidtimeslotassignments (which
    //     public.usp_transferpaidtimerequesttoslot calls for the target slot and
    //     again for a vacated source slot) reach the secretary verbatim;
    //   * the three actionable English messages raised by proc 151 itself are
    //     mapped to their approved Hebrew;
    //   * proc 151's three remaining English messages, proc 166's internal English
    //     message, BL guards, raw PostgreSQL/Npgsql detail and near-misses all
    //     collapse to the generic message for the action that was attempted;
    //   * the transfer allowlist stays isolated from the assign and unassign ones.
    //
    // Prefix note: a live controlled message arrives as
    //   "Database error: P0001: <text>"
    // because Npgsql 8 builds PostgresException.Message as
    // "{SqlState}: {MessageText}" and the DAL then wraps it. Every case below is
    // therefore exercised under all four prefix shapes.
    public class PaidTimeTransferErrorMessageTests
    {
        private const string TransferGeneric = "אירעה שגיאה בהעברת בקשת פייד־טיים";
        private const string UnassignGeneric = "אירעה שגיאה בביטול שיבוץ בקשת פייד־טיים";

        private const string DatabaseErrorPrefix = "Database error: ";
        private const string SqlStatePrefix = "P0001: ";

        private static readonly MethodInfo Resolver =
            typeof(PaidTimeRequestsController)
                .GetMethod(
                    "ResolveTransferErrorMessage",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "PaidTimeRequestsController.ResolveTransferErrorMessage(string, bool) was not found. " +
                "If it was renamed, update this test - do not widen its visibility.");

        private static string Resolve(string? message, bool isUnassign = false)
        {
            return (string)Resolver.Invoke(null, new object?[] { message, isUnassign })!;
        }

        private static string Generic(bool isUnassign)
        {
            return isUnassign ? UnassignGeneric : TransferGeneric;
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

        private static IEnumerable<bool> BothActions()
        {
            yield return false;
            yield return true;
        }

        // ===== 1. the six proc-166 Hebrew messages, verbatim =====
        //
        // Exactly as raised by the deployed public.usp_recalculatepaidtimeslotassignments
        // (verified against pg_get_functiondef, not only the repo .sql). Message 2
        // has three raise sites in that function - the loop guard plus violations 2
        // and 3 - but is one string.
        public static TheoryData<string> ControlledHebrewMessages()
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

        [Theory]
        [MemberData(nameof(ControlledHebrewMessages))]
        public void Returns_the_exact_message_for_every_allowlisted_message_and_prefix_shape(string message)
        {
            foreach (bool isUnassign in BothActions())
            {
                foreach (string wrapped in AllPrefixShapes(message))
                {
                    Resolve(wrapped, isUnassign)
                        .Should().Be(message, "input was [{0}], isUnassign={1}", wrapped, isUnassign);
                }
            }
        }

        [Theory]
        [MemberData(nameof(ControlledHebrewMessages))]
        public void Never_leaks_a_prefix_alongside_an_allowlisted_message(string message)
        {
            string resolved = Resolve(DatabaseErrorPrefix + SqlStatePrefix + message);

            resolved.Should().NotContain(DatabaseErrorPrefix);
            resolved.Should().NotContain("P0001");
        }

        // ===== 2. the three mapped proc-151 messages =====
        //
        // Keys are exactly what the deployed public.usp_transferpaidtimerequesttoslot
        // raises; values are the approved Hebrew.
        public static TheoryData<string, string> MappedMessages()
        {
            return new TheoryData<string, string>
            {
                { "Cannot transfer a cancelled request", "לא ניתן להעביר בקשה שבוטלה" },
                { "Target slot not found", "סלוט היעד לא נמצא. יש לרענן את המסך ולנסות שוב" },
                { "Cannot transfer into a published slot", "לא ניתן להעביר בקשה לסלוט שפורסם" }
            };
        }

        [Theory]
        [MemberData(nameof(MappedMessages))]
        public void Maps_the_actionable_english_messages_under_every_prefix_shape(
            string english,
            string hebrew)
        {
            foreach (bool isUnassign in BothActions())
            {
                foreach (string wrapped in AllPrefixShapes(english))
                {
                    Resolve(wrapped, isUnassign)
                        .Should().Be(hebrew, "input was [{0}], isUnassign={1}", wrapped, isUnassign);
                }
            }
        }

        [Theory]
        [MemberData(nameof(MappedMessages))]
        public void A_mapped_message_never_echoes_the_english_text(string english, string hebrew)
        {
            string resolved = Resolve(DatabaseErrorPrefix + SqlStatePrefix + english);

            resolved.Should().Be(hebrew);
            resolved.Should().NotContain("transfer");
            resolved.Should().NotContain("slot");
            resolved.Should().NotContain("P0001");
        }

        [Theory]
        // The Hebrew values are controller OUTPUT, never function INPUT. They are
        // deliberately not admitted as input: only the English keys and the six
        // proc-166 messages are.
        [InlineData("לא ניתן להעביר בקשה שבוטלה")]
        [InlineData("סלוט היעד לא נמצא. יש לרענן את המסך ולנסות שוב")]
        [InlineData("לא ניתן להעביר בקשה לסלוט שפורסם")]
        public void The_mapped_hebrew_values_are_not_themselves_accepted_as_input(string hebrew)
        {
            Resolve(hebrew).Should().Be(TransferGeneric);
            Resolve(hebrew, true).Should().Be(UnassignGeneric);
        }

        [Theory]
        // near-misses on the translation keys
        [InlineData("cannot transfer a cancelled request")]
        [InlineData("Cannot transfer a cancelled request.")]
        [InlineData("Cannot transfer a cancelled request (request 9931)")]
        [InlineData("Cannot transfer a canceled request")]
        [InlineData("Target slot not found for this ranch")]
        [InlineData("Target slot not found ")]
        [InlineData("Target slot not found\n")]
        [InlineData("ERROR: Cannot transfer into a published slot CONTEXT: PL/pgSQL function usp_transferpaidtimerequesttoslot(integer,integer,integer) line 119")]
        public void Returns_the_generic_message_for_translation_key_near_misses(string message)
        {
            foreach (bool isUnassign in BothActions())
            {
                foreach (string wrapped in AllPrefixShapes(message))
                {
                    Resolve(wrapped, isUnassign)
                        .Should().Be(Generic(isUnassign), "input was [{0}]", wrapped);
                }
            }
        }

        // ===== 3. fallback selection =====
        [Fact]
        public void Chooses_the_transfer_fallback_when_a_target_slot_was_supplied()
        {
            Resolve("something entirely unexpected", false).Should().Be(TransferGeneric);
        }

        [Fact]
        public void Chooses_the_modal_unassign_fallback_when_the_target_slot_was_null()
        {
            Resolve("something entirely unexpected", true).Should().Be(UnassignGeneric);
        }

        [Fact]
        public void The_two_fallbacks_are_different_strings()
        {
            // Guards against a future edit collapsing them: the modal shows one or
            // the other depending on which button the secretary pressed.
            TransferGeneric.Should().NotBe(UnassignGeneric);
        }

        [Fact]
        public void Fallback_selection_does_not_affect_controlled_messages()
        {
            const string controlled = "השיבוץ הידני יוצר חפיפה בזמני הסוס";

            Resolve(controlled, false).Should().Be(controlled);
            Resolve(controlled, true).Should().Be(controlled);
        }

        // ===== 4. prefixes are peeled at most once =====
        [Theory]
        [InlineData("Database error: Database error: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: P0001: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: Database error: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("P0001: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: Database error: P0001: Cannot transfer into a published slot")]
        [InlineData("P0001: P0001: Target slot not found")]
        public void Peels_each_prefix_at_most_once(string message)
        {
            Resolve(message).Should().Be(TransferGeneric);
            Resolve(message, true).Should().Be(UnassignGeneric);
        }

        [Theory]
        // a SQLSTATE-shaped segment that is not at the very start must not be peeled
        [InlineData("ERROR: P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("some text P0001: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        [InlineData("Database error: ERROR: P0001: Cannot transfer a cancelled request")]
        // the DAL prefix must be peeled before the SQLSTATE, and only in that order
        [InlineData("P0001: Database error: השיבוץ הידני יוצר חפיפה בזמני המאמן")]
        public void Does_not_peel_prefixes_out_of_order_or_out_of_position(string message)
        {
            Resolve(message).Should().Be(TransferGeneric);
        }

        [Theory]
        // other real SQLSTATEs are peeled too - harmless, because peeling can only
        // ever expose more technical text, never produce an allowlisted string
        [InlineData("42P01: relation \"paidtimerequest\" does not exist")]
        [InlineData("57014: canceling statement due to statement timeout")]
        public void Peeling_a_non_p0001_sqlstate_still_ends_at_the_generic_message(string message)
        {
            Resolve(message).Should().Be(TransferGeneric);
            Resolve(DatabaseErrorPrefix + message).Should().Be(TransferGeneric);
        }

        // ===== 5. internal English SP / BL messages =====
        [Theory]
        // public.usp_transferpaidtimerequesttoslot - deliberately NOT mapped. The
        // controller authorizes against the client-sent RanchId while the function
        // authorizes against the competition's real host ranch, so distinguishing
        // these two would reveal whether a foreign request id exists.
        [InlineData("Paid time request not found")]
        [InlineData("Permission denied: not the host ranch secretary")]
        // unreachable from a valid UI flow: the transfer dropdown only lists slots
        // of this competition.
        [InlineData("Target slot belongs to a different competition")]
        // public.usp_recalculatepaidtimeslotassignments internal invariant
        [InlineData("Paid time slot not found for this ranch")]
        // public.usp_getpaidtimeslotregistrations (the modal's read path)
        [InlineData("Paid time slot not found")]
        // RideOnServer.BL.PaidTimeRequest.TransferPaidTimeRequestToSlot guards.
        // Invalid NewSlotInCompId is genuinely reachable: the controller validates
        // PaidTimeRequestId and RanchId but not the target slot id, so a payload
        // carrying newSlotInCompId = 0 lands here.
        [InlineData("Invalid PaidTimeRequestId")]
        [InlineData("Invalid SecretarySystemUserId")]
        [InlineData("Invalid NewSlotInCompId")]
        public void Returns_the_generic_message_for_internal_english_messages(string message)
        {
            foreach (bool isUnassign in BothActions())
            {
                foreach (string wrapped in AllPrefixShapes(message))
                {
                    Resolve(wrapped, isUnassign)
                        .Should().Be(Generic(isUnassign), "input was [{0}]", wrapped);
                }
            }
        }

        // ===== 6. infrastructure / schema / auth / connection / deadlock =====
        [Theory]
        [InlineData("57014: canceling statement due to statement timeout")]
        [InlineData("55P03: could not obtain lock on row in relation \"paidtimerequest\"")]
        [InlineData("40P01: deadlock detected DETAIL: Process 18321 waits for ShareLock on transaction 994512")]
        [InlineData("40001: could not serialize access due to concurrent update")]
        [InlineData("42P01: relation \"paidtimerequest\" does not exist")]
        [InlineData("42883: function public.usp_transferpaidtimerequesttoslot(integer,integer,integer) does not exist")]
        [InlineData("23505: duplicate key value violates unique constraint \"paidtimerequest_pkey\"")]
        [InlineData("53300: too many connections for role \"rideon_app\"")]
        [InlineData("28P01: password authentication failed for user \"rideon_app\"")]
        [InlineData("Failed to connect to 10.0.0.7:5432")]
        [InlineData("Exception while connecting: The operation has timed out.")]
        public void Returns_the_generic_message_for_infrastructure_and_schema_errors(string message)
        {
            Resolve(message).Should().Be(TransferGeneric);
            Resolve(DatabaseErrorPrefix + message).Should().Be(TransferGeneric);
            Resolve(DatabaseErrorPrefix + message, true).Should().Be(UnassignGeneric);
        }

        [Fact]
        public void Never_echoes_a_connection_string_or_host_detail()
        {
            string raw = DatabaseErrorPrefix +
                "Npgsql.NpgsqlException: Host=db.sxplumrexbolpwqacpiz.supabase.co;Database=postgres";

            Resolve(raw).Should().Be(TransferGeneric);
            Resolve(raw).Should().NotContain("supabase.co");
        }

        [Fact]
        public void Returns_the_generic_message_for_an_unknown_hebrew_containing_database_error()
        {
            // A real PostgreSQL constraint error can quote Hebrew ROW DATA while
            // still naming tables and constraints. "Contains Hebrew" must never be
            // enough to pass the gate.
            string leaky = DatabaseErrorPrefix + SqlStatePrefix +
                "duplicate key value violates unique constraint \"paidtimerequest_pkey\" " +
                "DETAIL: Key (horsename)=(סוסון) already exists.";

            Resolve(leaky).Should().Be(TransferGeneric);
            Resolve(leaky).Should().NotContain("paidtimerequest_pkey");
        }

        // ===== 7. defensive =====
        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("   ")]
        [InlineData("\n")]
        [InlineData("Database error: ")]
        [InlineData("P0001: ")]
        [InlineData("Database error: P0001: ")]
        public void Returns_the_generic_message_for_empty_and_null_input(string? message)
        {
            Resolve(message).Should().Be(TransferGeneric);
            Resolve(message, true).Should().Be(UnassignGeneric);
        }

        // ===== 8. near-misses on the Hebrew allowlist itself =====
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
        [InlineData("קיים יותר משיבוץ אחד באותו מיקום בסלוט\r\n")]
        // wrong wording
        [InlineData("השיבוץ הידני יוצר חפיפה בזמני הסוסים")]
        [InlineData("אין מספיק זמן בסלוט")]
        public void Returns_the_generic_message_for_partial_or_near_miss_matches(string message)
        {
            Resolve(message).Should().Be(TransferGeneric);
            Resolve(DatabaseErrorPrefix + SqlStatePrefix + message).Should().Be(TransferGeneric);
        }

        // ===== 9. the three flows keep separate allowlists =====
        private static readonly MethodInfo AssignResolver =
            typeof(PaidTimeRequestsController)
                .GetMethod(
                    "ResolveAssignErrorMessage",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "PaidTimeRequestsController.ResolveAssignErrorMessage(string) was not found.");

        private static readonly MethodInfo UnassignResolver =
            typeof(PaidTimeRequestsController)
                .GetMethod(
                    "ResolveUnassignErrorMessage",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "PaidTimeRequestsController.ResolveUnassignErrorMessage(string) was not found.");

        private const string AssignGeneric = "אירעה שגיאה בשיבוץ בקשת פייד־טיים";

        private static string ResolveAssign(string message)
        {
            return (string)AssignResolver.Invoke(null, new object?[] { message })!;
        }

        private static string ResolveUnassign(string message)
        {
            return (string)UnassignResolver.Invoke(null, new object?[] { message })!;
        }

        [Theory]
        // raised by usp_assignpaidtimerequest only - proc 151 cannot raise these,
        // so the shared normalization must not make them reachable from transfer.
        [InlineData("לא ניתן לשבץ בקשה שבוטלה")]
        [InlineData("לא ניתן לשבץ בקשה בסלוט שפורסם")]
        public void Assign_only_messages_are_rejected_by_the_transfer_resolver(string message)
        {
            foreach (string wrapped in AllPrefixShapes(message))
            {
                Resolve(wrapped).Should().Be(TransferGeneric, "input was [{0}]", wrapped);
                Resolve(wrapped, true).Should().Be(UnassignGeneric, "input was [{0}]", wrapped);
            }
        }

        [Fact]
        public void The_dynamic_occupied_order_message_is_rejected_by_the_transfer_resolver()
        {
            // usp_assignpaidtimerequest's one data-carrying message. Proc 151 raises
            // no dynamic message at all, so the transfer gate must not admit it.
            string message = "המקום 3 כבר תפוס על ידי רוח צפונית" +
                ". יש לבחור מקום פנוי או לשחרר את השיבוץ הקיים";

            Resolve(DatabaseErrorPrefix + SqlStatePrefix + message).Should().Be(TransferGeneric);
            Resolve(message, true).Should().Be(UnassignGeneric);
        }

        [Theory]
        // the three transfer-mapped English keys, and the transfer-only Hebrew they
        // produce, must all stay out of the assign and unassign paths.
        [InlineData("Cannot transfer a cancelled request")]
        [InlineData("Target slot not found")]
        [InlineData("Cannot transfer into a published slot")]
        [InlineData("לא ניתן להעביר בקשה שבוטלה")]
        [InlineData("סלוט היעד לא נמצא. יש לרענן את המסך ולנסות שוב")]
        [InlineData("לא ניתן להעביר בקשה לסלוט שפורסם")]
        public void Transfer_only_messages_are_rejected_by_the_assign_and_unassign_resolvers(
            string message)
        {
            foreach (string wrapped in AllPrefixShapes(message))
            {
                ResolveAssign(wrapped).Should().Be(AssignGeneric, "input was [{0}]", wrapped);
                ResolveUnassign(wrapped).Should().Be(UnassignGeneric, "input was [{0}]", wrapped);
            }
        }

        [Theory]
        [MemberData(nameof(ControlledHebrewMessages))]
        public void The_six_shared_messages_pass_all_three_resolvers(string message)
        {
            // These come from public.usp_recalculatepaidtimeslotassignments, which
            // all three endpoints reach. Isolation must not have broken the overlap
            // that genuinely exists.
            string live = DatabaseErrorPrefix + SqlStatePrefix + message;

            Resolve(live).Should().Be(message);
            Resolve(live, true).Should().Be(message);
            ResolveAssign(live).Should().Be(message);
            ResolveUnassign(live).Should().Be(message);
        }
    }
}
