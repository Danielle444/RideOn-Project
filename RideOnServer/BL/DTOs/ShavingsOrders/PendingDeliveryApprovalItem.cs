namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class PendingDeliveryApprovalItem
    {
        public int ShavingsOrderId { get; set; }
        public int BagQuantity { get; set; }
        public string? Notes { get; set; }
        public string? DeliveryPhotoUrl { get; set; }
        public DateTime? DeliveryPhotoDate { get; set; }
        public string PayerFirstName { get; set; } = string.Empty;
        public string PayerLastName { get; set; } = string.Empty;
        public string? StallNumber { get; set; }
        public string WorkerFirstName { get; set; } = string.Empty;
        public string WorkerLastName { get; set; } = string.Empty;
    }
}
