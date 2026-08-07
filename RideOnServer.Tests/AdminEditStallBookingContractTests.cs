using FluentAssertions;
using Npgsql;
using NpgsqlTypes;
using RideOnServer.BL.DTOs.StallBookings;
using RideOnServer.DAL;

namespace RideOnServer.Tests
{
    // DB-free coverage of the admin-payer direct-changes stall mutation slice
    // (usp_admineditstallbooking, repo file 236). No connection is opened:
    // BuildAdminEditStallBookingCommand only assembles command text and
    // parameters (an NpgsqlCommand can be constructed and inspected with a
    // null connection). Modeled directly on
    // StallBookingRanchModelDalCommandTests.cs / ChangeEntryRequestDalCommandTests.cs.
    public class AdminEditStallBookingContractTests
    {
        private const int PersonIdSentinel = 2251;
        private const int StallBookingIdSentinel = 214;
        private const int RanchIdSentinel = 35;

        private static object? ValueOf(NpgsqlCommand command, string parameterName)
        {
            command.Parameters.Contains(parameterName)
                .Should()
                .BeTrue($"the command must bind {parameterName}");

            return command.Parameters[parameterName].Value;
        }

        private static AdminEditStallBookingRequest BuildRequest(short? newProductId)
        {
            return new AdminEditStallBookingRequest
            {
                StallBookingId = StallBookingIdSentinel,
                RanchId = RanchIdSentinel,
                NewStartDate = new DateTime(2026, 9, 15),
                NewEndDate = new DateTime(2026, 9, 18),
                Notes = "updated notes",
                NewProductId = newProductId
            };
        }

        [Fact]
        public void BuildAdminEditStallBookingCommand_CallsTheSevenArgumentFunctionSignature()
        {
            AdminEditStallBookingRequest request = BuildRequest(newProductId: 4);

            using NpgsqlCommand command = StallBookingDAL.BuildAdminEditStallBookingCommand(
                request, PersonIdSentinel, null);

            command.CommandText.Should().Contain("usp_admineditstallbooking(");
            command.Parameters.Count.Should().Be(7);
        }

        [Fact]
        public void BuildAdminEditStallBookingCommand_BindsPersonIdSeparatelyFromTheRequestBody()
        {
            // personId is threaded as its own method parameter, never a field
            // on the request DTO -- same pattern as AdminEditEntryRequest.
            AdminEditStallBookingRequest request = BuildRequest(newProductId: null);

            using NpgsqlCommand command = StallBookingDAL.BuildAdminEditStallBookingCommand(
                request, PersonIdSentinel, null);

            ValueOf(command, "@personId").Should().Be(PersonIdSentinel);
            ValueOf(command, "@stallBookingId").Should().Be(StallBookingIdSentinel);
            ValueOf(command, "@ranchId").Should().Be(RanchIdSentinel);
        }

        [Fact]
        public void BuildAdminEditStallBookingCommand_BindsNewProductIdAsDbNullWhenOmitted()
        {
            // Omitting NewProductId must mean "leave the product unchanged" --
            // the DAL must forward DBNull, not a zero/sentinel value, so the
            // proc's own p_newproductid <> v_old_productid comparison never
            // fires a spurious product-change attempt.
            AdminEditStallBookingRequest request = BuildRequest(newProductId: null);

            using NpgsqlCommand command = StallBookingDAL.BuildAdminEditStallBookingCommand(
                request, PersonIdSentinel, null);

            ValueOf(command, "@newProductId").Should().Be(DBNull.Value);
        }

        [Fact]
        public void BuildAdminEditStallBookingCommand_BindsNewProductIdAsSmallintWhenSupplied()
        {
            AdminEditStallBookingRequest request = BuildRequest(newProductId: 4);

            using NpgsqlCommand command = StallBookingDAL.BuildAdminEditStallBookingCommand(
                request, PersonIdSentinel, null);

            command.Parameters["@newProductId"].NpgsqlDbType.Should().Be(NpgsqlDbType.Smallint);
            ValueOf(command, "@newProductId").Should().Be((short)4);
        }

