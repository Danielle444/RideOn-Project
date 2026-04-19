using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class ShavingsOrder : ProductRequest
    {
        public int? WorkerSystemUserId { get; set; }

        public byte BagQuantity { get; set; }

        public DateTime? RequestedDeliveryTime { get; set; }

        public DateTime? ArrivalTime { get; set; }

        public DateTime? ResponseTime { get; set; }

        public static List<WorkerShavingsOrderItem> GetWorkerShavingsOrders(int workerSystemUserId)
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();
            return dal.GetWorkerShavingsOrders(workerSystemUserId);
        }

        public static void SaveDeliveryPhoto(SaveDeliveryPhotoRequest request)
        {
            if (request.ShavingsOrderId <= 0)
                throw new ArgumentException("מזהה הזמנה לא תקין");

            if (string.IsNullOrWhiteSpace(request.DeliveryPhotoUrl))
                throw new ArgumentException("כתובת התמונה חסרה");

            ShavingsOrderDAL dal = new ShavingsOrderDAL();
            dal.SaveDeliveryPhoto(request.ShavingsOrderId, request.DeliveryPhotoUrl, DateTime.UtcNow);
        }

        public static List<PendingDeliveryApprovalItem> GetPendingDeliveryApprovals(int ranchId)
        {
            ShavingsOrderDAL dal = new ShavingsOrderDAL();
            return dal.GetPendingDeliveryApprovals(ranchId);
        }

        public static void ApproveDelivery(ApproveDeliveryRequest request)
        {
            if (request.ShavingsOrderId <= 0)
                throw new ArgumentException("מזהה הזמנה לא תקין");

            if (request.ApprovedByPersonId <= 0)
                throw new ArgumentException("מזהה מאשר לא תקין");

            ShavingsOrderDAL dal = new ShavingsOrderDAL();
            dal.ApproveDelivery(request.ShavingsOrderId, request.ApprovedByPersonId, DateTime.UtcNow);
        }
    }
}
