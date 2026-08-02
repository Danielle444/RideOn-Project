using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition;

namespace RideOnServer.Tests
{
    // Competition Reschedule v1 — DB-free contract coverage, following the same
    // two techniques already established in this project (PaidTimeAssignErrorMessageTests,
    // HealthCertificateApprovalContractTests): reflection over BL/DAL signatures for
    // behavior that does not need a live connection, and bounded source-text assertions
    // for the Controller's HTTP-status mapping (no mocking framework, no HTTP test host
    // exist in this project).
    //
    // What live-DB verification (NOT this file) must still prove separately:
    //   - usp_RescheduleCompetition's actual preconditions/updates/post-conditions
    //     against real rows (see the feature's DB verification plan);
    //   - that the RN001 SqlState really reaches CompetitionDAL.RescheduleCompetition
    //     as a PostgresException with that exact SqlState.
    public class RescheduleCompetitionContractTests
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
        // 1. BL cheap shape validation — request validation rejects
        //    zero/negative offset, and basic malformed-request shapes.
        //    These paths never reach the DAL (they throw before it is
        //    constructed), so they are safe to exercise for real, not just
        //    via source-text bounding.
        // =================================================================

        private static readonly MethodInfo RescheduleMethod =
            typeof(Competition)
                .GetMethod(
                    "RescheduleCompetition",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "Competition.RescheduleCompetition(RescheduleCompetitionRequest) was not found.");

