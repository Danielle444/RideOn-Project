namespace RideOnServer.BL.DTOs.ChangeEntryRequest
{
    // Read-only authorization facts for POST /api/ChangeEntryRequests,
    // sourced from usp_getchangeentryrequestauthorizationcontext (218).
    // ChangeEntryRequestsController.Create branches on these booleans
    // directly - no exception-text parsing is used for pre-write
    // classification (404/400/403/409).
    public class ChangeEntryRequestAuthorizationContext
    {
        public bool EntryExists { get; set; }

        public int? ActualCompetitionId { get; set; }

        public int? HostRanchId { get; set; }

        public DateTime? CompetitionEndDate { get; set; }

        public bool IsCompetitionEnded { get; set; }

        public bool IsRanchAdminInHostRanch { get; set; }

        public bool IsCreatedByAdmin { get; set; }

        public bool IsOwnedThroughManagedPayer { get; set; }

        public bool IsWithinModelCScope { get; set; }

        public bool NewEntryExists { get; set; }

        public int? NewEntryCompetitionId { get; set; }

        public int? NewEntryHostRanchId { get; set; }

        public bool NewEntryCreatedByAdmin { get; set; }
    }
}
