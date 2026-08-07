namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class AdminCancelEntryResult
    {
        public int ChangeEntryRequestId { get; set; }

        // "Cancelled" | "CancelledAfterStart"
        public string EntryStatus { get; set; } = string.Empty;
    }
}
