namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class AdminEditEntryResult
    {
        // "DirectUpdated" | "DirectReplaced" | "PendingReplaceApproval"
        public string ResultType { get; set; } = string.Empty;

        // DirectUpdated: the original entry, updated in place.
        // DirectReplaced / PendingReplaceApproval: the new replacement entry.
        public int EntryId { get; set; }

        // Populated only for PendingReplaceApproval.
        public int? ChangeEntryRequestId { get; set; }
    }
}
