namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class SaveDeliveryPhotoRequest
    {
        public int ShavingsOrderId { get; set; }
        public string DeliveryPhotoUrl { get; set; } = string.Empty;
    }
}
