namespace RideOnServer.BL.DTOs.Competition.Entry
{
    // Stage C: admin-direct entry edit, routed server-side to an in-place
    // update, an immediately-activated replacement, or a secretary-bound
    // Proposed replacement, depending on whether the requested class
    // differs from the entry's actual current class and on live
    // registration state. Mirrors AdminCreateEntryRequest's shape and its
    // deliberate omission of any actor-identity field -- personId is
    // threaded as a separate method parameter, never bound from the
    // request body. See EntriesController.AdminEditEntry.
    //
    // Payer reassignment is out of scope for this slice: there is no
    // PaidByPersonId field here. The replacement entry (when one is
    // created) always inherits the original entry's existing payer.
    public class AdminEditEntryRequest
    {
        public int EntryId { get; set; }

        // Cross-checked server-side against the class's actual competition
        // inside usp_admineditentry -- never trusted blindly.
        public int CompetitionId { get; set; }

        // Verified via UserAccessValidator.EnsureUserHasRoleInRanch in the
        // controller -- same pattern as AdminCreateEntryRequest.RanchId.
        public int RanchId { get; set; }

        public int ClassInCompId { get; set; }

        public int HorseId { get; set; }

        public int RiderFederationMemberId { get; set; }

        public int? CoachFederationMemberId { get; set; }

        public string? PrizeRecipientName { get; set; }
    }
}
