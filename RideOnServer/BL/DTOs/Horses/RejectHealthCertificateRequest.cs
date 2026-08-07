namespace RideOnServer.BL.DTOs.Horses
{
    public class RejectHealthCertificateRequest
    {
        public int HorseId { get; set; }
        public int CompetitionId { get; set; }
        public int RanchId { get; set; }
        public string Reason { get; set; } = string.Empty;
    }
}
