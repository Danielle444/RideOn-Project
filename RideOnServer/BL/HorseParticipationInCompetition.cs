using RideOnServer.BL.DTOs.Horses;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class HorseParticipationInCompetition
    {
        public int HorseId { get; set; }

        public int CompetitionId { get; set; }

        public string? HCApprovalStatus { get; set; }

        public DateTime? HCApprovalDate { get; set; }

        public string? HCPath { get; set; }

        public DateTime? HCUploadDate { get; set; }

        public int? HCApproverSystemUserId { get; set; }

        public static List<HealthCertificateItem> GetHealthCertificatesForCompetition(int competitionId)
        {
            HorseDAL dal = new HorseDAL();
            return dal.GetHealthCertificatesForCompetition(competitionId);
        }

        public static void SaveHealthCertificate(SaveHealthCertificateRequest request)
        {
            if (request.HorseId <= 0 || request.CompetitionId <= 0)
                throw new ArgumentException("מזהה סוס או תחרות לא תקין");

            if (string.IsNullOrWhiteSpace(request.HcPath))
                throw new ArgumentException("כתובת הקובץ חסרה");

            HorseDAL dal = new HorseDAL();
            dal.SaveHealthCertificate(request.HorseId, request.CompetitionId, request.HcPath, DateTime.UtcNow);
        }

        public static void ApproveHealthCertificate(ApproveHealthCertificateRequest request, int approverSystemUserId)
        {
            if (request.HorseId <= 0 || request.CompetitionId <= 0)
                throw new ArgumentException("מזהה סוס או תחרות לא תקין");

            HorseDAL dal = new HorseDAL();
            dal.ApproveHealthCertificate(request.HorseId, request.CompetitionId, approverSystemUserId);
        }
    }
}
