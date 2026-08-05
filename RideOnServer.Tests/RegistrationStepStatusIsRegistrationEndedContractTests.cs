using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL.DTOs.RegistrationStepStatus;

namespace RideOnServer.Tests
{
    // Stage A: adds a distinct, independent IsRegistrationEnded signal to
    // usp_GetRegistrationStepStatus, appended last on the RETURNS TABLE (a
    // shape change, so DROP+CREATE, not CREATE OR REPLACE). IsCompetitionEnded
    // must be completely unaffected -- same computation, same column position.
    //
    // No mocking framework and no HTTP test host exist in this project (see
    // HealthCertificateApprovalContractTests), and the actual boundary/null
    // logic for this field lives entirely in SQL, not C# -- RegistrationStepStatus's
    // own doc comment states nothing here is derived further on the server. So
    // this file proves the contract the same two ways already established
    // there: reflection over the DTO's public shape, and bounded source-text
    // assertions over the real DAL and proc files -- extended naturally to the
    // .sql source, which is the only place the boundary rule itself exists.
    public class RegistrationStepStatusIsRegistrationEndedContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "RegistrationStepStatusDAL.cs"));

            File.Exists(path).Should().BeTrue("RegistrationStepStatusDAL.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string ProcSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                    "220_usp_GetRegistrationStepStatus.sql"));

            File.Exists(path).Should().BeTrue("220_usp_GetRegistrationStepStatus.sql was expected at {0}", path);

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
        // 1. DTO shape.
        // =================================================================

        [Fact]
        public void The_dto_exposes_a_nullable_bool_isregistrationended_property()
        {
            PropertyInfo? property = typeof(RegistrationStepStatus).GetProperty("IsRegistrationEnded");

            property.Should().NotBeNull("the DTO must expose the new field");
            property!.PropertyType.Should().Be(typeof(bool?), "every other field on this DTO is nullable too");
        }

        [Fact]
        public void The_dto_still_exposes_iscompetitionended_unchanged()
        {
            PropertyInfo? property = typeof(RegistrationStepStatus).GetProperty("IsCompetitionEnded");

            property.Should().NotBeNull();
            property!.PropertyType.Should().Be(typeof(bool?));
        }

        // =================================================================
        // 2. DAL reads the new column via the existing absent-column-tolerant
        //    pattern, not a hard read that would throw against an
        //    un-migrated DB.
        // =================================================================

        [Fact]
        public void The_dal_reads_isregistrationended_via_the_tolerant_readoptionalbool_helper()
        {
            string source = DalSource();

            source.Should().Contain(
                "IsRegistrationEnded = ReadOptionalBool(reader, \"isregistrationended\")",
                "the field must go through the same HasColumn-guarded reader as every existing field, " +
                "so a deploy-order mismatch degrades to null instead of throwing");
        }

        [Fact]
        public void The_dal_still_reads_iscompetitionended_unchanged()
        {
            DalSource().Should().Contain(
                "IsCompetitionEnded = ReadOptionalBool(reader, \"iscompetitionended\")");
        }

        // =================================================================
        // 3. Proc: shape change requires DROP + CREATE, not CREATE OR REPLACE.
        // =================================================================

        [Fact]
        public void The_proc_uses_drop_and_create_not_create_or_replace()
        {
            string source = ProcSource();

            source.Should().Contain(
                "DROP FUNCTION IF EXISTS public.usp_getregistrationstepstatus(integer, integer, integer);",
                "adding an output column changes the return type and cannot be done via CREATE OR REPLACE");

            source.Should().NotContain(
                "CREATE OR REPLACE FUNCTION public.usp_getregistrationstepstatus",
                "this specific migration must not silently fall back to REPLACE semantics");
        }

        // =================================================================
        // 4. isregistrationended is appended LAST in both the RETURNS TABLE
        //    column list and the final SELECT -- never inserted in the middle.
        // =================================================================

        [Fact]
        public void Isregistrationended_is_the_last_column_in_returns_table()
        {
            string source = ProcSource();

            int returnsAt = source.IndexOf("RETURNS TABLE(", StringComparison.Ordinal);
            returnsAt.Should().BeGreaterThan(-1);

            // Search from AFTER returnsAt -- the file's own header comment
            // (line 31) contains the literal text "LANGUAGE sql" too, so an
            // unscoped IndexOf would match that instead of the real
            // declaration below RETURNS TABLE.
            int languageAt = source.IndexOf("LANGUAGE sql", returnsAt, StringComparison.Ordinal);

            languageAt.Should().BeGreaterThan(-1);
            languageAt.Should().BeGreaterThan(returnsAt);

            string columnList = source.Substring(returnsAt, languageAt - returnsAt);

            // The last column name appearing before the closing paren must be
            // isregistrationended -- proven by it being the last line with a
            // trailing "boolean" and no comma. Trim both the closing ")" and
            // any trailing whitespace/CRLF so this is independent of the
            // file's actual line-ending convention.
            columnList.TrimEnd().TrimEnd(')').TrimEnd().Should().EndWith("isregistrationended boolean");
        }

        [Fact]
        public void Isregistrationended_is_the_last_selected_column()
        {
            string source = ProcSource();

            int selectAt = source.LastIndexOf("SELECT", StringComparison.Ordinal);
            int fromAt = source.IndexOf("FROM signals;", StringComparison.Ordinal);

            selectAt.Should().BeGreaterThan(-1);
            fromAt.Should().BeGreaterThan(selectAt);

            string finalSelect = source.Substring(selectAt, fromAt - selectAt);

            finalSelect.TrimEnd().Should().EndWith("signals.isregistrationended");
        }

        // =================================================================
        // 5. iscompetitionended's own computation is byte-for-byte unchanged
        //    -- proves the new field was added alongside it, not by modifying it.
        // =================================================================

        [Fact]
        public void Iscompetitionended_computation_is_unchanged_and_appears_exactly_once()
        {
            string source = ProcSource();

            string expected =
                "(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > comp.competitionenddate AS iscompetitionended";

            CountOccurrences(source, expected).Should().Be(
                1, "iscompetitionended must still be computed from competitionenddate only, exactly as before");
        }

        // =================================================================
        // 6. The isregistrationended CASE expression implements the exact
        //    three-branch rule -- proven textually, since the boundary logic
        //    itself lives entirely in SQL with no C#-side counterpart to unit
        //    test directly.
        // =================================================================

        [Fact]
        public void Isregistrationended_case_expression_implements_the_exact_three_branch_rule()
        {
            string source = ProcSource();

            source.Should().Contain("WHEN comp.registrationenddate IS NOT NULL");
            source.Should().Contain(
                "THEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date > comp.registrationenddate");
            source.Should().Contain("WHEN comp.competitionstartdate IS NOT NULL");
            source.Should().Contain(
                "THEN (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jerusalem')::date >= comp.competitionstartdate");
            source.Should().Contain("ELSE false");
        }

        [Fact]
        public void The_comp_cte_selects_registrationenddate_and_competitionstartdate()
        {
            // Without these two columns in the comp CTE's own SELECT, the CASE
            // expression above could not reference them at all.
            string source = ProcSource();

            source.Should().Contain("c.registrationenddate, c.competitionstartdate");
        }
    }
}
