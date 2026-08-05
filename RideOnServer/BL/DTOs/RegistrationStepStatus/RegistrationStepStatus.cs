namespace RideOnServer.BL.DTOs.RegistrationStepStatus
{
    // Read-side personalized status for the RanchAdmin mobile four-tab workflow
    // (Classes / Paid Times / Stalls / Shavings). Every field is computed fresh
    // by usp_GetRegistrationStepStatus -- nothing here is derived further on the
    // server; the client's shared availability model maps these booleans/dates
    // to per-tab isVisible/isEnabled/isReadOnly/unavailableReason state.
    //
    // All fields are nullable: a null object as a whole (see
    // RegistrationStepStatusController) means the competition/ranch pair could
    // not be resolved. Individual fields are not expected to be null once a row
    // is returned, except PaidTimeRegistrationDate, which is genuinely optional
    // on the competition itself.
    public sealed class RegistrationStepStatus
    {
        public DateTime? CompetitionEndDate { get; init; }
        public bool? IsCompetitionEnded { get; init; }

        public DateTime? PaidTimeRegistrationDate { get; init; }
        public bool? HasPaidTimeSlots { get; init; }
        public bool? HasActivePaidTimePrice { get; init; }
        public bool? PaidTimeConfigured { get; init; }
        public bool? PaidTimeReadyToBook { get; init; }
        public bool? IsPaidTimeWindowOpen { get; init; }

        public bool? HasAdminCreatedActiveEntry { get; init; }
        public bool? HasManagedPayerWithActiveEntry { get; init; }
        public bool? HasRelevantActiveEntry { get; init; }

        public bool? HasAdminCreatedActiveNonTackStallBooking { get; init; }
        public bool? HasManagedPayerWithActiveNonTackStallBooking { get; init; }
        public bool? HasRelevantActiveNonTackStallBooking { get; init; }

        // Distinct, independent signal from IsCompetitionEnded -- computed from
        // registrationEndDate/competitionStartDate, not competitionEndDate. Added
        // last on the proc's RETURNS TABLE; read via the same absent-column-tolerant
        // pattern as every other field here, so an old deployed backend against a
        // migrated DB (or vice versa) degrades to null rather than throwing.
        public bool? IsRegistrationEnded { get; init; }
    }
}