        private static Exception InvokeAndUnwrap(RescheduleCompetitionRequest? request)
        {
            try
            {
                RescheduleMethod.Invoke(null, new object?[] { request });
                throw new InvalidOperationException("Expected an exception but none was thrown.");
            }
            catch (TargetInvocationException ex) when (ex.InnerException != null)
            {
                return ex.InnerException;
            }
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        [InlineData(-365)]
        [InlineData(int.MinValue)]
        public void Rejects_zero_and_negative_offsets_with_the_fixed_validation_exception(int offsetDays)
        {
            RescheduleCompetitionRequest request = new RescheduleCompetitionRequest
            {
                CompetitionId = 46,
                HostRanchId = 11,
                OffsetDays = offsetDays
            };

            Exception ex = InvokeAndUnwrap(request);

            ex.Should().BeOfType<ValidationException>();
            ex.Message.Should().Be("מספר ימי הדחייה חייב להיות גדול מאפס.");
        }

        [Fact]
        public void Accepts_the_smallest_valid_offset_shape_and_proceeds_past_BL_validation()
        {
            // OffsetDays = 1 passes every BL-level check, so the next thing it hits
            // is the DAL trying to open a real connection — proving BL validation
            // itself does not reject a valid positive offset. No DB is configured in
            // this test project, so this must fail with a connection-shaped error,
            // never a ValidationException.
            RescheduleCompetitionRequest request = new RescheduleCompetitionRequest
            {
                CompetitionId = 46,
                HostRanchId = 11,
                OffsetDays = 1
            };

            Exception ex = InvokeAndUnwrap(request);

            ex.Should().NotBeOfType<ValidationException>();
        }

        [Fact]
        public void Rejects_a_null_request()
        {
            Exception ex = InvokeAndUnwrap(null);

            ex.Should().NotBeOfType<ValidationException>();
            ex.Message.Should().Be("Invalid request");
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void Rejects_an_invalid_competition_id_before_touching_the_offset(int competitionId)
        {
            RescheduleCompetitionRequest request = new RescheduleCompetitionRequest
            {
                CompetitionId = competitionId,
                HostRanchId = 11,
                OffsetDays = 7
            };

            Exception ex = InvokeAndUnwrap(request);

            ex.Should().NotBeOfType<ValidationException>();
            ex.Message.Should().Be("CompetitionId is invalid");
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void Rejects_an_invalid_host_ranch_id(int hostRanchId)
        {
            RescheduleCompetitionRequest request = new RescheduleCompetitionRequest
            {
                CompetitionId = 46,
                HostRanchId = hostRanchId,
                OffsetDays = 7
            };

            Exception ex = InvokeAndUnwrap(request);

            ex.Should().NotBeOfType<ValidationException>();
            ex.Message.Should().Be("HostRanchId is invalid");
        }

        // =================================================================
        // 2. DAL contract — positional parameter order, the RN001 catch, and
        //    reading the structured single-row result by lowercase column
        //    name (matching usp_RescheduleCompetition's RETURNS TABLE).
        //    Bounded the same way HealthCertificateApprovalContractTests
        //    bounds a method body: from the signature to a unique marker
        //    that only appears once, right after the method ends.
        // =================================================================

        private static string DalSource()
        {
            return ReadServerFile("RideOnServer", "DAL", "CompetitionDAL.cs");
        }

        private static string DalRescheduleMethodBody()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public RescheduleCompetitionResponse RescheduleCompetition(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "RescheduleCompetition was expected in CompetitionDAL");

            string rest = source.Substring(from);

            int to = rest.IndexOf("private Competition MapCompetition(", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_dal_calls_the_verified_next_free_stored_procedure_name()
        {
            DalRescheduleMethodBody().Should().Contain(
                "CreateCommandWithStoredProcedure(\"usp_RescheduleCompetition\", connection, paramDic)");
        }

        [Fact]
        public void The_dal_binds_competitionid_before_offsetdays_matching_the_sp_parameter_order()
        {
            string body = DalRescheduleMethodBody();

            int competitionIdAt = body.IndexOf("\"@CompetitionId\"", StringComparison.Ordinal);
            int offsetDaysAt = body.IndexOf("\"@OffsetDays\"", StringComparison.Ordinal);

            competitionIdAt.Should().BeGreaterThan(-1);
            offsetDaysAt.Should().BeGreaterThan(-1);

            // CreateCommandWithStoredProcedure binds by dictionary INSERTION order, not
            // by key text — this literal ordering is the real positional contract with
            // usp_RescheduleCompetition(p_competitionid, p_offsetdays).
            competitionIdAt.Should().BeLessThan(offsetDaysAt);
        }

        [Fact]
        public void The_dal_reads_every_declared_return_column_by_its_exact_lowercase_name()
        {
            string body = DalRescheduleMethodBody();

            // usp_RescheduleCompetition RETURNS TABLE columns are declared lowercase
            // (offsetdays, classesmoved, paidtimeslotsmoved, paidtimeassignmentsmoved,
            // stallbookingsmoved, shavingsordersmoved) — Npgsql's reader indexer is
            // case-insensitive, but pinning the exact strings here catches an accidental
            // rename drifting silently out of sync with the .sql file.
            body.Should().Contain("reader[\"offsetdays\"]");
            body.Should().Contain("reader[\"classesmoved\"]");
            body.Should().Contain("reader[\"paidtimeslotsmoved\"]");
            body.Should().Contain("reader[\"paidtimeassignmentsmoved\"]");
            body.Should().Contain("reader[\"stallbookingsmoved\"]");
            body.Should().Contain("reader[\"shavingsordersmoved\"]");
        }

        [Fact]
        public void The_dal_catches_RN001_and_rethrows_a_validation_exception_carrying_the_sql_message_text()
        {
            string body = DalRescheduleMethodBody();

            body.Should().Contain("catch (PostgresException ex) when (ex.SqlState == \"RN001\")");
            body.Should().Contain("throw new BL.ValidationException(ex.MessageText);");
        }

        [Fact]
        public void The_dal_still_makes_exactly_one_round_trip()
        {
            string body = DalRescheduleMethodBody();

            CountOccurrences(body, "CreateCommandWithStoredProcedure(").Should().Be(1);
            CountOccurrences(body, "Connect(\"DefaultConnection\")").Should().Be(1);
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
        // 3. Controller contract — HTTP status mapping. Bounded from the
        //    method signature to the generic catch's own Console.WriteLine
        //    line, the same technique HealthCertificateApprovalContractTests
        //    uses, so later actions in the same file cannot leak into these
        //    assertions.
        // =================================================================

        private static string ControllerSource()
        {
            return ReadServerFile("RideOnServer", "Controllers", "CompetitionsController.cs");
        }

        private static string ControllerRescheduleMethodBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult RescheduleCompetition(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "RescheduleCompetition was expected in CompetitionsController");

            string rest = source.Substring(from);

            // Bounded to the NEXT controller action's attribute, not just up to the
            // generic catch's Console.WriteLine — unlike
            // HealthCertificateApprovalContractTests' bounding, these assertions
            // need content INSIDE the catch block (the BadRequest fallback text),
            // which sits after that line.
            int to = rest.IndexOf(
                "[HttpGet(\"mobile/admin-board\")]",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_route_is_a_dedicated_post_action_and_not_a_change_to_update_competition()
        {
            string source = ControllerSource();

            source.Should().Contain("[HttpPost(\"{competitionId}/reschedule\")]");

            // UpdateCompetition must still be the plain PUT it always was — this is the
            // cheapest possible guard that the reschedule work did not fold into it.
            source.Should().Contain("[HttpPut(\"{competitionId}\")]");
        }

        [Fact]
        public void Unauthorized_access_maps_to_403()
        {
            string body = ControllerRescheduleMethodBody();

            body.Should().Contain("catch (UnauthorizedAccessException ex)");
            body.Should().Contain("return StatusCode(StatusCodes.Status403Forbidden, ex.Message);");
        }

        [Fact]
        public void A_missing_competition_maps_to_404_via_an_explicit_null_check_before_any_business_logic_runs()
        {
            string body = ControllerRescheduleMethodBody();

            body.Should().Contain("Competition? existingCompetition = Competition.GetCompetitionById(request.CompetitionId);");
            body.Should().Contain("if (existingCompetition == null)");
            body.Should().Contain("return NotFound(\"Competition not found\");");

            // Order matters: the not-found check must come before the BL call that would
            // otherwise attempt the SP against a nonexistent competition.
            int nullCheckAt = body.IndexOf("if (existingCompetition == null)", StringComparison.Ordinal);
            int blCallAt = body.IndexOf("Competition.RescheduleCompetition(request)", StringComparison.Ordinal);

            nullCheckAt.Should().BeGreaterThan(-1);
            blCallAt.Should().BeGreaterThan(-1);
            nullCheckAt.Should().BeLessThan(blCallAt);
        }

        [Fact]
        public void A_ranch_mismatch_maps_to_403_independently_of_the_role_check()
        {
            string body = ControllerRescheduleMethodBody();

            body.Should().Contain("if (existingCompetition.HostRanchId != request.HostRanchId)");
            body.Should().Contain("return StatusCode(StatusCodes.Status403Forbidden, \"אין לך הרשאה לדחות תחרות זו\");");
        }

        [Fact]
        public void A_validation_exception_maps_to_409_not_400()
        {
            string body = ControllerRescheduleMethodBody();

            body.Should().Contain("catch (ValidationException ex)");
            body.Should().Contain("return StatusCode(StatusCodes.Status409Conflict, ex.Message);");

            // The exact fixed-message contract (Hebrew copy) is enforced at the SP/BL
            // layer, not re-duplicated here — this only proves the STATUS CODE choice,
            // which is this feature's own deliberate deviation from other RN001 call
            // sites in this codebase that map ValidationException to 400.
        }

        [Fact]
        public void Success_returns_200_with_the_bl_response_object_untouched()
        {
            string body = ControllerRescheduleMethodBody();

            body.Should().Contain("RescheduleCompetitionResponse response = Competition.RescheduleCompetition(request);");
            body.Should().Contain("return Ok(response);");
        }

        [Fact]
        public void The_generic_catch_returns_the_fixed_hebrew_failure_message_and_never_echoes_the_exception()
        {
            string body = ControllerRescheduleMethodBody();

            body.Should().Contain(
                "return BadRequest(\"אירעה שגיאה בדחיית התחרות. לא בוצעו שינויים.\");");

            body.Should().NotContain("BadRequest(ex.Message)");
        }

        [Fact]
        public void The_url_and_body_competition_id_are_cross_checked_before_any_authorization_call()
        {
            string body = ControllerRescheduleMethodBody();

            body.Should().Contain("if (competitionId != request.CompetitionId)");
            body.Should().Contain("return BadRequest(\"CompetitionId in URL does not match body\");");

            int mismatchCheckAt = body.IndexOf("if (competitionId != request.CompetitionId)", StringComparison.Ordinal);
            int authCallAt = body.IndexOf("UserAccessValidator.EnsureUserHasRoleInRanch(", StringComparison.Ordinal);

            mismatchCheckAt.Should().BeGreaterThan(-1);
            authCallAt.Should().BeGreaterThan(-1);
            mismatchCheckAt.Should().BeLessThan(authCallAt);
        }

        [Fact]
        public void Authorization_checks_HostSecretary_in_the_requests_own_host_ranch()
        {
            string body = ControllerRescheduleMethodBody();

            body.Should().Contain("UserAccessValidator.EnsureUserHasRoleInRanch(");
            body.Should().Contain("request.HostRanchId,");
            body.Should().Contain("RoleNames.HostSecretary");
        }

        // =================================================================
        // 4. SQL file contract — the next free number was actually used,
        //    not a guess, and the file declares the exact advisory lock key
        //    reused from the paid-time write procedures.
        // =================================================================

        [Fact]
        public void The_sql_file_exists_at_the_verified_next_free_number_and_locks_the_shared_paidtime_key()
        {
            string path = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                "187_usp_RescheduleCompetition.sql"));

            File.Exists(path).Should().BeTrue("expected the new SP at {0}", path);

            string sql = File.ReadAllText(path);

            sql.Should().Contain("pg_advisory_xact_lock(1734, p_competitionid)");
            sql.Should().Contain("CREATE OR REPLACE FUNCTION public.usp_reschedulecompetition(");

            // No lower-numbered or higher-numbered file was also claimed for this proc.
            string individualDir = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual"));

            Directory.GetFiles(individualDir, "187_*.sql").Should().HaveCount(1);
        }

        // =================================================================
        // 5. Review-gate fix — business-date timezone. Verified live
        //    2026-08-02: pg_settings shows TimeZone='UTC' at the server
        //    configuration-file level (not a session override), and no role
        //    in pg_roles carries a TimeZone override either. No other SQL
        //    anywhere in this repo computes an Israel-aware date (grepped
        //    the whole repo for "Asia/Jerusalem" / "AT TIME ZONE" before
        //    choosing this expression — zero hits outside unrelated files),
        //    so there was no existing convention this could conflict with.
        // =================================================================

        [Fact]
        public void The_sp_uses_the_explicit_israel_business_date_not_bare_current_date()
        {
            string sql = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "187_usp_RescheduleCompetition.sql");

            sql.Should().Contain(
                "v_businessdate := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date;");
            sql.Should().Contain("IF v_businessdate >= v_oldstartdate THEN");

            // The started-check itself must not use the raw, UTC-anchored
            // CURRENT_DATE — this only bans it as an executable comparison,
            // not from documentation prose (the header and an inline comment
            // both legitimately explain the fix using the word).
            sql.Should().NotContain("IF CURRENT_DATE >=");
        }

        // =================================================================
        // 6. Review-gate fix — stall-booking horse-lock strategy. Every
        //    confirmed writer of stallbooking.startdate/enddate/horseid
        //    (audited live via pg_get_functiondef on 2026-08-02) takes
        //    pg_advisory_xact_lock(1735, <horseid>) before its own
        //    overlap-check/write, in ascending order where more than one
        //    horse can be involved in a single call.
        // =================================================================

        [Fact]
        public void The_reschedule_sp_locks_every_distinct_horse_in_ascending_order_before_the_overlap_check()
        {
            string sql = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "187_usp_RescheduleCompetition.sql");

            sql.Should().Contain("FOR v_horseid IN");
            sql.Should().Contain("ORDER BY sb.horseid");
            sql.Should().Contain("PERFORM pg_advisory_xact_lock(1735, v_horseid);");

            int lockLoopAt = sql.IndexOf("FOR v_horseid IN", StringComparison.Ordinal);

            // Search for the precondition block's comment starting AFTER the
            // lock loop — the same phrase also appears once in the header
            // prose, earlier in the file, which is not the occurrence this
            // test is about.
            int overlapCheckAt = sql.IndexOf(
                "-- Horse stall-booking overlap:", lockLoopAt, StringComparison.Ordinal);

            lockLoopAt.Should().BeGreaterThan(-1);
            overlapCheckAt.Should().BeGreaterThan(-1);
            lockLoopAt.Should().BeLessThan(overlapCheckAt, "locks must be acquired before the check they protect");
        }

        [Theory]
        [InlineData("188_usp_CreateStallBooking.sql", "perform pg_advisory_xact_lock(1735, p_horseid);")]
        [InlineData("189_usp_CreateStallBookingChangeRequest.sql", "perform pg_advisory_xact_lock(1735, v_original_stall_booking.horseid);")]
        public void Newly_committed_live_writers_take_the_same_horse_lock_before_their_own_overlap_check(
            string fileName, string expectedLockCall)
        {
            string sql = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName);

            sql.Should().Contain(expectedLockCall);
            sql.Should().Contain(
                "STATUS AS WRITTEN: NOT DEPLOYED",
                "the live proc must not be claimed as deployed until explicit owner approval");

            int lockAt = sql.IndexOf(expectedLockCall, StringComparison.Ordinal);
            int overlapCheckAt = sql.IndexOf("overlapping stall booking already exists", StringComparison.Ordinal);

            lockAt.Should().BeGreaterThan(-1);
            overlapCheckAt.Should().BeGreaterThan(-1);
            lockAt.Should().BeLessThan(overlapCheckAt);
        }

        [Fact]
        public void SecretaryUpdateStallBooking_locks_old_and_new_horse_in_ascending_order_before_writing()
        {
            string sql = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "147_usp_SecretaryUpdateStallBooking.sql");

            sql.Should().Contain("SELECT sb.ranchid, sb.horseid");
            sql.Should().Contain("IF v_old_horseid < p_horseid THEN");
            sql.Should().Contain("PERFORM pg_advisory_xact_lock(1735, v_old_horseid);");
            sql.Should().Contain("PERFORM pg_advisory_xact_lock(1735, p_horseid);");

            int lockBlockAt = sql.IndexOf(
                "-- Lock the old and/or new horse", StringComparison.Ordinal);
            int updateAt = sql.IndexOf("-- Apply updates", StringComparison.Ordinal);

            lockBlockAt.Should().BeGreaterThan(-1);
            updateAt.Should().BeGreaterThan(-1);
            lockBlockAt.Should().BeLessThan(updateAt);
        }

