namespace RideOnServer.BL
{
    public class ShavingsOrder : ProductRequest
    {
        public int? WorkerSystemUserId { get; set; }

        public byte BagQuantity { get; set; }

        public DateTime? RequestedDeliveryTime { get; set; }

        public DateTime? ArrivalTime { get; set; }

        public DateTime? ResponseTime { get; set; }
    }
}