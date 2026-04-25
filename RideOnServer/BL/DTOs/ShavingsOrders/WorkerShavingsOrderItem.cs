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
        public string? CompetitionName { get; set; }
    }
}
