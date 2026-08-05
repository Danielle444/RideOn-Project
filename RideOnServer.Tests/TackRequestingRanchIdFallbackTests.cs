using FluentAssertions;
using RideOnServer.Controllers;

namespace RideOnServer.Tests
{
    // Backward-compat fix (2026-08-06): the currently-installed mobile client
    // sends RanchId for the tack flow's requesting/guest ranch (it predates
    // RequestingRanchId existing at all). StallBookingsController.CreateTackStallBookings
    // now resolves the two into one value via
    // StallBookingsController.ResolveTackRequestingRanchId before authorizing
    // or calling the DAL. That resolution is pure and side-effect-free, so
    // unlike the rest of this controller (verified via source-text reads in
    // StallBookingRanchModelAuthorizationTests.cs, since this project avoids
    // mocking/an HTTP test host) it is tested here by direct invocation.
    public class TackRequestingRanchIdFallbackTests
    {
        [Fact]
        public void NewClient_RequestingRanchIdSupplied_IsUsed()
        {
            int result = StallBookingsController.ResolveTackRequestingRanchId(
                requestingRanchId: 7, ranchId: 0);

            result.Should().Be(7);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        public void OldClient_RequestingRanchIdMissingOrZero_FallsBackToRanchId(int requestingRanchId)
        {
            int result = StallBookingsController.ResolveTackRequestingRanchId(
                requestingRanchId, ranchId: 11);

            result.Should().Be(11);
        }

        [Fact]
        public void BothSupplied_RequestingRanchIdWins()
        {
            int result = StallBookingsController.ResolveTackRequestingRanchId(
                requestingRanchId: 7, ranchId: 11);

            // 7 and 11 are deliberately different values -- proves real
            // precedence, not a coincidental match.
            result.Should().Be(7);
        }

        [Theory]
        [InlineData(0, 0)]
        [InlineData(-1, 0)]
        [InlineData(0, -1)]
        public void NeitherValid_ResolvesToNonPositive_SoTheCallerRejectsBeforeAuthorizingOrCallingTheDal(
            int requestingRanchId, int ranchId)
        {
            int result = StallBookingsController.ResolveTackRequestingRanchId(requestingRanchId, ranchId);

            // The controller's own guard is `if (resolvedRequestingRanchId <= 0)
            // return BadRequest(...)` -- proving this resolves to <= 0 proves
            // that guard actually fires for this input, before any
            // authorization check or DAL call is reached.
            result.Should().BeLessOrEqualTo(0);
        }
    }
}
