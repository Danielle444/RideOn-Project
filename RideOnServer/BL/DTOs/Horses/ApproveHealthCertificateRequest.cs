namespace RideOnServer.BL.DTOs.Horses
{
    public class ApproveHealthCertificateRequest
    {
        public int HorseId { get; set; }
        public int CompetitionId { get; set; }
        public int RanchId { get; set; }
    }
}