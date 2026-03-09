namespace RideOnServer.BL
{
    public class ShavingsOrder : ProductRequest
    {
        public short? BagQuantity { get; set; }

        public DateTime? DeliveryTime { get; set; }
    }
}