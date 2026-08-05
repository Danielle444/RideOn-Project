using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.CompetitionPayments;

namespace RideOnServer.Tests
{
    // Federation allocation idempotency (design "Revision 3"). Three new,
    // distinctly-named Stored Procedures (usp_allocatefederationcredittocharge-
    // idempotent, usp_bulkallocatefederationcredittochargesidempotent,
    // usp_approvefederationmatchingsuggestionidempotent) sit in front of the
    // existing, UNCHANGED 193/199/225/226 - see each proc file's own header
    // comment for the full design rationale. This file proves the C# contract
    // only, matching the DB-free, mocking-free convention already established
    // by BulkAllocateFederationCreditContractTests/AllocateFederationCredit-
    // SecuredContractTests: bounded source-text assertions plus real BL-layer
    // invocations (the BL's OperationId check is pure/DB-free, so it can be
    // exercised directly without a database). The three new functions' actual
    // idempotent/replay/rejection/rollback behavior is proven separately,
    // live, in rolled-back transactions as part of this change's DB
    // verification - not duplicated here.
    public class AllocationIdempotencyContractTests
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

        private static string ControllerSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "Controllers", "CompetitionPaymentsController.cs"));

            File.Exists(path).Should().BeTrue("CompetitionPaymentsController.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string ProcSource(string fileName)
        {
            string path = Path.GetFullPath(
                Path.Combine(
                    TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual", fileName));

            File.Exists(path).Should().BeTrue("{0} was expected at {1}", fileName, path);

            return File.ReadAllText(path);
        }

        // =================================================================
        // 1. OperationId exists on all three request DTOs.
        // =================================================================

        [Theory]
        [InlineData(typeof(AllocateFederationCreditRequest))]
        [InlineData(typeof(BulkAllocateFederationCreditRequest))]
        [InlineData(typeof(ApproveFederationMatchingSuggestionRequest))]
        public void The_request_dto_exposes_a_string_operationid_property(Type dtoType)
        {
            PropertyInfo? property = dtoType.GetProperty("OperationId");

            property.Should().NotBeNull();
            property!.PropertyType.Should().Be(typeof(string));
        }

        [Fact]
        public void The_bulk_request_dto_still_has_no_allocator_payer_or_amount_fields()
        {
            // Unchanged guarantee from the pre-existing bulk contract test -
            // adding OperationId must not reopen this.
            Type dtoType = typeof(BulkAllocateFederationCreditRequest);

            dtoType.GetProperty("AllocatedBySystemUserId").Should().BeNull();
            dtoType.GetProperty("PayerPersonId").Should().BeNull();
            dtoType.GetProperty("AllocatedAmount").Should().BeNull();
        }

        // =================================================================
        // 2. BL requires a non-empty OperationId, checked before any other
        // validation, for all three methods - real invocations, DB-free
        // (ValidateCompetitionAndRanch/ValidatePayer are pure int checks).
        // =================================================================

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public void AllocateFederationCreditToCharge_throws_when_operationid_missing(string? operationId)
        {
            AllocateFederationCreditRequest request = new AllocateFederationCreditRequest
            {
                OperationId = operationId!,
                CompetitionId = 7,
                RanchId = 11,
                FederationExternalCreditId = 1,
                BillChargeId = 1,
                AllocatedAmount = 10,
                AllocatedBySystemUserId = 1
            };

            Action act = () => CompetitionPayment.AllocateFederationCreditToCharge(request);

            act.Should().Throw<Exception>().WithMessage("*OperationId*");
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public void ApproveFederationMatchingSuggestion_throws_when_operationid_missing(string? operationId)
        {
            ApproveFederationMatchingSuggestionRequest request = new ApproveFederationMatchingSuggestionRequest
            {
                OperationId = operationId!,
                CompetitionId = 7,
                RanchId = 11,
                FederationExternalCreditId = 1,
                PaidByPersonId = 1,
                Amount = 10
            };

            Action act = () => CompetitionPayment.ApproveFederationMatchingSuggestion(request, 79);

            act.Should().Throw<Exception>().WithMessage("*OperationId*");
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public void BulkAllocateFederationCreditToCharges_throws_when_operationid_missing(string? operationId)
        {
            BulkAllocateFederationCreditRequest request = new BulkAllocateFederationCreditRequest
            {
                OperationId = operationId!,
                CompetitionId = 7,
                RanchId = 11,
                FederationExternalCreditId = 1,
                BillChargeIds = new List<int> { 1, 2 }
            };

            Action act = () => CompetitionPayment.BulkAllocateFederationCreditToCharges(request, 79);

            act.Should().Throw<Exception>().WithMessage("*OperationId*");
        }

        // =================================================================
        // 3/4. DAL binds OperationId and targets only the new idempotent
        // functions - never the secured wrapper (226), the bulk primitive
        // (225) or the unscoped single-charge primitive (193) directly.
        // =================================================================

        [Fact]
        public void The_dal_direct_allocate_method_binds_requestid_and_targets_the_idempotent_function()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public AllocateFederationCreditResponse AllocateFederationCreditToCharge(",
                StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string body = source.Substring(from, source.IndexOf("catch (PostgresException", from, StringComparison.Ordinal) - from);

            body.Should().Contain("public.usp_allocatefederationcredittochargeidempotent(");
            body.Should().Contain("\"@requestId\"");
            body.Should().Contain("request.OperationId");
            body.Should().NotContain("usp_allocatefederationcredittochargesecured(");
            body.Should().NotContain("usp_allocatefederationcredittocharge(");
        }

        [Fact]
        public void The_dal_bulk_allocate_method_binds_requestid_and_targets_the_idempotent_function()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public List<BulkAllocateFederationCreditResultItem> BulkAllocateFederationCreditToCharges(",
                StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string body = source.Substring(from, source.IndexOf("catch (PostgresException", from, StringComparison.Ordinal) - from);

            body.Should().Contain("public.usp_bulkallocatefederationcredittochargesidempotent(");
            body.Should().Contain("\"@requestId\"");
            body.Should().Contain("request.OperationId");
            body.Should().NotContain("usp_bulkallocatefederationcredittocharges(");
            body.Should().NotContain("usp_allocatefederationcredittocharge(");
        }

        [Fact]
        public void The_dal_approve_matching_suggestion_method_binds_requestid_and_targets_the_idempotent_function()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public ApproveFederationMatchingSuggestionResponse ApproveFederationMatchingSuggestion(",
                StringComparison.Ordinal);
            from.Should().BeGreaterThan(-1);

            string body = source.Substring(from, source.IndexOf("catch (PostgresException", from, StringComparison.Ordinal) - from);

            body.Should().Contain("public.usp_approvefederationmatchingsuggestionidempotent(");
            body.Should().Contain("\"@requestId\"");
            body.Should().Contain("request.OperationId");
            body.Should().NotContain("usp_approvefederationmatchingsuggestion(");
        }

        [Fact]
        public void The_dal_translates_rn001_into_a_validation_exception_for_all_three_methods()
        {
            string source = DalSource();

            // Each new call site must be immediately followed (before the
            // generic NpgsqlException catch) by an RN001-specific catch that
            // surfaces the guard's message via BL.ValidationException -
            // mirroring the existing ServicePriceDAL convention.
            int occurrences = 0;
            int index = 0;

            while ((index = source.IndexOf("catch (PostgresException ex) when (ex.SqlState == \"RN001\")", index, StringComparison.Ordinal)) != -1)
            {
                occurrences++;
                index += 1;
            }

            occurrences.Should().Be(3, "each of the three idempotent-call DAL methods needs its own RN001 catch");
            source.Should().Contain("throw new BL.ValidationException(ex.MessageText);");
        }

        // =================================================================
        // 5. Actor identity is still claims-derived at the Controller layer,
        // never taken from the client-supplied OperationId or request body.
        // =================================================================

        [Fact]
        public void The_controller_still_derives_allocator_identity_from_claims_not_operationid()
        {
            string source = ControllerSource();

            source.Should().Contain("UserAccessValidator.GetPersonIdFromClaims(User)");
            source.Should().Contain("request.AllocatedBySystemUserId = personId;");
        }

        // =================================================================
        // 6/7. SP 193/199/225/226 remain completely untouched - no
        // idempotency vocabulary leaked into any of them.
        // =================================================================

        [Theory]
        [InlineData("193_usp_AllocateFederationCreditToCharge.sql")]
        [InlineData("199_usp_ApproveFederationMatchingSuggestion.sql")]
        [InlineData("225_usp_BulkAllocateFederationCreditToCharges.sql")]
        [InlineData("226_usp_AllocateFederationCreditToChargeSecured.sql")]
        public void The_existing_protected_procs_carry_no_idempotency_vocabulary(string fileName)
        {
            string source = ProcSource(fileName).ToLowerInvariant();

            source.Should().NotContain("p_requestid");
            source.Should().NotContain("federationallocationrequest");
            source.Should().NotContain("idempotent");
            source.Should().NotContain("rn001");
        }

        [Fact]
        public void The_three_new_idempotent_functions_exist_with_a_requestid_first_parameter()
        {
            string direct = ProcSource("228_usp_AllocateFederationCreditToChargeIdempotent.sql");
            string bulk = ProcSource("229_usp_BulkAllocateFederationCreditToChargesIdempotent.sql");
            string matching = ProcSource("230_usp_ApproveFederationMatchingSuggestionIdempotent.sql");

            direct.Should().Contain("CREATE OR REPLACE FUNCTION public.usp_allocatefederationcredittochargeidempotent(\n    p_requestid text,");
            bulk.Should().Contain("CREATE OR REPLACE FUNCTION public.usp_bulkallocatefederationcredittochargesidempotent(\n    p_requestid text,");
            matching.Should().Contain("CREATE OR REPLACE FUNCTION public.usp_approvefederationmatchingsuggestionidempotent(\n    p_requestid text,");
        }

        [Fact]
        public void The_direct_idempotent_function_delegates_only_through_the_secured_wrapper()
        {
            string source = ProcSource("228_usp_AllocateFederationCreditToChargeIdempotent.sql");

            source.Should().Contain("public.usp_allocatefederationcredittochargesecured(");
            source.Should().NotContain("public.usp_allocatefederationcredittocharge(");
        }

        [Fact]
        public void The_bulk_idempotent_function_never_calls_sp225_and_delegates_only_through_the_secured_wrapper()
        {
            string source = ProcSource("229_usp_BulkAllocateFederationCreditToChargesIdempotent.sql");

            source.Should().Contain("public.usp_allocatefederationcredittochargesecured(");
            source.Should().NotContain("public.usp_bulkallocatefederationcredittocharges(");
            source.Should().NotContain("public.usp_allocatefederationcredittocharge(");
        }

        [Fact]
        public void The_matching_idempotent_function_never_calls_sp199_or_sp193_directly()
        {
            string source = ProcSource("230_usp_ApproveFederationMatchingSuggestionIdempotent.sql");

            source.Should().Contain("public.usp_allocatefederationcredittochargesecured(");
            source.Should().NotContain("public.usp_approvefederationmatchingsuggestion(");
            source.Should().NotContain("public.usp_allocatefederationcredittocharge(");
        }

        [Theory]
        [InlineData("228_usp_AllocateFederationCreditToChargeIdempotent.sql")]
        [InlineData("229_usp_BulkAllocateFederationCreditToChargesIdempotent.sql")]
        [InlineData("230_usp_ApproveFederationMatchingSuggestionIdempotent.sql")]
        public void No_new_idempotent_function_introduces_a_credit_plus_charge_unique_constraint(string fileName)
        {
            string source = ProcSource(fileName).ToLowerInvariant();

            source.Should().NotContain("unique (federationexternalcreditid, billchargeid)");
            source.Should().NotContain("unique(federationexternalcreditid, billchargeid)");
        }

        [Fact]
        public void The_schema_migration_defines_the_parent_child_tables_without_a_creditcharge_unique_constraint()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnDB", "migrations", "add_federationallocationrequest_tables.sql"));

            File.Exists(path).Should().BeTrue("the schema migration file was expected at {0}", path);

            string source = File.ReadAllText(path).ToLowerInvariant();

            source.Should().Contain("create table public.federationallocationrequest");
            source.Should().Contain("create table public.federationallocationrequestitem");
            source.Should().Contain("constraint ux_federationallocationrequestitem_request_charge unique (requestid, billchargeid)");
            source.Should().NotContain("unique (federationexternalcreditid, billchargeid)");
        }
    }
}
