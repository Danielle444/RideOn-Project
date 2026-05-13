using RideOnServer.BL;

namespace RideOnServer.BL.Services
{
    public static class FineResolver
    {
        public static Fine? ResolveFine(
            Competition competition,
            string fineReason,
            DateTime currentDateTime
        )
        {
            if (competition == null)
            {
                return null;
            }

            List<Fine> activePolicies =
                Fine.GetActiveFinePolicies();

            Fine? matchingPolicy =
                activePolicies.FirstOrDefault(policy =>
                    !string.IsNullOrWhiteSpace(policy.FineReason)
                    &&
                    policy.FineReason.Trim().Equals(
                        fineReason,
                        StringComparison.OrdinalIgnoreCase
                    )
                    &&
                    PolicyMatches(
                        policy,
                        competition,
                        currentDateTime
                    )
                );

            return matchingPolicy;
        }

        private static bool PolicyMatches(
            Fine policy,
            Competition competition,
            DateTime currentDateTime
        )
        {
            string triggerMode =
                policy.TriggerMode?.Trim()
                ?? "None";

            switch (triggerMode)
            {
                case "None":
                    return true;

                case "After":
                    return IsAfterEvent(
                        currentDateTime,
                        competition,
                        policy.StartEvent
                    );

                case "Between":
                    return IsBetweenEvents(
                        currentDateTime,
                        competition,
                        policy.StartEvent,
                        policy.EndEvent
                    );

                default:
                    return false;
            }
        }

        private static bool IsAfterEvent(
            DateTime currentDateTime,
            Competition competition,
            string? startEvent
        )
        {
            DateTime? eventDate =
                GetEventDate(
                    competition,
                    startEvent
                );

            if (eventDate == null)
            {
                return false;
            }

            return currentDateTime >= eventDate.Value;
        }

        private static bool IsBetweenEvents(
            DateTime currentDateTime,
            Competition competition,
            string? startEvent,
            string? endEvent
        )
        {
            DateTime? startDate =
                GetEventDate(
                    competition,
                    startEvent
                );

            DateTime? endDate =
                GetEventDate(
                    competition,
                    endEvent
                );

            if (
                startDate == null
                || endDate == null
            )
            {
                return false;
            }

            return
                currentDateTime >= startDate.Value
                &&
                currentDateTime < endDate.Value;
        }

        private static DateTime? GetEventDate(
            Competition competition,
            string? eventName
        )
        {
            switch (eventName)
            {
                case "RegistrationEnd":
                    return competition.RegistrationEndDate;

                case "CompetitionStart":
                    return competition.CompetitionStartDate;

                default:
                    return null;
            }
        }
    }
}