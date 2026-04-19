namespace RideOnServer.BL.DTOs.Horses
{
    public class HealthCertificateItem
    {
        public int HorseId { get; set; }
        public string HorseName { get; set; } = string.Empty;
        public string? BarnName { get; set; }
        public string? HcPath { get; set; }
        public DateTime? HcUploadDate { get; set; }
        public string? HcApprovalStatus { get; set; }
        public DateOnly? HcApprovalDate { get; set; }
        public int? HcApproverSystemUserId { get; set; }
    }
}
