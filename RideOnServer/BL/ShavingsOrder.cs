using RideOnServer.BL.DTOs.ShavingsOrders;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class ShavingsOrder : ProductRequest
    {
        public int? WorkerSystemUserId { get; set; }

        public short? BagQuantity { get; set; }

        public DateTime? RequestedDeliveryTime { get; set; }

        public DateTime? ArrivalTime { get; set; }

        public DateTime? ResponseTime { get; set; }

        public string DeliveryStatus { get; set; } = "Pending";

        public string? DeliveryPhotoUrl { get; set; }

        public DateTime? DeliveryPhotoDate { get; set; }

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

        // No-photo delivery fallback (CAP-4): records a delivery without a photo.
        // Returns false when no open order matched (already delivered or nonexistent).
        public static bool MarkDelivered(MarkDeliveredRequest request)
        {
            if (request.ShavingsOrderId <= 0)
                throw new ArgumentException("מזהה הזמנה לא תקין");

            return ShavingsOrderDAL.MarkDelivered(request.ShavingsOrderId);
        }
    }
}