        [Fact]
        public void BuildAdminEditStallBookingCommand_BindsDatesAsDateNotTimestamp()
        {
            AdminEditStallBookingRequest request = BuildRequest(newProductId: null);

            using NpgsqlCommand command = StallBookingDAL.BuildAdminEditStallBookingCommand(
                request, PersonIdSentinel, null);

            command.Parameters["@newStartDate"].NpgsqlDbType.Should().Be(NpgsqlDbType.Date);
            command.Parameters["@newEndDate"].NpgsqlDbType.Should().Be(NpgsqlDbType.Date);
        }

        [Fact]
        public void AdminEditStallBooking_NeverSetsCommandTypeStoredProcedure()
        {
            // Regression pin for the exact 42883/CALL-vs-SELECT bug documented
            // in the Competition Duplication incident: this DAL method must
            // stay on a plain SELECT-text NpgsqlCommand, never
            // CommandType.StoredProcedure (which Npgsql 8 emits as CALL and
            // resolves only prokind='p' procedures -- every proc here is a
            // prokind='f' function).
            string source = File.ReadAllText(Path.Combine(
                TestSourceDirectory(), "..", "RideOnServer", "DAL", "StallBookingDAL.cs"));

            int methodAt = source.IndexOf("public static NpgsqlCommand BuildAdminEditStallBookingCommand(", StringComparison.Ordinal);
            int nextMethodAt = source.IndexOf("public static void AdminEditStallBooking(", methodAt, StringComparison.Ordinal);

            methodAt.Should().BeGreaterThan(-1);
            nextMethodAt.Should().BeGreaterThan(methodAt);

            string methodBody = source.Substring(methodAt, nextMethodAt - methodAt);

            methodBody.Should().NotContain("CommandType.StoredProcedure");
        }

        // =====================================================================
        // Multi-payer allocation correction (2026-08-05, before any live
        // deploy). The allocation arithmetic itself lives entirely in
        // usp_admineditstallbooking (SQL) -- the C# DAL never computes an
        // amount, it only forwards dates/notes/productId. There is nothing
        // in RideOnServer to unit-test that call the split math directly, so
        // these tests do two things a DB-free suite CAN do:
        //   1. Pin the deployed .sql source contains the corrected per-payer
        //      allocation shape and no longer contains the flat-total-per-row
        //      pattern that caused the original defect (source inspection,
        //      same technique as CreateStallBookingChangeRequest_Still...
        //      above, applied to the repo .sql file instead of a .cs file).
        //   2. Pin the integer-cents allocation ALGORITHM itself (mirrored
        //      from the proc's comments/logic) against the exact totals
        //      exercised in this session's rollback-safe live matrix
        //      (450/2 payers, 750/7 payers) -- proving the arithmetic design
        //      is correct independent of SQL syntax. The live matrix in the
        //      pre-commit report is the proof that the DEPLOYED SQL performs
        //      this same arithmetic; this test cannot substitute for that.
        // =====================================================================

        private static string ReadProc236Source()
        {
            return File.ReadAllText(Path.Combine(
                TestSourceDirectory(), "..", "RideOnDB", "StoredProcedures", "PostgreSQL", "Individual",
                "236_usp_AdminEditStallBooking.sql"));
        }

        [Fact]
        public void Proc236_AllocatesPerPayerRowRatherThanTheFlatTotal()
        {
            string source = ReadProc236Source();

            // The corrected shape: payer count is read from billproductrequest,
            // and each row's new amount comes from a per-billid allocation
            // join -- not a single UPDATE ... SET amounttopay = v_new_amount
            // applied to every matching row (the original defect, which would
            // charge the full total to every payer).
            source.Should().Contain("SELECT COUNT(*)");
            source.Should().Contain("INTO v_payercount");
            source.Should().Contain("FROM public.billproductrequest bpr");

            source.Should().Contain("ROW_NUMBER() OVER (ORDER BY bpr.billid)");
            source.Should().Contain("v_remainder_cents");

            // The old, defective single-value UPDATE text must not remain --
            // if it ever comes back, every payer would again be charged the
            // full recalculated total.
            source.Should().NotContain("SET amounttopay = v_new_amount\n    WHERE sourcetype = 'ProductRequest'");
        }