        [Fact]
        public void SecretaryCreateStallBookingForPayer_locks_the_horse_before_inserting_and_skips_tack()
        {
            string sql = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "149_usp_SecretaryCreateStallBookingForPayer.sql");

            sql.Should().Contain("IF NOT COALESCE(p_isfortack, FALSE) THEN");
            sql.Should().Contain("PERFORM pg_advisory_xact_lock(1735, p_horseid);");

            int lockAt = sql.IndexOf(
                "IF NOT COALESCE(p_isfortack, FALSE) THEN", StringComparison.Ordinal);
            int insertAt = sql.IndexOf(
                "INSERT INTO public.stallbooking (", StringComparison.Ordinal);

            lockAt.Should().BeGreaterThan(-1);
            insertAt.Should().BeGreaterThan(-1);
            lockAt.Should().BeLessThan(insertAt);
        }

        [Fact]
        public void No_other_advisory_lock_key_collides_with_the_new_horse_lock_class_1735()
        {
            // 1734 is the pre-existing paid-time/competition-scoped key, used by
            // 11 procs plus this feature's own 187. 1735 must be new and unique.
            string individualDir = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual"));

            string[] allFiles = Directory.GetFiles(individualDir, "*.sql");

            int filesUsing1735 = allFiles.Count(f => File.ReadAllText(f).Contains("pg_advisory_xact_lock(1735,"));

            // 187 (reschedule, loop form), 188, 189, 147, 149.
            filesUsing1735.Should().Be(5);
        }

        // =================================================================
        // 7. Review-gate fix (owner decision) — 147/149 gained the exact
        //    overlap predicates already verified in 189/188 respectively,
        //    closing the SEQUENTIAL (non-concurrent) double-booking gap the
        //    lock alone never fixed. Do not confuse these with §6 above,
        //    which only proves locking order — these prove the actual
        //    overlap CHECK exists, sits in the right place, uses the right
        //    exclusions, and skips tack.
        // =================================================================

        private static string StallBooking147Sql()
        {
            return ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "147_usp_SecretaryUpdateStallBooking.sql");
        }

        private static string StallBooking149Sql()
        {
            return ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "149_usp_SecretaryCreateStallBookingForPayer.sql");
        }

        [Fact]
        public void SecretaryUpdateStallBooking_147_checks_overlap_after_the_lock_block_and_before_the_update()
        {
            string sql = StallBooking147Sql();

            int lockBlockEndAt = sql.IndexOf(
                "-- Reject an overlapping horse booking for the resulting horseid.",
                StringComparison.Ordinal);
            int updateAt = sql.IndexOf("-- Apply updates", StringComparison.Ordinal);

            lockBlockEndAt.Should().BeGreaterThan(-1);
            updateAt.Should().BeGreaterThan(-1);
            lockBlockEndAt.Should().BeLessThan(updateAt);

            // And the lock block itself (§6's own anchor) still precedes this
            // new check — proving the full order: lock, then overlap check,
            // then write.
            int lockBlockAt = sql.IndexOf("-- Lock the old and/or new horse", StringComparison.Ordinal);
            lockBlockAt.Should().BeGreaterThan(-1);
            lockBlockAt.Should().BeLessThan(lockBlockEndAt);
        }

        [Fact]
        public void SecretaryUpdateStallBooking_147_overlap_check_excludes_its_own_stallbookingid()
        {
            StallBooking147Sql().Should().Contain("AND sb.stallbookingid <> p_stallbookingid");
        }

        [Fact]
        public void SecretaryUpdateStallBooking_147_skips_horse_overlap_validation_for_tack()
        {
            string sql = StallBooking147Sql();

            int checkAt = sql.IndexOf(
                "-- Reject an overlapping horse booking for the resulting horseid.",
                StringComparison.Ordinal);
            int applyUpdatesAt = sql.IndexOf("-- Apply updates", StringComparison.Ordinal);

            checkAt.Should().BeGreaterThan(-1);
            applyUpdatesAt.Should().BeGreaterThan(checkAt);

            string checkBlock = sql.Substring(checkAt, applyUpdatesAt - checkAt);

            // The whole overlap-check block is gated by p_horseid IS NOT NULL —
            // a tack booking (p_horseid NULL) never reaches the EXISTS query.
            checkBlock.Should().Contain("IF p_horseid IS NOT NULL THEN");
        }

        [Fact]
        public void SecretaryUpdateStallBooking_147_overlap_predicate_matches_189_exactly()
        {
            string sql147 = StallBooking147Sql();
            string sql189 = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "189_usp_CreateStallBookingChangeRequest.sql");

            // Same shape ported verbatim: horse-bookings-only, same-horse,
            // date overlap via daterange, and excluded when superseded by an
            // approved cancellation. 147 uses this repo's usual UPPERCASE SQL
            // keyword style (matching the rest of that file); 189 is captured
            // verbatim from a live body written entirely lowercase (per this
            // project's own rule to never re-case a captured live proc) — so
            // each side is checked against its OWN casing, not a shared
            // literal, while still proving the same semantic fragments exist
            // in both.
            sql147.Should().Contain("AND sb.isfortack = false");
            sql189.Should().Contain("and sb.isfortack = false");

            sql147.Should().Contain("&& daterange(");
            sql189.Should().Contain("&& daterange(");

            sql147.Should().Contain("AND pcr.iscancelled = true");
            sql189.Should().Contain("and pcr.iscancelled = true");

            sql147.Should().Contain("AND pcr.status = 'Approved'");
            sql189.Should().Contain("and pcr.status = 'Approved'");

            sql147.Should().Contain("'An active overlapping stall booking already exists for this horse'");
            sql189.Should().Contain("'An active overlapping stall booking already exists for this horse'");
        }

        [Fact]
        public void SecretaryCreateStallBookingForPayer_149_checks_overlap_after_the_lock_and_before_any_read_or_write()
        {
            string sql = StallBooking149Sql();

            int lockAt = sql.IndexOf(
                "PERFORM pg_advisory_xact_lock(1735, p_horseid);", StringComparison.Ordinal);
            int overlapCheckAt = sql.IndexOf(
                "-- Reject an overlapping horse booking BEFORE any read or write below.",
                StringComparison.Ordinal);

            lockAt.Should().BeGreaterThan(-1);
            overlapCheckAt.Should().BeGreaterThan(-1);
            lockAt.Should().BeLessThan(overlapCheckAt);
        }

        [Fact]
        public void SecretaryCreateStallBookingForPayer_149_checks_overlap_before_every_read_and_write()
        {
            string sql = StallBooking149Sql();

            int overlapCheckAt = sql.IndexOf(
                "-- Reject an overlapping horse booking BEFORE any read or write below.",
                StringComparison.Ordinal);

            overlapCheckAt.Should().BeGreaterThan(-1);

            // Every subsequent read (competition/secretary/payer/price lookups)
            // and every write (bill/productrequest/billproductrequest/
            // stallbooking/billcharge) must appear strictly AFTER the check —
            // proving no partial financial row can exist on a rejected request.
            string[] laterOperations =
            {
                "SELECT c.hostranchid",
                "FROM public.pricecatalog pc",
                "INSERT INTO public.bill (",
                "INSERT INTO public.productrequest (",
                "INSERT INTO public.billproductrequest (",
                "INSERT INTO public.stallbooking (",
                "INSERT INTO public.billcharge (",
            };

            foreach (string operation in laterOperations)
            {
                int operationAt = sql.IndexOf(operation, StringComparison.Ordinal);
                operationAt.Should().BeGreaterThan(-1, "expected to find {0}", operation);
                overlapCheckAt.Should().BeLessThan(operationAt, "{0} must come after the overlap check", operation);
            }
        }

        [Fact]
        public void SecretaryCreateStallBookingForPayer_149_skips_the_overlap_check_for_tack()
        {
            string sql = StallBooking149Sql();

            int overlapCheckAt = sql.IndexOf(
                "-- Reject an overlapping horse booking BEFORE any read or write below.",
                StringComparison.Ordinal);
            int hostRanchAt = sql.IndexOf("-- Competition + host ranch", StringComparison.Ordinal);

            overlapCheckAt.Should().BeGreaterThan(-1);
            hostRanchAt.Should().BeGreaterThan(overlapCheckAt);

            string checkBlock = sql.Substring(overlapCheckAt, hostRanchAt - overlapCheckAt);

            checkBlock.Should().Contain("IF NOT COALESCE(p_isfortack, FALSE) THEN");

            // Gated exactly twice in the file (once for the pre-existing lock,
            // once for the new check) — both skip tack via the same condition,
            // never a different/looser one.
            int gateOccurrences = 0;
            int index = 0;

            while ((index = sql.IndexOf("IF NOT COALESCE(p_isfortack, FALSE) THEN", index, StringComparison.Ordinal)) != -1)
            {
                gateOccurrences++;
                index += 1;
            }

            gateOccurrences.Should().Be(2);
        }

        [Fact]
        public void SecretaryCreateStallBookingForPayer_149_overlap_predicate_matches_188_exactly()
        {
            string sql149 = StallBooking149Sql();
            string sql188 = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "188_usp_CreateStallBooking.sql");

            string[] sharedFragments =
            {
                "AND sb.isfortack = false",
                "&& daterange(",
                "pcr.productchangerequestid IS NULL",
                "pcr.iscancelled = false",
                "AND pcr.newprequestid IS NULL",
                "'An active overlapping stall booking already exists for this horse'",
            };

            foreach (string fragment in sharedFragments)
            {
                sql149.Should().Contain(fragment, "149 must reuse the exact predicate shape from 188");
            }

            // 188's own predicate uses lowercase (plpgsql body style there);
            // confirm the semantically equivalent lowercase fragments exist
            // in 188 so the "same predicate" claim is checked on both sides,
            // not asserted only against 149's own (uppercase) copy.
            sql188.Should().Contain("pcr.productchangerequestid is null");
            sql188.Should().Contain("pcr.iscancelled = false");
            sql188.Should().Contain("and pcr.newprequestid is null");
            sql188.Should().Contain("'An active overlapping stall booking already exists for this horse'");
        }

        [Fact]
        public void The_stale_147_149_have_no_overlap_validation_claim_no_longer_appears_anywhere()
        {
            string[] filesToCheck =
            {
                "147_usp_SecretaryUpdateStallBooking.sql",
                "149_usp_SecretaryCreateStallBookingForPayer.sql",
                "187_usp_RescheduleCompetition.sql",
                "188_usp_CreateStallBooking.sql",
                "189_usp_CreateStallBookingChangeRequest.sql",
            };

            foreach (string fileName in filesToCheck)
            {
                string sql = ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName);

                sql.Should().NotContain(
                    "have no overlap validation", "the gap this phrase described has been closed in {0}", fileName);
                sql.Should().NotContain(
                    "have NO overlap validation", "the gap this phrase described has been closed in {0}", fileName);
            }
        }

        [Fact]
        public void The_reschedule_header_states_the_promise_is_no_longer_weakened_by_147_149()
        {
            string sql = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "187_usp_RescheduleCompetition.sql");

            sql.Should().Contain("gap is now CLOSED");
            sql.Should().Contain(
                "The reschedule\n--    guarantee is therefore no longer weakened by a sequential (non-\n--    concurrent) double-booking through 147/149");
        }

        [Fact]
        public void All_five_stall_writers_share_lock_key_1735_and_147_149_also_share_the_overlap_predicate_source()
        {
            // Re-affirms §6's count (5 files use 1735) from this section's own
            // vantage point, plus the additional overlap-predicate sharing
            // that only 147/149/188/189 participate in (187's own overlap
            // check uses its own, differently-worded RN001 Hebrew message —
            // see the message-count assertion below — but as of the
            // 2026-08-03 pass in §8, 147/149/188/189's underlying RULE is no
            // longer "same-competition"; it is now the same GLOBAL
            // cross-competition rule 187 has always enforced. Only the
            // message TEXT still differs, not the scope).
            string individualDir = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual"));

            string[] allFiles = Directory.GetFiles(individualDir, "*.sql");

            int filesUsing1735 = allFiles.Count(f => File.ReadAllText(f).Contains("pg_advisory_xact_lock(1735,"));
            filesUsing1735.Should().Be(5);

            int filesWithOverlapMessage = allFiles.Count(
                f => File.ReadAllText(f).Contains(
                    "'An active overlapping stall booking already exists for this horse'"));

            // 147, 149, 188, 189 (187 uses its own, differently-worded
            // cross-competition overlap message).
            filesWithOverlapMessage.Should().Be(4);
        }

        // =================================================================
        // 8. Owner decision (2026-08-03) — the stall-booking horse-overlap
        //    rule is now GLOBAL across competitions in 147/149/188/189,
        //    matching 187's own cross-competition rule (187's own predicate
        //    is untouched by this pass — only its comments changed). These
        //    tests prove the competition-id restriction is gone from each of
        //    the four ordinary writers' overlap predicates, that every other
        //    exclusion/skip/lock behavior proven in §6/§7 is unchanged, and
        //    that 187's own predicate is still intact.
        // =================================================================

        [Theory]
        [InlineData("147_usp_SecretaryUpdateStallBooking.sql", "pr.competitionid = v_competitionid")]
        [InlineData("149_usp_SecretaryCreateStallBookingForPayer.sql", "pr.competitionid = p_competitionid")]
        [InlineData("188_usp_CreateStallBooking.sql", "pr.competitionid = p_competitionid")]
        [InlineData("189_usp_CreateStallBookingChangeRequest.sql", "pr.competitionid = v_original_product_request.competitionid")]
        public void Ordinary_writer_overlap_predicate_no_longer_restricts_to_the_same_competition(
            string fileName, string staleRestriction)
        {
            string sql = ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName);
            sql.Should().NotContain(staleRestriction, "the overlap rule in {0} is now global across competitions", fileName);
        }

        [Fact]
        public void SecretaryUpdateStallBooking_147_overlap_predicate_has_no_competitionid_filter_at_all()
        {
            // 147 is the one file where v_competitionid still exists in scope
            // (fetched for no other current use, deliberately left in place —
            // see the file's own 2026-08-03 header note) — so this asserts
            // more strongly than the theory above: no competitionid
            // comparison of ANY kind appears inside the overlap EXISTS block
            // itself.
            string sql = StallBooking147Sql();

            int checkAt = sql.IndexOf(
                "-- Reject an overlapping horse booking for the resulting horseid.",
                StringComparison.Ordinal);
            int applyUpdatesAt = sql.IndexOf("-- Apply updates", StringComparison.Ordinal);

            checkAt.Should().BeGreaterThan(-1);
            applyUpdatesAt.Should().BeGreaterThan(checkAt);

            string checkBlock = sql.Substring(checkAt, applyUpdatesAt - checkAt);

            checkBlock.Should().NotContain("competitionid");
        }

        [Fact]
        public void All_four_ordinary_writer_overlap_predicates_still_scope_to_the_correct_horseid_only()
        {
            // Global does not mean unscoped — every predicate must still
            // compare against the specific horse in play, never a blanket
            // "any horse" check.
            StallBooking147Sql().Should().Contain("sb.horseid = p_horseid");
            StallBooking149Sql().Should().Contain("sb.horseid = p_horseid");

            ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "188_usp_CreateStallBooking.sql")
                .Should().Contain("sb.horseid = p_horseid");
            ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "189_usp_CreateStallBookingChangeRequest.sql")
                .Should().Contain("sb.horseid = v_original_stall_booking.horseid");
        }

        [Fact]
        public void SecretaryUpdateStallBooking_147_still_excludes_its_own_booking_and_approved_cancellations_after_going_global()
        {
            string sql = StallBooking147Sql();
            sql.Should().Contain("AND sb.stallbookingid <> p_stallbookingid");
            sql.Should().Contain("AND pcr.iscancelled = true");
            sql.Should().Contain("AND pcr.status = 'Approved'");
        }

        [Fact]
        public void CreateStallBookingChangeRequest_189_still_excludes_its_own_booking_and_approved_cancellations_after_going_global()
        {
            string sql = ReadServerFile(
                "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "189_usp_CreateStallBookingChangeRequest.sql");
            sql.Should().Contain("sb.stallbookingid <> p_originalstallbookingid");
            sql.Should().Contain("pcr.iscancelled = true");
            sql.Should().Contain("pcr.status = 'Approved'");
        }

        [Fact]
        public void CreateStallBooking_188_and_SecretaryCreateStallBookingForPayer_149_still_exclude_superseded_change_requests_after_going_global()
        {
            string sql188 = ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "188_usp_CreateStallBooking.sql");
            string sql149 = StallBooking149Sql();

            sql188.Should().Contain("pcr.productchangerequestid is null");
            sql188.Should().Contain("pcr.iscancelled = false");
            sql188.Should().Contain("and pcr.newprequestid is null");

            sql149.Should().Contain("pcr.productchangerequestid IS NULL");
            sql149.Should().Contain("pcr.iscancelled = false");
            sql149.Should().Contain("AND pcr.newprequestid IS NULL");
        }

        [Fact]
        public void Tack_bookings_still_skip_the_now_global_overlap_check_in_all_four_ordinary_writers()
        {
            // Re-affirms §6/§7's tack-skip proofs still hold post-scoping
            // change — the gating conditions themselves were never touched
            // by this pass.
            StallBooking147Sql().Should().Contain("IF p_horseid IS NOT NULL THEN");
            StallBooking149Sql().Should().Contain("IF NOT COALESCE(p_isfortack, FALSE) THEN");

            ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "188_usp_CreateStallBooking.sql")
                .Should().Contain("if p_isfortack = false then");
            ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "189_usp_CreateStallBookingChangeRequest.sql")
                .Should().Contain("if v_original_stall_booking.isfortack = false");
        }

        [Fact]
        public void The_reschedule_sp_187_overlap_predicate_is_unchanged_and_still_cross_competition()
        {
            // 187 was explicitly NOT to change its own rule in this pass —
            // only its comments. Both of its overlap EXISTS blocks
            // (precondition and post-condition) must still carry the
            // cross-competition exclusion.
            string sql = ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "187_usp_RescheduleCompetition.sql");

            int firstAt = sql.IndexOf("other_pr.competitionid <> p_competitionid", StringComparison.Ordinal);
            int secondAt = firstAt < 0
                ? -1
                : sql.IndexOf("other_pr.competitionid <> p_competitionid", firstAt + 1, StringComparison.Ordinal);

            firstAt.Should().BeGreaterThan(-1, "precondition overlap check");
            secondAt.Should().BeGreaterThan(-1, "post-condition overlap check");
        }

        [Fact]
        public void The_187_header_documents_the_2026_08_03_cross_competition_consistency_correction()
        {
            string sql = ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", "187_usp_RescheduleCompetition.sql");
            sql.Should().Contain("UPDATE (2026-08-03, owner decision)");
            sql.Should().Contain("GLOBAL by horseid");
        }

        [Theory]
        [InlineData("147_usp_SecretaryUpdateStallBooking.sql")]
        [InlineData("149_usp_SecretaryCreateStallBookingForPayer.sql")]
        [InlineData("188_usp_CreateStallBooking.sql")]
        [InlineData("189_usp_CreateStallBookingChangeRequest.sql")]
        public void Ordinary_writer_header_documents_the_2026_08_03_global_scoping_correction(string fileName)
        {
            // Checked as two independent substrings rather than one long
            // phrase — the comment text word-wraps differently per file
            // (147/149/188 split "GLOBAL by" / "horseid" across two
            // comment lines; 189 does not), so a single contiguous phrase
            // spanning the wrap point would be a false negative.
            string sql = ReadServerFile("RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName);
            sql.Should().Contain("2026-08-03, owner decision");
            sql.Should().Contain("is now GLOBAL by");
            sql.Should().Contain("across all competitions");
        }

        [Fact]
        public void DROP_FUNCTION_is_documented_as_unnecessary_for_147_and_149_by_the_read_only_dependency_audit()
        {
            // Live pg_depend/pg_rewrite/pg_class/pg_trigger audit (2026-08-03,
            // read-only, Supabase project sxplumrexbolpwqacpiz) found ZERO
            // dependent objects and zero other function bodies referencing
            // either proc by name, and neither signature changes on this
            // branch (same params, same types, same order, same RETURNS).
            // CREATE OR REPLACE FUNCTION alone is sufficient for deployment.
            // This test pins that both files still declare their DROP
            // statement in the repo (kept only as the existing file
            // convention — see rule 2 in the ride-on-system-knowledge skill —
            // not executed as part of the deployment plan) with the exact
            // live-confirmed signature, so a future signature drift cannot
            // silently desync repo from live without this test failing.
            // 147/149 are pre-existing files that carry CRLF line endings
            // (git-normalized on Windows checkout, same as this repo's JS
            // files) -- unlike 187/188/189, which are new-this-engagement
            // and LF-only. Normalize before comparing so the check is
            // endian-agnostic rather than silently depending on which line
            // ending happens to be checked out.
            string sql147 = StallBooking147Sql().Replace("\r\n", "\n");
            string sql149 = StallBooking149Sql().Replace("\r\n", "\n");

            sql147.Should().Contain(
                "DROP FUNCTION IF EXISTS public.usp_secretaryupdatestallbooking(\n    integer, integer, date, date, text, boolean, integer\n);");
            sql149.Should().Contain(
                "DROP FUNCTION IF EXISTS public.usp_secretarycreatestallbookingforpayer(\n    integer, integer, integer, integer, date, date, boolean, smallint, text\n);");
        }
    }
}
