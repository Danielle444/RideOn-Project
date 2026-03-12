namespace RideOnServer.BL
{
    public class MessageForCompetition
    {
        public int MessageId { get; set; }

        public string MessageContent { get; set; }

        public DateTime? SendDate { get; set; }

        public DateTime CreatedDateTime { get; set; }

        public string? Status { get; set; }
    }
}