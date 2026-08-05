using System.Reflection;
using System.Runtime.CompilerServices;
using FluentAssertions;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // Federation atomic bulk allocation: the direct-payments screen used to
    // call usp_allocatefederationcredittocharge (193) once per selected
    // charge over separate HTTP requests/transactions - no atomicity, and a
    // mid-loop failure left earlier allocations committed while later
    // charges were silently skipped.
    //
    // usp_bulkallocatefederationcredittocharges (225) replaces that loop with
    // one all-or-nothing Stored Procedure call. This file is DB-free,
    // matching HealthCertificateApprovalContractTests: no mocking framework
    // and no HTTP test host exist in this project, so it proves the C#
    // contract only via reflection over public signatures and bounded
    // source-text assertions - that the DAL makes exactly one round trip
    // (never loops calling the single-charge Stored Procedure from C#), that
    // the id list is bound as a native integer array, and that the
    // Controller derives the allocator identity from claims rather than
    // trusting the request body. The Stored Procedure's own atomicity is
    // proven separately, live, in a rolled-back transaction as part of this
    // change's DB verification - not duplicated here.
    public class BulkAllocateFederationCreditContractTests
    {
        private static string TestSourceDirectory([CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }

        private static string ControllerSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "Controllers", "CompetitionPaymentsController.cs"));

            File.Exists(path).Should().BeTrue("CompetitionPaymentsController.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string BlSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "BL", "CompetitionPayment.cs"));

            File.Exists(path).Should().BeTrue("CompetitionPayment.cs was expected at {0}", path);

            return File.ReadAllText(path);
        }

        private static string DalSource()
        {
            string path = Path.GetFullPath(
                Path.Combine(TestSourceDirectory(), "..", "RideOnServer", "DAL", "CompetitionPaymentDAL.cs"));

            File.Exists(path).Should().BeTrue("CompetitionPaymentDAL.cs was expected at {0}", path);

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
        // Request DTO never carries an allocator identity, a payer id, or
        // any client-computed amount.
        // =================================================================

        [Fact]
        public void The_request_dto_has_no_allocated_by_system_user_id_property()
        {
            typeof(BL.DTOs.CompetitionPayments.BulkAllocateFederationCreditRequest)
                .GetProperty("AllocatedBySystemUserId")
                .Should().BeNull("the allocator identity must only ever come from claims, never from the client");
        }

        [Fact]
        public void The_request_dto_has_no_payer_or_amount_fields()
        {
            Type dtoType = typeof(BL.DTOs.CompetitionPayments.BulkAllocateFederationCreditRequest);

            dtoType.GetProperty("PayerPersonId").Should().BeNull();
            dtoType.GetProperty("AllocatedAmount").Should().BeNull();
            dtoType.GetProperty("RequestedTotalAmount").Should().BeNull();
            dtoType.GetProperty("CreditAvailableAmount").Should().BeNull();
            dtoType.GetProperty("MissingAmount").Should().BeNull();
        }

        [Fact]
        public void The_request_dto_carries_a_bill_charge_id_list()
        {
            PropertyInfo property = typeof(BL.DTOs.CompetitionPayments.BulkAllocateFederationCreditRequest)
                .GetProperty("BillChargeIds")
                ?? throw new InvalidOperationException("BillChargeIds was expected on the bulk request DTO.");

            typeof(System.Collections.Generic.IEnumerable<int>)
                .IsAssignableFrom(property.PropertyType)
                .Should().BeTrue("BillChargeIds must be an id list, not a per-item amount structure");
        }

        // =================================================================
        // Controller derives personId from claims and never forwards a
        // client-supplied allocator id.
        // =================================================================

        private static string ControllerBulkAllocateMethodBody()
        {
            string source = ControllerSource();

            int from = source.IndexOf(
                "public IActionResult BulkAllocateFederationCreditToCharges(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "BulkAllocateFederationCreditToCharges was expected in CompetitionPaymentsController");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "$\"Error in BulkAllocateFederationCreditToCharges:",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_controller_validates_host_secretary_access()
        {
            ControllerBulkAllocateMethodBody().Should().Contain("ValidateHostSecretaryCompetitionAccess(");
        }

        [Fact]
        public void The_controller_derives_person_id_from_claims_and_passes_it_to_bl()
        {
            string body = ControllerBulkAllocateMethodBody();

            body.Should().Contain("UserAccessValidator.GetPersonIdFromClaims(User)");
            body.Should().Contain("CompetitionPayment.BulkAllocateFederationCreditToCharges(");
            body.Should().Contain("personId");
        }

        [Fact]
        public void The_controller_calls_bl_exactly_once()
        {
            CountOccurrences(
                ControllerBulkAllocateMethodBody(),
                "CompetitionPayment.BulkAllocateFederationCreditToCharges(")
                .Should().Be(1, "the Controller must not loop over selected charges");
        }

        [Fact]
        public void A_403_is_returned_for_unauthorized_access_and_400_for_business_failures()
        {
            string body = ControllerBulkAllocateMethodBody();

            body.Should().Contain("catch (UnauthorizedAccessException ex)");
            body.Should().Contain("StatusCodes.Status403Forbidden");
            body.Should().Contain("catch (Exception ex)");
            body.Should().Contain("return BadRequest(");
        }

        // =================================================================
        // BL performs only shape validation, never business-state
        // validation (that belongs to the Stored Procedure).
        // =================================================================

        private static string BlBulkAllocateMethodBody()
        {
            string source = BlSource();

            int from = source.IndexOf(
                "BulkAllocateFederationCreditToCharges(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "BulkAllocateFederationCreditToCharges was expected in CompetitionPayment (BL)");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "dal.BulkAllocateFederationCreditToCharges(",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            // Include the DAL call itself so the final return is captured too.
            int closeParen = rest.IndexOf(");", to, StringComparison.Ordinal);

            closeParen.Should().BeGreaterThan(-1);

            return rest.Substring(0, closeParen + 2);
        }

        [Fact]
        public void The_bl_rejects_an_empty_or_null_charge_list()
        {
            BlBulkAllocateMethodBody().Should().Contain(
                "request.BillChargeIds == null || request.BillChargeIds.Count == 0");
        }

        [Fact]
        public void The_bl_rejects_duplicate_ids_as_an_early_friendly_guard()
        {
            BlBulkAllocateMethodBody().Should().Contain(
                "request.BillChargeIds.Distinct().Count() != request.BillChargeIds.Count");
        }

        [Fact]
        public void The_bl_does_not_validate_charge_business_state()
        {
            string body = BlBulkAllocateMethodBody();

            // Business-state words that belong exclusively to the Stored
            // Procedure's authoritative, locked validation - if any of these
            // leak into the BL layer it means business logic duplicated
            // outside the single source of truth.
            body.Should().NotContain("paymentbatch");
            body.Should().NotContain("chargestatus");
            body.Should().NotContain("remaining");
        }

        [Fact]
        public void The_bl_calls_the_dal_exactly_once()
        {
            CountOccurrences(
                BlBulkAllocateMethodBody(),
                "dal.BulkAllocateFederationCreditToCharges(")
                .Should().Be(1);
        }

        // =================================================================
        // DAL makes exactly one round trip to the new Stored Procedure -
        // never a loop calling usp_allocatefederationcredittocharge (193)
        // from C#.
        // =================================================================

        private static string DalBulkAllocateMethodBody()
        {
            string source = DalSource();

            int from = source.IndexOf(
                "public List<BulkAllocateFederationCreditResultItem> BulkAllocateFederationCreditToCharges(",
                StringComparison.Ordinal);

            from.Should().BeGreaterThan(-1, "BulkAllocateFederationCreditToCharges was expected in CompetitionPaymentDAL");

            string rest = source.Substring(from);

            int to = rest.IndexOf(
                "catch (NpgsqlException ex)",
                StringComparison.Ordinal);

            to.Should().BeGreaterThan(-1);

            return rest.Substring(0, to);
        }

        [Fact]
        public void The_dal_calls_the_idempotent_bulk_wrapper_not_the_single_charge_functions()
        {
            // 2026-08-06: superseded by usp_bulkallocatefederationcredittochargesidempotent
            // (229), which reproduces 225's own validation and delegates to the
            // secured wrapper (226) per charge inside its own SQL body - see
            // AllocationIdempotencyContractTests. The DAL no longer calls 225
            // directly for this method.
            string body = DalBulkAllocateMethodBody();

            body.Should().Contain("public.usp_bulkallocatefederationcredittochargesidempotent(");
            body.Should().NotContain("usp_bulkallocatefederationcredittocharges(");
            body.Should().NotContain("usp_allocatefederationcredittocharge(");
        }

        [Fact]
        public void The_dal_makes_exactly_one_round_trip()
        {
            string body = DalBulkAllocateMethodBody();

            CountOccurrences(body, "Connect(\"DefaultConnection\")")
                .Should().Be(1, "the bulk allocation must be a single round trip, not an N+1 client loop");

            CountOccurrences(body, "ExecuteReader()")
                .Should().Be(1);
        }

        [Fact]
        public void The_dal_binds_bill_charge_ids_as_a_native_integer_array_not_jsonb()
        {
            string body = DalBulkAllocateMethodBody();

            body.Should().Contain("NpgsqlDbType.Array | NpgsqlDbType.Integer");
            body.Should().Contain("request.BillChargeIds.ToArray()");
            body.Should().NotContain("NpgsqlDbType.Jsonb");
        }

        [Fact]
        public void The_dal_never_loops_to_call_the_single_charge_allocation_from_csharp()
        {
            string body = DalBulkAllocateMethodBody();

            // A while(reader.Read()) loop mapping every returned row is
            // expected and correct - what must never appear is any construct
            // that iterates BillChargeIds to build/execute a second command.
            body.Should().NotContain("for (");
            body.Should().NotContain("foreach (");
            body.Should().NotContain("BillChargeIds.ForEach");
            body.Should().NotContain("usp_allocatefederationcredittocharge(");
        }

        [Fact]
        public void The_dal_maps_every_returned_row_not_just_the_first()
        {
            string body = DalBulkAllocateMethodBody();

            body.Should().Contain("while (reader.Read())");
            body.Should().NotContain("if (reader.Read())");
        }

        [Fact]
        public void The_dal_maps_the_approved_response_fields()
        {
            string body = DalBulkAllocateMethodBody();

            body.Should().Contain("GetInt(reader, \"billchargeid\")");
            body.Should().Contain("GetDecimal(reader, \"allocatedamount\")");
            body.Should().Contain("GetString(reader, \"billchargestatus\")");
            body.Should().Contain("GetDecimal(reader, \"creditavailableamount\")");
            body.Should().Contain("GetString(reader, \"creditstatus\")");
        }
    }
}
