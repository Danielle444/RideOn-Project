using System.Text.Json;

namespace RideOnServer.BL.DTOs.Competition.PaidTimeRequests
{
    public class BulkCreatePaidTimeRequestsRequest
    {
        public int OrderedBySystemUserId { get; set; }

        public int RanchId { get; set; }

        public int CompetitionId { get; set; }

        public List<BulkPaidTimeRequestItem> Items { get; set; } = new List<BulkPaidTimeRequestItem>();

        public JsonElement? Metadata { get; set; }

        public bool ConfirmedOverflow { get; set; } = false;
    }
}
