namespace RideOnServer.BL.DTOs.ShavingsOrders
{
    public class ApproveDeliveryRequest
    {
        public int ShavingsOrderId { get; set; }
        public int ApprovedByPersonId { get; set; }
    }
}
