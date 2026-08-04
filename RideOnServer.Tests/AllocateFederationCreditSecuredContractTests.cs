using System.Runtime.CompilerServices;
using FluentAssertions;

namespace RideOnServer.Tests
{
    // Closes a cross-competition authorization gap on the legacy single-charge
    // allocation path: the Controller authorizes the caller against
    // request.CompetitionId, but that value was never forwarded past the C#
    // layer - usp_allocatefederationcredittocharge (193) has no competition
    // parameter and only checks that the selected credit's and charge's own
    // competitions match each other, never the caller's authorized one.
    //
    // usp_allocatefederationcredittochargesecured (226) is a thin,
    // competition-scoped wrapper that re-confirms (under lock) the credit and
    // charge both belong to the caller's authorized competition before
    // delegating the actual write to 193 unchanged. This file is DB-free,
    // matching BulkAllocateFederationCreditContractTests: no mocking
    // framework and no HTTP test host exist in this project, so it proves the
    // C# contract only via bounded source-text assertions against the DAL and
    // both Stored Procedure files. The wrapper's own atomicity, lock order,
    // and scoping behavior are proven separately, live, in a rolled-back
    // transaction as part of this change's DB verification - not duplicated
    // here.
    //
    // Deliberately NOT asserted: "zero references to usp_allocatefederation-
    // credittocharge in the repository" - 193 remains the internal write
    // primitive, called by name from inside 226 (required, tested explicitly
    // below) and referenced in documentation comments elsewhere. What matters
    // is which callers use the scoped wrapper versus the unscoped primitive,
    // not blanket absence of the primitive's name.
    public class AllocateFederationCreditSecuredContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "CompetitionPaymentDAL.cs"));

            File.Exists(path).Should().BeTrue("CompetitionPaymentDAL.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string SecuredWrapperSqlSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                    "226_usp_AllocateFederationCreditToChargeSecured.sql"));

            File.Exists(path).Should().BeTrue("226_usp_AllocateFederationCreditToChargeSecured.sql was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string BulkAllocateSqlSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                    "225_usp_BulkAllocateFederationCreditToCharges.sql"));

            File.Exists(path).Should().BeTrue("225_usp_BulkAllocateFederationCreditToCharges.sql was expected at {0}", path);

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
        // DAL: the legacy single-charge method now targets the secured
        // wrapper, forwards CompetitionId, and remains a single round trip.
        // =================================================================

        private static string DalAllocateMethodBody()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public AllocateFederationCreditResponse AllocateFederationCreditToCharge(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "AllocateFederationCreditToCharge was expected in CompetitionPaymentDAL");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "catch (NpgsqlException ex)",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_dal_calls_the_secured_wrapper_not_the_unscoped_function_directly()
        {
            string body = DalAllocateMethodBody();

            body.Should().Contain("public.usp_allocatefederationcredittochargesecured(");
            body.Should().NotContain("usp_allocatefederationcredittocharge(");
        }

        [Fact]
        public void The_dal_binds_competition_id_from_the_request()
        {
            string body = DalAllocateMethodBody();

            body.Should().Contain("\"@competitionId\"");
            body.Should().Contain("request.CompetitionId");
        }

        [Fact]
        public void The_dal_still_binds_every_original_allocation_parameter()
        {
            string body = DalAllocateMethodBody();

            body.Should().Contain("\"@federationExternalCreditId\"");
            body.Should().Contain("request.FederationExternalCreditId");
            body.Should().Contain("\"@billChargeId\"");
            body.Should().Contain("request.BillChargeId");
            body.Should().Contain("\"@allocatedAmount\"");
            body.Should().Contain("request.AllocatedAmount");
            body.Should().Contain("\"@allocatedBySystemUserId\"");
            body.Should().Contain("request.AllocatedBySystemUserId");
            body.Should().Contain("\"@notes\"");
        }

        [Fact]
        public void The_dal_makes_exactly_one_round_trip()
        {
            string body = DalAllocateMethodBody();

            CountOccurrences(body, "Connect(\"DefaultConnection\")")
                .Should().Be(1, "the secured allocation must remain a single round trip, no C# pre-query");

            CountOccurrences(body, "ExecuteReader()")
                .Should().Be(1);
        }

        [Fact]
        public void The_dal_does_not_gain_a_loop_or_a_second_command()
        {
            string body = DalAllocateMethodBody();

            body.Should().NotContain("for (");
            body.Should().NotContain("foreach (");
            body.Should().NotContain("NpgsqlTransaction");
        }

        [Fact]
        public void The_dal_response_mapping_remains_complete()
        {
            string body = DalAllocateMethodBody();

            body.Should().Contain("GetInt(reader, \"FederationCreditAllocationId\")");
            body.Should().Contain("GetInt(reader, \"FederationExternalCreditId\")");
            body.Should().Contain("GetInt(reader, \"BillChargeId\")");
            body.Should().Contain("GetNullableInt(reader, \"EntryId\")");
            body.Should().Contain("GetDecimal(reader, \"AllocatedAmount\")");
            body.Should().Contain("GetDecimal(reader, \"CreditUsedAmount\")");
            body.Should().Contain("GetDecimal(reader, \"CreditAvailableAmount\")");
            body.Should().Contain("GetString(reader, \"CreditStatus\")");
            body.Should().Contain("GetDecimal(reader, \"BillChargeAmount\")");
            body.Should().Contain("GetDecimal(reader, \"BillChargeCoveredAmount\")");
            body.Should().Contain("GetString(reader, \"BillChargeStatus\")");
        }

        // =================================================================
        // Secured wrapper SQL (226): must delegate to 193, must not
        // duplicate its business logic, must not swallow its exceptions.
        // =================================================================

        [Fact]
        public void The_secured_wrapper_file_exists_with_the_expected_signature()
        {
            string source = SecuredWrapperSqlSource();

            source.Should().Contain("CREATE OR REPLACE FUNCTION public.usp_allocatefederationcredittochargesecured(");
            source.Should().Contain("p_competitionid integer");
        }

        [Fact]
        public void The_secured_wrapper_delegates_the_write_to_the_unscoped_primitive()
        {
            string source = SecuredWrapperSqlSource();

            source.Should().Contain("from public.usp_allocatefederationcredittocharge(");
        }

        private static string SecuredWrapperFunctionBody()
        {
            string source = SecuredWrapperSqlSource();

            // Scoped to the executable body only - the header comment
            // legitimately discusses "paymentbatch guard"/"remaining-amount"
            // etc. in prose to explain what this function deliberately does
            // NOT duplicate, which would otherwise false-fail a naive
            // whole-file check.
            int from = source.IndexOf("AS $function$", StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1);

            return source.Substring(from);
        }

        [Fact]
        public void The_secured_wrapper_does_not_duplicate_193s_business_logic()
        {
            string body = SecuredWrapperFunctionBody();

            // Words that belong exclusively to 193's own authoritative,
            // locked validation and writes - if any of these appear here it
            // means logic got duplicated outside the single source of truth.
            body.Should().NotContain("paymentbatch");
            body.Should().NotContain("chargestatus =");
            body.Should().NotContain("v_remaining_charge_amount");
            body.Should().NotContain("remainingamount");
            body.Should().NotContain("insert into public.federationcreditallocation");
            body.Should().NotContain("update public.federationexternalcredit");
            body.Should().NotContain("update public.billcharge");
        }

        [Fact]
        public void The_secured_wrapper_has_no_exception_handler()
        {
            string source = SecuredWrapperSqlSource();

            source.ToLowerInvariant().Should().NotContain("exception when");
        }

        [Fact]
        public void The_secured_wrapper_locks_credit_before_charge()
        {
            string source = SecuredWrapperSqlSource();

            int creditLock = source.IndexOf("from public.federationexternalcredit fec", StringComparison.Ordinal);
            int chargeLock = source.IndexOf("from public.billcharge bc", StringComparison.Ordinal);

            creditLock.Should().BeGreaterThan(-1);
            chargeLock.Should().BeGreaterThan(-1);
            creditLock.Should().BeLessThan(chargeLock, "credit must be locked before charge, matching 193/199/223/225's shared convention");
        }

        // =================================================================
        // SP 225's per-charge delegation now targets the secured wrapper and
        // passes p_competitionid - scoped narrowly to the delegation loop
        // itself, since the file legitimately still mentions
        // usp_allocatefederationcredittocharge by name in comments.
        // =================================================================

        private static string BulkAllocateDelegationLoopBody()
        {
            string source = BulkAllocateSqlSource();

            int from = source.LastIndexOf("for v_charge_row in", StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "the final per-charge delegation loop was expected in 225");

            string rest = source.Substring(from);

            int to = rest.IndexOf("end loop;", StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void Sp225_delegation_loop_calls_the_secured_wrapper()
        {
            string loopBody = BulkAllocateDelegationLoopBody();

            loopBody.Should().Contain("from public.usp_allocatefederationcredittochargesecured(");
        }

        [Fact]
        public void Sp225_delegation_loop_passes_p_competitionid_as_the_first_argument()
        {
            string loopBody = BulkAllocateDelegationLoopBody();

            int callAt = loopBody.IndexOf("from public.usp_allocatefederationcredittochargesecured(", StringComparison.Ordinal);

            callAt.Should().BeGreaterThan(-1);

            string afterCall = loopBody.Substring(callAt);

            afterCall.Should().Contain("p_competitionid,");
        }

        [Fact]
        public void Sp225_delegation_loop_no_longer_calls_the_unscoped_function_directly()
        {
            string loopBody = BulkAllocateDelegationLoopBody();

            loopBody.Should().NotContain("from public.usp_allocatefederationcredittocharge(");
        }
    }
}