        [Fact]
        public void Proc236_ComputesTheSplitInIntegerCentsForExactness()
        {
            string source = ReadProc236Source();

            // Numeric-dollar division/rounding (e.g. ROUND(total / count, 2)
            // applied independently per row) is exactly the pattern proven
            // live to drift by a few cents (usp_createstallbooking /
            // usp_answerproductchangerequest, real live rows 215/219/221/111).
            // The correction must do the division in integer cents so the
            // remainder is exact and distributable, never silently dropped.
            source.Should().Contain("v_total_cents     := ROUND(v_new_amount * 100)::bigint");
            source.Should().Contain("v_base_cents      := v_total_cents / v_payercount");
            source.Should().Contain("v_remainder_cents := v_total_cents - (v_base_cents * v_payercount)");
        }

        [Fact]
        public void Proc236_PaidGuardStillPrecedesTheAllocationRewrite()
        {
            // The paid-charge guard (bpr.paymentid IS NOT NULL -> reject the
            // whole booking) must still run BEFORE the payer-count/allocation
            // block -- otherwise a partially-paid multi-payer booking could
            // have its unpaid payers' rows reallocated while a paid payer's
            // row is left stale, silently breaking the paid/unpaid invariant
            // instead of rejecting the edit outright.
            string source = ReadProc236Source();

            int paidGuardAt = source.IndexOf("Cannot edit a paid stall booking", StringComparison.Ordinal);
            int payerCountAt = source.IndexOf("INTO v_payercount", StringComparison.Ordinal);

            paidGuardAt.Should().BeGreaterThan(-1);
            payerCountAt.Should().BeGreaterThan(-1);
            paidGuardAt.Should().BeLessThan(payerCountAt);
        }

        // Mirrors usp_admineditstallbooking's integer-cents allocation
        // exactly (base = total_cents / count via integer division, first
        // `remainder` rows in ascending billid order get one extra cent) --
        // NOT a call into the DB. Proves the arithmetic design against the
        // exact totals/payer-counts this session's live matrix exercised.
        private static long[] AllocateCentsMirroringProc236(long totalCents, int payerCount)
        {
            long baseCents = totalCents / payerCount;
            long remainderCents = totalCents - (baseCents * payerCount);

            long[] result = new long[payerCount];
            for (int i = 0; i < payerCount; i++)
            {
                result[i] = baseCents + (i < remainderCents ? 1 : 0);
            }

            return result;
        }

        [Fact]
        public void AllocationArithmetic_SinglePayerGetsTheFullAmount()
        {
            long[] allocation = AllocateCentsMirroringProc236(totalCents: 120000, payerCount: 1);

            allocation.Should().BeEquivalentTo(new long[] { 120000 });
        }

        [Fact]
        public void AllocationArithmetic_TwoPayersEvenSplitMatchesLiveMatrix()
        {
            // Live matrix: booking 33, 2 payers, repriced total 450.00 ->
            // 225.00 / 225.00 exactly, no remainder.
            long[] allocation = AllocateCentsMirroringProc236(totalCents: 45000, payerCount: 2);

            allocation.Should().BeEquivalentTo(new long[] { 22500, 22500 });
            allocation.Sum().Should().Be(45000);
        }

        [Fact]
        public void AllocationArithmetic_SevenPayersUnevenSplitMatchesLiveMatrix()
        {
            // Live matrix: booking 221, 7 payers, repriced total 750.00 ->
            // 107.15 x2 + 107.14 x5, sum exactly 750.00. This is the case
            // that exposed the original defect's silent cent drift
            // (usp_createstallbooking's own equal-split without remainder
            // correction produces 128.57 x7 = 899.99 on this exact booking's
            // pre-existing data -- proof kept in the proc's header comment).
            long[] allocation = AllocateCentsMirroringProc236(totalCents: 75000, payerCount: 7);

            allocation.Should().BeEquivalentTo(new long[] { 10715, 10715, 10714, 10714, 10714, 10714, 10714 });
            allocation.Sum().Should().Be(75000);
        }

        [Fact]
        public void AllocationArithmetic_RetryProducesTheIdenticalAllocation()
        {
            long[] first = AllocateCentsMirroringProc236(totalCents: 75000, payerCount: 7);
            long[] second = AllocateCentsMirroringProc236(totalCents: 75000, payerCount: 7);

            second.Should().BeEquivalentTo(first, options => options.WithStrictOrdering());
        }

        private static string TestSourceDirectory([System.Runtime.CompilerServices.CallerFilePath] string callerFilePath = "")
        {
            return Path.GetDirectoryName(callerFilePath)!;
        }
    }
}
