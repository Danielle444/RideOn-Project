using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // Blocker 2 (2026-08-07): source-text coverage of the NEW (not yet applied
    // live) usp_GetStallAssignmentsForCompetitionPayer proc file. This project
    // has no DB test harness / mocking framework (same convention as every
    // other *Tests.cs file here) so these tests read the real .sql file and
    // assert on its structure -- the two invariants that matter and ARE
    // provable statically:
    //   1. Ownership can never multiply a stallassignment row (no direct
    //      billcharge join on the per-row select; ownership is pre-aggregated
    //      to at most one row per stallbookingid via a DISTINCT CTE, joined
    //      once).
    //   2. The safe/redacted column set is exact -- no StallBookingId,
    //      BookingRanchId, BookingRanchName, ProductName, or HorseId ever
    //      leaves the proc, and HorseName/BarnName are gated behind the
    //      ownership CTE via CASE WHEN (NULL at the SQL layer, not just
    //      hidden by the app, whenever the stall isn't the caller's own).
    public class StallAssignmentsPayerMapProcedureTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ProcedureSource()
        {
            string path = Path.GetFullPath(Path.Combine(
                TestSourceDirectory(),
                "..",
                "RideOnDB",
                "StoredProcedures",
                "PostgreSQL",
                "Individual",
                "244_usp_GetStallAssignmentsForCompetitionPayer.sql"));

            File.Exists(path).Should().BeTrue("expected file at {0}", path);

            return File.ReadAllText(path).ToLowerInvariant();
        }

        [Fact]
        public void Procedure_NeverJoinsBillchargeDirectlyOntoTheAssignmentRow()
        {
            string sql = ProcedureSource();

            // The only allowed appearance of "billcharge" is inside the CTE's
            // own FROM clause (pre-aggregated to one row per stallbookingid
            // BEFORE it ever touches stallassignment). A direct
            // `left join public.billcharge` (or any join) onto the main
            // select would multiply rows for a stallbooking backed by more
            // than one matching billcharge row.
            sql.Should().NotContain("join public.billcharge");
            sql.Should().Contain("from public.billcharge bc");
        }

        [Fact]
        public void Procedure_PreAggregatesOwnershipToOneRowPerStallBookingViaDistinct()
        {
            string sql = ProcedureSource();

            sql.Should().Contain("with payer_owned_stallbookings as (");
            sql.Should().Contain("select distinct bc.sourceid as stallbookingid");

            int cteAt = sql.IndexOf("with payer_owned_stallbookings as (", StringComparison.Ordinal);
            int mainSelectAt = sql.IndexOf("select\n        sa.assignmentid", StringComparison.Ordinal);

            cteAt.Should().BeGreaterThan(-1);
            mainSelectAt.Should().BeGreaterThan(-1);
            cteAt.Should().BeLessThan(mainSelectAt, "ownership must be pre-aggregated before the main assignment select");
        }

        [Fact]
        public void Procedure_JoinsThePreAggregatedOwnershipCteExactlyOnceAsALeftJoin()
        {
            string sql = ProcedureSource();

            sql.Should().Contain("left join payer_owned_stallbookings pos");
            sql.Should().Contain("on pos.stallbookingid = sb.stallbookingid");

            int occurrences = 0;
            int from = 0;
            while (true)
            {
                int idx = sql.IndexOf("left join payer_owned_stallbookings", from, StringComparison.Ordinal);
                if (idx < 0) break;
                occurrences++;
                from = idx + 1;
            }

            occurrences.Should().Be(1, "the ownership CTE must be joined exactly once, never once per output column");
        }

        [Fact]
        public void Procedure_OwnershipPredicateMatchesTheProvenPayerAccountDefinition_ExactlyLikeProc212()
        {
            string sql = ProcedureSource();

            // Same ownership rule as usp_GetPayerCompetitionAccount's
            // stall_items/product_charge_summary CTEs (212_usp_...sql) - not a
            // new or guessed definition.
            sql.Should().Contain("bc.sourcetype = 'productrequest'");
            sql.Should().Contain("bc.categorykey = 'stalls'");
            sql.Should().Contain("bc.paidbypersonid = p_payerpersonid");
            sql.Should().Contain("bc.chargestatus in ('open', 'paid')");
        }

        [Fact]
        public void Procedure_OwnershipCteIsHardenedToTheSameCompetitionId_ClarityNotCorrectness()
        {
            string sql = ProcedureSource();

            // Hardening (2026-08-07): never exploitable on its own (the outer
            // query's own `where sa.competitionid = p_competitionid` already
            // limits every returned row, and stallbookingid is a globally
            // unique PK), but makes the CTE's own scope self-evidently
            // competition-bound and shrinks its scan.
            sql.Should().Contain("bc.competitionid = p_competitionid");

            int cteAt = sql.IndexOf("with payer_owned_stallbookings as (", StringComparison.Ordinal);
            int cteCloseAt = sql.IndexOf(")\n    select\n        sa.assignmentid", StringComparison.Ordinal);
            int competitionFilterAt = sql.IndexOf("bc.competitionid = p_competitionid", cteAt, StringComparison.Ordinal);

            cteAt.Should().BeGreaterThan(-1);
            competitionFilterAt.Should().BeGreaterThan(-1);
            cteCloseAt.Should().BeGreaterThan(-1);
            competitionFilterAt.Should().BeInRange(cteAt, cteCloseAt, "the competitionid filter must live inside the ownership CTE, not the outer query");
        }

        [Fact]
        public void Procedure_ReturnsOnlyTheApprovedSafeColumnSet()
        {
            string sql = ProcedureSource();

            int returnsAt = sql.IndexOf("returns table(", StringComparison.Ordinal);
            int languageAt = sql.IndexOf("language plpgsql", returnsAt, StringComparison.Ordinal);
            returnsAt.Should().BeGreaterThan(-1);
            languageAt.Should().BeGreaterThan(returnsAt);

            string returnsClause = sql.Substring(returnsAt, languageAt - returnsAt);

            returnsClause.Should().Contain("\"assignmentid\" integer");
            returnsClause.Should().Contain("\"compoundid\" smallint");
            returnsClause.Should().Contain("\"stallid\" smallint");
            returnsClause.Should().Contain("\"stallnumber\" text");
            returnsClause.Should().Contain("\"isoccupied\" boolean");
            returnsClause.Should().Contain("\"ismine\" boolean");
            returnsClause.Should().Contain("\"isfortack\" boolean");
            returnsClause.Should().Contain("\"horsename\" text");
            returnsClause.Should().Contain("\"barnname\" text");

            // Deliberately excluded -- each identifies another participant or
            // ranch and is never needed to render occupied/mine/tack.
            returnsClause.Should().NotContain("stallbookingid");
            returnsClause.Should().NotContain("bookingranchid");
            returnsClause.Should().NotContain("bookingranchname");
            returnsClause.Should().NotContain("productname");
            returnsClause.Should().NotContain("horseid");
        }

        [Fact]
        public void Procedure_HardcodesIsOccupiedTrue_NeverReadsAnOccupiedColumn()
        {
            string sql = ProcedureSource();

            // Every row here comes from stallassignment -- an empty stall has
            // no row at all, so "occupied" is a constant true for every row
            // this proc can ever return, never a computed/read flag.
            sql.Should().Contain("true::boolean as \"isoccupied\"");
        }

        [Fact]
        public void Procedure_GatesHorseNameAndBarnNameOnOwnership_NullAtTheSqlLayerWhenNotMine()
        {
            string sql = ProcedureSource();

            sql.Should().Contain("case when pos.stallbookingid is not null then h.horsename::text else null end as \"horsename\"");
            sql.Should().Contain("case when pos.stallbookingid is not null then h.barnname::text else null end as \"barnname\"");
        }

        [Fact]
        public void Procedure_IsForTackIsNeverGatedByOwnership_TackStatusCarriesNoIdentity()
        {
            string sql = ProcedureSource();

            // sb.isfortack is selected unconditionally (no CASE WHEN ownership
            // guard) - a stall type flag is safe to expose for every
            // occupied stall, mine or not.
            sql.Should().Contain("sb.isfortack::boolean as \"isfortack\"");
        }

        [Fact]
        public void Procedure_KeysOrderingByCompoundThenStallNumber_MatchesTheAdminProcConvention()
        {
            string sql = ProcedureSource();

            sql.Should().Contain("order by\n        sa.compoundid,\n        s.stallnumber;");
        }

        [Fact]
        public void Procedure_TakesCompetitionIdAndPayerPersonIdOnly_NeverARanchIdOrHorseIdParameter()
        {
            string sql = ProcedureSource();

            sql.Should().Contain("usp_getstallassignmentsforcompetitionpayer(p_competitionid integer, p_payerpersonid integer)");
        }
    }
}
