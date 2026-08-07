namespace RideOnServer.BL.DTOs.Payers
{
    public class AnswerPayerManagerRequest
    {
        public int PersonId { get; set; }

        public int AdminPersonId { get; set; }

        public string AnswerStatus { get; set; } = string.Empty;
    }
}
