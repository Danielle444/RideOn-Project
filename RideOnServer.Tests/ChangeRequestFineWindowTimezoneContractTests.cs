using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // fix/federation-fine-window-timezone-complete: usp_answerchangeentryrequestsecured
    // (221, the write/approval path) and usp_getsecretarycompetitionchangerequests
    // (179, the read/preview path shown to the secretary before answering) both
    // computed the EntryCancellation/LateRegistration fine-eligibility window with a
    // bare requestdatetime::date cast. requestdatetime is timestamp with time zone;
    // registrationenddate/competitionstartdate are plain date. Casting straight to
    // ::date resolves in the DB's UTC session timezone, not Israel's, so a request
    // made after ~21:00-22:00 UTC (post-DST-adjusted local evening) can land on the
    // wrong side of the registration-end/competition-start boundary in 179's preview
    // vs. what 221 actually charges on approval.
    //
    // Fix follows the exact convention already used elsewhere in this repo (see
    // RescheduleCompetitionContractTests's businessdate test and
    // usp_secretarydeleteentry/usp_admincreateentry/usp_admineditentry):
    // (requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date.
    //
    // Proc 210 (usp_answerchangeentryrequest) is proven-dead legacy (zero C# callers,
    // zero DB-internal callers, zero trigger callers - see the 2026-08-08 dependency
    // audit) and is deliberately left untouched; its own copy of this bug is not
    // fixed here.
    public class ChangeRequestFineWindowTimezoneContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string SqlFile(string fileName)
        {
            string path = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName));

            File.Exists(path).Should().BeTrue("expected file at {0}", path);

            // Repo SQL files are CRLF on disk; normalize so embedded expected
            // snippets in this file (written with plain \n) match regardless of
            // the checkout's line-ending configuration.
            return File.ReadAllText(path).Replace("\r\n", "\n");
        }

        private const string Proc221File = "221_usp_AnswerChangeEntryRequestSecured.sql";
        private const string Proc179File = "179_usp_GetSecretaryCompetitionChangeRequests.sql";
        private const string Proc210File = "210_usp_AnswerChangeEntryRequest.sql";

        // =====================================================================
        // 221 (write/approval path) - all five fine-window comparisons
        // =====================================================================

        [Fact]
        public void Proc221_EntryCancellation_BetweenWindow_UsesIsraelLocalDate()
        {
            string sql = SqlFile(Proc221File);

            sql.Should().Contain(
                "and (v_requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date > v_registrationenddate\n" +
                "              and (v_requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < v_competitionstartdate\n" +
                "            order by f.fineamount desc",
                "the EntryCancellation 'Between RegistrationEnd/CompetitionStart' window must resolve in Israel local time");
        }

        [Fact]
        public void Proc221_LateRegistration_BetweenWindow_UsesIsraelLocalDate()
        {
            string sql = SqlFile(Proc221File);

            sql.Should().Contain(
                "and (v_requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date > v_registrationenddate\n" +
                "                        and (v_requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < v_competitionstartdate\n" +
                "                    )",
                "the LateRegistration 'Between' window must resolve in Israel local time");
        }

        [Fact]
        public void Proc221_LateRegistration_AfterWindow_UsesIsraelLocalDate()
        {
            string sql = SqlFile(Proc221File);

            sql.Should().Contain(
                "and (v_requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date >= v_competitionstartdate",
                "the LateRegistration 'After CompetitionStart' window must resolve in Israel local time");
        }

        [Fact]
        public void Proc221_FineWindowSection_HasNoRemainingBareDateCast()
        {
            string sql = SqlFile(Proc221File);
            string functionBody = sql.Substring(sql.IndexOf("AS $function$", StringComparison.Ordinal));

            // Every executable occurrence of requestdatetime::date must now be
            // wrapped in the Israel-local conversion - the 5 fine-window casts, and
            // the pre-existing v_is_rule1 Rule 1/Rule 2 cast (already fixed in an
            // earlier slice), which is also wrapped.
            functionBody.Should().NotContain("v_requestdatetime::date");
        }

        // =====================================================================
        // 179 (read/preview path) - all nine fine-window comparisons
        // =====================================================================

        [Fact]
        public void Proc179_AmountAfter_CaseExpression_UsesIsraelLocalDateForAllThreeBranches()
        {
            string sql = SqlFile(Proc179File);

            sql.Should().Contain(
                "when cer.iscancelled = true\n" +
                "                 and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date <= c.registrationenddate then\n" +
                "                0",
                "the pre-registration-end preview branch must resolve in Israel local time");

            sql.Should().Contain(
                "when cer.iscancelled = true\n" +
                "                 and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date > c.registrationenddate\n" +
                "                 and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < c.competitionstartdate then",
                "the between-window preview branch must resolve in Israel local time");

            sql.Should().Contain(
                "when cer.iscancelled = true\n" +
                "                 and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date >= c.competitionstartdate then",
                "the post-competition-start preview branch must resolve in Israel local time");
        }

        [Fact]
        public void Proc179_EffectiveFineLateralJoin_UsesIsraelLocalDateForAllWindows()
        {
            string sql = SqlFile(Proc179File);

            sql.Should().Contain(
                "and f.endevent = 'CompetitionStart'\n" +
                "                    and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date > c.registrationenddate\n" +
                "                    and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < c.competitionstartdate\n" +
                "                )",
                "the lateral EntryCancellation window must resolve in Israel local time");

            sql.Should().Contain(
                "and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date > c.registrationenddate\n" +
                "                            and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date < c.competitionstartdate\n" +
                "                        )",
                "the lateral LateRegistration 'Between' window must resolve in Israel local time");

            sql.Should().Contain(
                "and (cer.requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date >= c.competitionstartdate",
                "the lateral LateRegistration 'After' window must resolve in Israel local time");
        }

        [Fact]
        public void Proc179_HasNoRemainingBareRequestDatetimeDateCast()
        {
            string sql = SqlFile(Proc179File);

            sql.Should().NotContain("cer.requestdatetime::date");
        }

        [Fact]
        public void Proc179_UnrelatedProductRequestDateColumn_WasNotTouched()
        {
            string sql = SqlFile(Proc179File);

            // pcr.requestdate belongs to a different table (productchangerequest,
            // not changeentryrequest) and a different feature slice - out of scope.
            sql.Should().Contain("pcr.requestdate as \"RequestDate\",");
        }

        [Fact]
        public void Proc179_ReturnedColumnsAndShapeAreUnchanged()
        {
            string sql = SqlFile(Proc179File);

            sql.Should().Contain(
                "RETURNS TABLE(\"RequestId\" integer, \"RequestSource\" text, \"RequestType\" text, " +
                "\"CompetitionId\" integer, \"CompetitionName\" text, \"RequestDate\" timestamp with time zone, " +
                "\"RequestedByPersonId\" integer, \"RequestedByName\" text, \"EntityType\" text, \"EntityName\" text, " +
                "\"BeforeText\" text, \"AfterText\" text, \"Status\" text, \"IsCancelled\" boolean, " +
                "\"OriginalEntityId\" integer, \"NewEntityId\" integer, \"FineId\" integer, " +
                "\"FineAmountSnapshot\" numeric, \"AmountBefore\" numeric, \"AmountAfter\" numeric)",
                "the 20-column result shape must be byte-for-byte unchanged");
        }

        // =====================================================================
        // 210 - proven-dead legacy, must remain byte-for-byte untouched
        // =====================================================================

        [Fact]
        public void Proc210_RemainsUnmodifiedLegacy_StillBareAndStillFourArguments()
        {
            string sql = SqlFile(Proc210File);

            sql.Should().Contain(
                "CREATE OR REPLACE FUNCTION public.usp_answerchangeentryrequest(\n" +
                "    p_changeentryrequestid   integer,\n" +
                "    p_answerstatus           text,\n" +
                "    p_answeredbysystemuserid integer,\n" +
                "    p_notes                  text DEFAULT NULL::text\n" +
                ")");

            // Deliberately still bare - 210 is proven-unreachable dead code (zero C#
            // callers, zero DB-internal callers, zero trigger callers). Fixing its
            // copy of the bug is out of scope; its removal is a separate future task.
            // 6, not 5: the 5 fine-window comparisons shared with 221's pre-fix
            // shape, plus one extra ("elsif v_requestdatetime::date <=
            // v_registrationenddate") that only exists in 210 - 221's equivalent
            // branch collapsed to a plain else and never had this comparison.
            System.Text.RegularExpressions.Regex.Matches(sql, "v_requestdatetime::date")
                .Count
                .Should()
                .Be(6, "210's fine-window casts must remain exactly as they were before this fix");

            sql.Should().NotContain("fix/federation-fine-window-timezone");
        }

        // =====================================================================
        // Cross-proc agreement - 179 (preview) and 221 (approval) must resolve
        // the identical Israel-local business date for the identical inputs.
        // =====================================================================

        [Fact]
        public void Proc179And221_UseByteIdenticalTimezoneConversionExpression()
        {
            string sql179 = SqlFile(Proc179File);
            string sql221 = SqlFile(Proc221File);

            // Different row-source alias (cer. vs v_), same conversion. Both must use
            // exactly "AT TIME ZONE 'Asia/Jerusalem')::date" - not a different IANA
            // spelling, not a different offset literal, not TIMEZONE() function-call
            // syntax - so the two procs can never silently drift into disagreement.
            const string conversionSuffix = "AT TIME ZONE 'Asia/Jerusalem')::date";

            sql179.Should().Contain(conversionSuffix);
            sql221.Should().Contain(conversionSuffix);

            sql179.Should().NotContain("AT TIME ZONE 'Israel'");
            sql221.Should().NotContain("AT TIME ZONE 'Israel'");
            sql179.Should().NotContain("Israel Standard Time");
            sql221.Should().NotContain("Israel Standard Time");
        }

        public enum FineWindow
        {
            NoFine,
            BetweenRegistrationEndAndCompetitionStart,
            OnOrAfterCompetitionStart
        }

        // Reproduces the exact <=, >&&<, >= classification both 179's case
        // expression/lateral join and 221's fine-lookup now share, given the
        // Israel-local business date both procs compute.
        private static FineWindow ClassifyWindow(
            DateOnly businessDate, DateOnly registrationEndDate, DateOnly competitionStartDate)
        {
            if (businessDate <= registrationEndDate)
            {
                return FineWindow.NoFine;
            }

            if (businessDate < competitionStartDate)
            {
                return FineWindow.BetweenRegistrationEndAndCompetitionStart;
            }

            return FineWindow.OnOrAfterCompetitionStart;
        }

        [Theory]
        // registrationenddate, competitionstartdate, requestdatetime (UTC), expected Israel business date, expected window, expect the bare-UTC cast to land in a DIFFERENT (wrong) window, scenario label
        [InlineData("2026-08-10", "2026-08-20", "2026-08-10T22:00:00Z", "2026-08-11",
            FineWindow.BetweenRegistrationEndAndCompetitionStart, true,
            "user-specified-style boundary case: 22:00 UTC is 01:00 IDT next day, crossing registrationenddate - " +
            "bare UTC cast wrongly reports NoFine (date == registrationenddate) while Israel-local correctly reports Between")]
        [InlineData("2026-08-01", "2026-08-11", "2026-08-10T22:00:00Z", "2026-08-11",
            FineWindow.OnOrAfterCompetitionStart, true,
            "between-to-after-start rollover: 22:00 UTC crosses midnight IDT past competitionstartdate - " +
            "bare UTC cast wrongly reports Between while Israel-local correctly reports OnOrAfterCompetitionStart")]
        [InlineData("2026-06-01", "2026-06-30", "2026-06-15T10:00:00Z", "2026-06-15",
            FineWindow.BetweenRegistrationEndAndCompetitionStart, false,
            "normal daytime request - UTC and Israel calendar date agree, no flip")]
        [InlineData("2026-08-10", "2026-08-15", "2026-08-05T12:00:00Z", "2026-08-05",
            FineWindow.NoFine, false,
            "before registration end, midday UTC, no flip")]
        [InlineData("2026-08-01", "2026-08-15", "2026-08-20T12:00:00Z", "2026-08-20",
            FineWindow.OnOrAfterCompetitionStart, false,
            "on/after competition start, midday UTC, no flip")]
        public void IsraelLocalDate_MatchesTheExpressionBothProcsNowShare(
            string registrationEndDate,
            string competitionStartDate,
            string requestDateTimeUtc,
            string expectedIsraelBusinessDate,
            FineWindow expectedWindow,
            bool expectBareUtcCastToMisclassify,
            string scenario)
        {
            // Pure arithmetic reproduction of what
            // (requestdatetime AT TIME ZONE 'Asia/Jerusalem')::date computes in
            // Postgres, using .NET's own IANA tzdata (no DB connection, no live
            // data). This is the ground truth both 179's preview and 221's approval
            // must now agree on for the same requestdatetime.
            TimeZoneInfo israel = TimeZoneInfo.FindSystemTimeZoneById("Asia/Jerusalem");

            DateTimeOffset requestDateTime = DateTimeOffset.Parse(
                requestDateTimeUtc,
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal
                    | System.Globalization.DateTimeStyles.AdjustToUniversal);

            DateTime israelLocal = TimeZoneInfo.ConvertTime(requestDateTime, israel).DateTime;
            DateOnly actualBusinessDate = DateOnly.FromDateTime(israelLocal);

            actualBusinessDate.Should().Be(
                DateOnly.Parse(expectedIsraelBusinessDate, System.Globalization.CultureInfo.InvariantCulture),
                scenario);

            DateOnly registrationEnd = DateOnly.Parse(registrationEndDate, System.Globalization.CultureInfo.InvariantCulture);
            DateOnly competitionStart = DateOnly.Parse(competitionStartDate, System.Globalization.CultureInfo.InvariantCulture);

            // This is the acceptance criterion from section 7: for the same
            // requestdatetime and competition dates, 179's preview classification
            // and 221's approval classification must land in the same window. Both
            // procs now run this exact <=, >&&<, >= comparison against the same
            // Israel-local business date, so a single classification here stands in
            // for both.
            FineWindow israelLocalWindow = ClassifyWindow(actualBusinessDate, registrationEnd, competitionStart);
            israelLocalWindow.Should().Be(expectedWindow, scenario);

            // Proves the fix actually changes behavior (not just cosmetics): the
            // bare (pre-fix) UTC-anchored cast must classify the flip scenarios
            // into the WRONG window relative to the correct Israel-local
            // classification above.
            DateOnly bareUtcDate = DateOnly.FromDateTime(requestDateTime.UtcDateTime);
            FineWindow bareUtcWindow = ClassifyWindow(bareUtcDate, registrationEnd, competitionStart);

            if (expectBareUtcCastToMisclassify)
            {
                bareUtcWindow.Should().NotBe(
                    israelLocalWindow,
                    "this scenario exists specifically because the bare UTC cast and the Israel-local cast " +
                    "classify the same request into different fine windows - that's the bug the fix closes");
            }
            else
            {
                bareUtcWindow.Should().Be(
                    israelLocalWindow,
                    "away from the midnight boundary, both casts must agree - the fix must not change behavior here");
            }
        }
    }
}
