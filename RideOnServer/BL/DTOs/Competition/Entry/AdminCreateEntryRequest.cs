namespace RideOnServer.BL.DTOs.Competition.Entry
{
    // Stage B: admin-direct entry creation, routed server-side to either an
    // immediate Active entry or a secretary-bound Proposed entry depending on
    // live registration state. Distinct from CreateEntryRequest (POST
    // /Entries), which is left completely unchanged.
    //
    // Deliberately carries NO actor-identity field. CreateEntryRequest's
    // OrderedBySystemUserId property is a settable, JSON-bindable field that
    // the controller happens to overwrite after binding -- a client can still
    // populate it in the request body, it is simply ignored. This DTO closes
    // that gap by construction: personId is never a property here at all, so
    // it cannot be bound from JSON, "trusted then overwritten", or
    // accidentally left un-overwritten by a future edit. The JWT-derived
    // personId is threaded as a separate method parameter all the way from
    // EntriesController through Entry.AdminCreateEntry to
    // EntryDAL.AdminCreateEntry/BuildAdminCreateEntryCommand -- the same
    // separate-parameter shape already used elsewhere in this codebase for
    // actor ids (e.g. Entry.SecretaryDeleteEntry(entryId, secretarySystemUserId)),
    // not a new pattern.
    public class AdminCreateEntryRequest
    {
        // Client-generated, immutable per submission. See
        // RideOnServer.DAL.EntryDAL.BuildAdminCreateEntryCommand for the
        // idempotency contract.
        public string OperationId { get; set; } = string.Empty;

        // Client-supplied, cross-checked server-side against the class's
        // actual competition inside usp_admincreateentry -- never trusted
        // blindly.
        public int CompetitionId { get; set; }

        // Client-supplied active-ranch context, verified via
        // UserAccessValidator.EnsureUserHasRoleInRanch in the controller --
        // same pattern as CreateEntryRequest.RanchId.
        public int RanchId { get; set; }

        public int ClassInCompId { get; set; }

        public int HorseId { get; set; }

        public int RiderFederationMemberId { get; set; }

        public int? CoachFederationMemberId { get; set; }

        public int PaidByPersonId { get; set; }

        public string? PrizeRecipientName { get; set; }
    }
}
