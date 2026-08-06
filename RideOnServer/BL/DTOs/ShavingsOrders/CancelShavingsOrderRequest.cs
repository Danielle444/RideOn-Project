namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class CancelShavingsOrderRequest
    {
        public int ShavingsOrderId { get; set; }

        public int RanchId { get; set; }
    }
}
