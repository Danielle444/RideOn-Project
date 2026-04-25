namespace RideOnServer.BL.DTOs.Horses
{
    public class SaveHealthCertificateRequest
    {
        public int HorseId { get; set; }
        public int CompetitionId { get; set; }
        public int RanchId { get; set; }
        public string HcPath { get; set; } = string.Empty;
    }
}