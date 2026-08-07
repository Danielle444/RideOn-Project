using System.Reflection;
using FluentAssertions;
using RideOnServer.BL;

namespace RideOnServer.Tests
{
    // Competition-visibility-gating-backend, CAP-2: IsVisibleOnPayerBoard's
    // non-enrolled branch used to hide any competition once its effective
    // status moved past Future (i.e. the moment registration opened). Fixed
    // to gate on registration being open instead, via the new private
    // IsRegistrationClosed helper (mirrors web's classesView.utils.js
    // isRegistrationClosed).
    //
    // No mocking framework/HTTP test host exists in this project (same
    // constraint as RescheduleCompetitionContractTests) — IsVisibleOnPayerBoard
    // is a pure, DB-free function, so it is invoked directly via reflection
    // rather than reproduced.
    public class PayerBoardVisibilityTests
    {
        private static readonly MethodInfo IsVisibleMethod =
            typeof(Competition)
                .GetMethod(
                    "IsVisibleOnPayerBoard",
                    BindingFlags.NonPublic | BindingFlags.Static)
            ?? throw new InvalidOperationException(
                "Competition.IsVisibleOnPayerBoard(Competition, DateTime) was not found.");

        private static bool IsVisible(Competition item, DateTime today)
        {
            object? result = IsVisibleMethod.Invoke(null, new object?[] { item, today });
            return (bool)result!;
        }

        private static Competition BuildCompetition(
            string? status,
            DateTime start,
            DateTime end,
            DateTime? registrationEnd,
            bool hasParticipated = false)
        {
            return new Competition
            {
                CompetitionId = 1,
                HostRanchId = 11,
                CompetitionName = "Test",
                CompetitionStatus = status,
                CompetitionStartDate = start,
                CompetitionEndDate = end,
                RegistrationEndDate = registrationEnd,
                HasParticipated = hasParticipated
            };
        }

        private static readonly DateTime Today = new DateTime(2026, 8, 6);

        [Fact]
        public void NonEnrolled_Future_registration_not_open_yet_is_visible()
        {
            Competition item = BuildCompetition(
                status: null,
                start: new DateTime(2026, 9, 1),
                end: new DateTime(2026, 9, 3),
                registrationEnd: new DateTime(2026, 8, 20));

            IsVisible(item, Today).Should().BeTrue();
        }

        [Fact]
        public void NonEnrolled_Active_registration_open_is_visible()
        {
            Competition item = BuildCompetition(
                status: null,
                start: new DateTime(2026, 8, 24),
                end: new DateTime(2026, 8, 29),
                registrationEnd: new DateTime(2026, 8, 20));

            IsVisible(item, Today).Should().BeTrue();
        }

        [Fact]
        public void NonEnrolled_Active_registration_end_date_is_today_is_visible()
        {
            Competition item = BuildCompetition(
                status: null,
                start: new DateTime(2026, 8, 24),
                end: new DateTime(2026, 8, 29),
                registrationEnd: Today);

            IsVisible(item, Today).Should().BeTrue();
        }

        [Fact]
        public void NonEnrolled_after_registration_end_date_is_hidden()
        {
            Competition item = BuildCompetition(
                status: null,
                start: new DateTime(2026, 8, 24),
                end: new DateTime(2026, 8, 29),
                registrationEnd: new DateTime(2026, 8, 5));

            IsVisible(item, Today).Should().BeFalse();
        }

        [Fact]
        public void NonEnrolled_null_registrationEndDate_before_start_is_visible()
        {
            Competition item = BuildCompetition(
                status: null,
                start: new DateTime(2026, 8, 10),
                end: new DateTime(2026, 8, 12),
                registrationEnd: null);

            IsVisible(item, Today).Should().BeTrue();
        }

        [Fact]
        public void NonEnrolled_null_registrationEndDate_on_start_date_is_hidden()
        {
            Competition item = BuildCompetition(
                status: null,
                start: Today,
                end: new DateTime(2026, 8, 9),
                registrationEnd: null);

            IsVisible(item, Today).Should().BeFalse();
        }

        [Fact]
        public void NonEnrolled_Current_inProgress_is_hidden()
        {
            Competition item = BuildCompetition(
                status: null,
                start: new DateTime(2026, 8, 4),
                end: new DateTime(2026, 8, 8),
                registrationEnd: new DateTime(2026, 8, 1));

            IsVisible(item, Today).Should().BeFalse();
        }

        [Fact]
        public void NonEnrolled_Draft_is_hidden()
        {
            Competition item = BuildCompetition(
                status: CompetitionStatuses.Draft,
                start: new DateTime(2026, 9, 1),
                end: new DateTime(2026, 9, 3),
                registrationEnd: null);

            IsVisible(item, Today).Should().BeFalse();
        }

        [Fact]
        public void NonEnrolled_Cancelled_is_hidden()
        {
            Competition item = BuildCompetition(
                status: CompetitionStatuses.Cancelled,
                start: new DateTime(2026, 9, 1),
                end: new DateTime(2026, 9, 3),
                registrationEnd: null);

            IsVisible(item, Today).Should().BeFalse();
        }

        [Fact]
        public void Enrolled_branch_remains_unchanged_active_and_future_always_visible()
        {
            Competition activeItem = BuildCompetition(
                status: null,
                start: new DateTime(2026, 8, 24),
                end: new DateTime(2026, 8, 29),
                registrationEnd: new DateTime(2026, 8, 1),
                hasParticipated: true);

            Competition currentItem = BuildCompetition(
                status: null,
                start: new DateTime(2026, 8, 4),
                end: new DateTime(2026, 8, 8),
                registrationEnd: new DateTime(2026, 8, 1),
                hasParticipated: true);

            IsVisible(activeItem, Today).Should().BeTrue(
                "an enrolled competition is shown regardless of registration state");
            IsVisible(currentItem, Today).Should().BeTrue(
                "an enrolled in-progress competition is still shown");
        }

        [Fact]
        public void Enrolled_cancelled_linger_behavior_remains_unchanged()
        {
            Competition withinLinger = BuildCompetition(
                status: CompetitionStatuses.Cancelled,
                start: new DateTime(2026, 7, 18),
                end: new DateTime(2026, 7, 20),
                registrationEnd: null,
                hasParticipated: true);

            Competition pastLinger = BuildCompetition(
                status: CompetitionStatuses.Cancelled,
                start: new DateTime(2026, 5, 1),
                end: new DateTime(2026, 5, 3),
                registrationEnd: null,
                hasParticipated: true);

            IsVisible(withinLinger, Today).Should().BeTrue(
                "cancelled+enrolled lingers 30 days past the competition end date");
            IsVisible(pastLinger, Today).Should().BeFalse(
                "cancelled+enrolled must disappear once the 30-day linger window passes");
        }
    }
}
