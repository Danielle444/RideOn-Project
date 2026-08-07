namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class WorkerShavingsOrderItem
    {
        public int ShavingsOrderId { get; set; }
        public int BagQuantity { get; set; }
        public string? Notes { get; set; }
        public DateTime? RequestedDeliveryTime { get; set; }
        public DateTime? ArrivalTime { get; set; }
        public string DeliveryStatus { get; set; } = string.Empty;
        public string? DeliveryPhotoUrl { get; set; }
        public DateTime? DeliveryPhotoDate { get; set; }
        public string PayerFirstName { get; set; } = string.Empty;
        public string PayerLastName { get; set; } = string.Empty;
        public string? StallNumber { get; set; }
        public string? RanchName { get; set; }
        public int? CompetitionId { get; set; }
        public string? CompetitionName { get; set; }
        public int? WorkerSystemUserId { get; set; }
        public string? WorkerFirstName { get; set; }
        public string? WorkerLastName { get; set; }

        // RanchWorker cancellation lifecycle: own-order state, computed from the shavings
        // order's own productchangerequest (same technique as CompetitionShavingsOrderListItem).
        public bool IsCancelled { get; set; }
        public bool HasPendingCancellation { get; set; }

        // Delivery destination (Slice 1): supersedes StallNumber above, which is now a typed
        // NULL from the proc (legacy compatibility only, no longer backed by a real join).
        // Empty list means no assigned destination yet, not "no data returned".
        public List<ShavingsDestinationCompound> DeliveryDestinations { get; set; } = new();
        public bool HasUnassignedStalls { get; set; }
    }
}
