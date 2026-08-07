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

        public static List<WorkerShavingsOrderItem> GetWorkerHomeFeed(int workerSystemUserId, int ranchId)
        {
            return ShavingsOrderDAL.GetWorkerHomeShavingsFeed(workerSystemUserId, ranchId);
        }

        // Returns false when the SP's authorization/state guards blocked the write (not the
        // caller's claimed order, or a photo was already recorded) -- see ShavingsOrderDAL.
        // SaveDeliveryPhoto for the ValidationException path that covers the other RN001 guards.
        public static bool SaveDeliveryPhoto(SaveDeliveryPhotoRequest request, int workerSystemUserId)
        {
            if (request.ShavingsOrderId <= 0)
                throw new ArgumentException("מזהה הזמנה לא תקין");

            if (string.IsNullOrWhiteSpace(request.DeliveryPhotoUrl))
                throw new ArgumentException("כתובת התמונה חסרה");

            ShavingsOrderDAL dal = new ShavingsOrderDAL();
            return dal.SaveDeliveryPhoto(request.ShavingsOrderId, request.DeliveryPhotoUrl, DateTime.UtcNow, workerSystemUserId);
        }

        // No-photo delivery fallback (CAP-4): records a delivery without a photo.
        // Returns false when no open order matched (already delivered or nonexistent).
        public static bool MarkDelivered(MarkDeliveredRequest request, int workerSystemUserId)
        {
            if (request.ShavingsOrderId <= 0)
                throw new ArgumentException("מזהה הזמנה לא תקין");

            return ShavingsOrderDAL.MarkDelivered(request.ShavingsOrderId, workerSystemUserId);
        }

        // Standalone shavings cancellation -- three role paths, exact mirror of
        // StallBooking.cs's CancelStallBookingByPayer / AdminCancelStallBooking /
        // SecretaryDeleteStallBooking validation shape.

        public static int CancelShavingsOrderByPayer(int shavingsOrderId, int payerPersonId)
        {
            if (shavingsOrderId <= 0)
            {
                throw new Exception("Invalid ShavingsOrderId");
            }

            if (payerPersonId <= 0)
            {
                throw new Exception("Invalid PayerPersonId");
            }

            return ShavingsOrderDAL.CancelShavingsOrderByPayer(shavingsOrderId, payerPersonId);
        }

        public static int AdminCancelShavingsOrder(int shavingsOrderId, int ranchId, int personId)
        {
            if (shavingsOrderId <= 0)
            {
                throw new Exception("Invalid ShavingsOrderId");
            }

            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (personId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            return ShavingsOrderDAL.AdminCancelShavingsOrder(shavingsOrderId, ranchId, personId);
        }

        public static int SecretaryCancelShavingsOrder(int shavingsOrderId, int secretarySystemUserId, int ranchId)
        {
            if (shavingsOrderId <= 0)
            {
                throw new Exception("Invalid ShavingsOrderId");
            }

            if (secretarySystemUserId <= 0)
            {
                throw new Exception("Invalid SecretarySystemUserId");
            }

            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            return ShavingsOrderDAL.SecretaryCancelShavingsOrder(shavingsOrderId, secretarySystemUserId, ranchId);
        }
    }
}
