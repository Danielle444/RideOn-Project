using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // Review-gate fix #1: the ordinary PUT UpdateCompetition path must reject
    // any attempt to change CompetitionStartDate/CompetitionEndDate for an
    // EXISTING competition, so a secretary cannot bypass the atomic
    // usp_RescheduleCompetition operation and desynchronize classes/paid-time/
    // stall bookings/shavings from the competition row.
    //
    // This project has no HTTP test host and no mocking framework (same
    // constraint noted in every other *ContractTests.cs file here), so the
    // Controller action itself cannot be invoked end to end. Two techniques
    // are used instead:
    //   1. A REAL behavioral test of the guard's boolean comparison logic,
    //      reproduced exactly as it appears in the controller (see the
    //      source-text assertion below that pins the literal condition) —
    //      this proves the comparison itself is correct for every case in
    //      the required test list, independent of HTTP plumbing.
    //   2. Bounded source-text assertions proving the guard exists, sits in
    //      the right place, and returns the exact required 409 response.
    public class UpdateCompetitionDateGuardTests
    {
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

        // =================================================================
        // 1. The guard's comparison logic, exercised for real. This mirrors
        //    the exact expression in CompetitionsController.UpdateCompetition:
        //    existingCompetition.CompetitionStartDate.Date != request.CompetitionStartDate.Date ||
        //    existingCompetition.CompetitionEndDate.Date != request.CompetitionEndDate.Date
        // =================================================================

        private static bool DatesChanged(
            DateTime persistedStart, DateTime persistedEnd,
            DateTime requestStart, DateTime requestEnd)
        {
            return persistedStart.Date != requestStart.Date ||
                   persistedEnd.Date != requestEnd.Date;
        }

        [Fact]
        public void Unchanged_dates_do_not_trip_the_guard()
        {
            DateTime start = new DateTime(2026, 8, 4);
            DateTime end = new DateTime(2026, 8, 7);

            DatesChanged(start, end, start, end).Should().BeFalse(
                "an ordinary PUT with identical dates must still succeed");
        }

        [Fact]
        public void A_changed_start_date_trips_the_guard()
        {
            DatesChanged(
                new DateTime(2026, 8, 4), new DateTime(2026, 8, 7),
                new DateTime(2026, 8, 5), new DateTime(2026, 8, 7)
            ).Should().BeTrue();
        }

        [Fact]
        public void A_changed_end_date_trips_the_guard()
        {
            DatesChanged(
                new DateTime(2026, 8, 4), new DateTime(2026, 8, 7),
                new DateTime(2026, 8, 4), new DateTime(2026, 8, 8)
            ).Should().BeTrue();
        }

        [Fact]
        public void Both_dates_changed_trips_the_guard()
        {
            DatesChanged(
                new DateTime(2026, 8, 4), new DateTime(2026, 8, 7),
                new DateTime(2026, 8, 5), new DateTime(2026, 8, 8)
            ).Should().BeTrue();
        }

        [Fact]
        public void A_time_of_day_difference_alone_does_not_trip_the_guard()
        {
            // .Date strips time-of-day before comparing — a request that
            // happens to carry a non-midnight DateTime for the SAME calendar
            // date (e.g. serialization quirks) must not be treated as a
            // date change.
            DateTime persistedStart = new DateTime(2026, 8, 4, 0, 0, 0);
            DateTime requestStart = new DateTime(2026, 8, 4, 13, 45, 0);
            DateTime end = new DateTime(2026, 8, 7);

            DatesChanged(persistedStart, end, requestStart, end).Should().BeFalse();
        }

        // =================================================================
        // 2. Source-text: the guard exists, in the right place, with the
        //    exact required response.
        // =================================================================

        private static string ControllerSource()
        {
            return ReadServerFile("RideOnServer", "Controllers", "CompetitionsController.cs");
        }

        private static string ControllerUpdateMethodBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult UpdateCompetition(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "UpdateCompetition was expected in CompetitionsController");

            string rest = source.Substring(from);

            // Bounded to the reschedule action's own leading comment, the
            // next thing in the file after UpdateCompetition ends.
            int to = rest.IndexOf(
                "// Dedicated reschedule endpoint",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_guard_compares_the_persisted_row_against_the_request_before_calling_BL()
        {
            string body = ControllerUpdateMethodBody();

            body.Should().Contain(
                "existingCompetition.CompetitionStartDate.Date != request.CompetitionStartDate.Date ||");
            body.Should().Contain(
                "existingCompetition.CompetitionEndDate.Date != request.CompetitionEndDate.Date");

            int guardAt = body.IndexOf(
                "existingCompetition.CompetitionStartDate.Date != request.CompetitionStartDate.Date",
                StringComparison.Ordinal);
            int blCallAt = body.IndexOf("Competition.UpdateCompetition(request);", StringComparison.Ordinal);

            guardAt.Should().BeGreaterThan(-1);
            blCallAt.Should().BeGreaterThan(-1);
            guardAt.Should().BeLessThan(blCallAt, "the guard must run before the BL/DAL update path");
        }

        [Fact]
        public void The_guard_returns_409_with_the_exact_required_fixed_hebrew_message()
        {
            string body = ControllerUpdateMethodBody();

            body.Should().Contain("StatusCode(");
            body.Should().Contain("StatusCodes.Status409Conflict,");
            body.Should().Contain(
                "\"לא ניתן לשנות תאריכי תחרות קיימת דרך העריכה הרגילה. יש להשתמש בפעולת דחיית התחרות.\"");
        }

        [Fact]
        public void The_guard_does_not_silently_drop_the_supplied_dates_or_auto_route_to_reschedule()
        {
            string body = ControllerUpdateMethodBody();

            // "Silently ignore" would look like assigning request.CompetitionStartDate
            // to existingCompetition or simply omitting it from the payload before
            // calling BL — neither happens; the whole request is rejected outright.
            body.Should().NotContain("Competition.RescheduleCompetition");
            body.Should().NotContain("RescheduleCompetitionRequest");
        }

        [Fact]
        public void Ordinary_field_updates_name_field_notes_status_registration_dates_are_untouched_by_the_guard()
        {
            string body = ControllerUpdateMethodBody();

            // The guard's IF block only reads/compares dates — it must not
            // reference any other field, confirming name/field/notes/status/
            // registration/paid-time-admin dates flow through unchanged.
            int guardAt = body.IndexOf(
                "if (existingCompetition.CompetitionStartDate.Date",
                StringComparison.Ordinal);
            int guardEndAt = body.IndexOf("}", body.IndexOf("{", guardAt));

            guardAt.Should().BeGreaterThan(-1);
            guardEndAt.Should().BeGreaterThan(guardAt);

            string guardBlock = body.Substring(guardAt, guardEndAt - guardAt);

            guardBlock.Should().NotContain("CompetitionName");
            guardBlock.Should().NotContain("FieldId");
            guardBlock.Should().NotContain("Notes");
            guardBlock.Should().NotContain("CompetitionStatus");
            guardBlock.Should().NotContain("RegistrationOpenDate");
            guardBlock.Should().NotContain("RegistrationEndDate");
            guardBlock.Should().NotContain("PaidTimeRegistrationDate");
            guardBlock.Should().NotContain("PaidTimePublicationDate");
        }

        // =================================================================
        // 3. The DAL/SP layer underneath UpdateCompetition is untouched —
        //    the fix is entirely at the controller boundary, per the task's
        //    own instruction ("Before calling the existing UpdateCompetition
        //    BL/DAL path"). usp_UpdateCompetition.sql remains a plain
        //    full-row UPDATE, which is exactly what "still succeeds
        //    conceptually when dates are unchanged" requires — nothing new
        //    blocks it once the controller-level guard has already passed.
        // =================================================================

        [Fact]
        public void usp_UpdateCompetition_sql_still_sets_both_date_columns_unconditionally()
        {
            string sql = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "13_usp_UpdateCompetition.sql");

            sql.Should().Contain("competitionstartdate      = p_CompetitionStartDate");
            sql.Should().Contain("competitionenddate        = p_CompetitionEndDate");

            // And it must NOT have grown its own date-equality guard — that
            // would duplicate/bypass the controller-level fix and is out of
            // scope for this change.
            sql.Should().NotContain("RN001");
        }

        [Fact]
        public void The_reschedule_action_remains_the_only_path_that_calls_the_reschedule_procedure()
        {
            string source = ControllerSource();

            int occurrences = 0;
            int index = 0;
            const string needle = "Competition.RescheduleCompetition(";

            while ((index = source.IndexOf(needle, index, StringComparison.Ordinal)) != -1)
            {
                occurrences++;
                index += needle.Length;
            }

            occurrences.Should().Be(1, "only the dedicated reschedule action may call the reschedule operation");
        }
    }
}
