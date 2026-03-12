namespace RideOnServer.BL
{
    public class Notification
    {
        public int NotificationId { get; set; }

        public int NotificationTypeId { get; set; }

        public string NotificationContent { get; set; }

        public DateTime? SendDate { get; set; }

        public DateTime CreatedDateTime { get; set; }

        public string? Status { get; set; }
    }
}