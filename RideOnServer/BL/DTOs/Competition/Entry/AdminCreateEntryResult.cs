namespace RideOnServer.BL.DTOs.Competition.Entry
{
    // Maps usp_admincreateentry's TABLE(resulttype, entryid, createentryrequestid)
    // return shape 1:1. Identical whether the row was freshly computed or
    // replayed from a prior identical OperationId submission -- a caller
    // cannot and should not distinguish the two.
    public class AdminCreateEntryResult
    {
        // "DirectCreated" | "PendingCreateApproval"
        public string ResultType { get; set; } = string.Empty;

        public int EntryId { get; set; }

        // Non-null only for "PendingCreateApproval".
        public int? CreateEntryRequestId { get; set; }
    }
}
