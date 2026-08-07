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

        public static List<HealthCertificateItem> GetHealthCertificatesForCompetition(
            int competitionId,
            int ranchId
        )
        {
            if (competitionId <= 0)
            {
                throw new ArgumentException("מזהה תחרות לא תקין");
            }

            if (ranchId <= 0)
            {
                throw new ArgumentException("מזהה חווה לא תקין");
            }

            HorseDAL dal = new HorseDAL();

            return dal.GetHealthCertificatesForCompetition(
                competitionId,
                ranchId
            );
        }

        // Competition-wide read for the HostSecretary of the hosting ranch: every
        // participating horse, visiting ranches included.
        //
        // No ranch id, and no authorization here. Whether a caller is entitled to
        // this scope is decided in HorsesController, which is where this project
        // keeps role and ranch checks - see GetHealthCertificatesForCompetition
        // above, which likewise validates only its arguments.
        public static List<HealthCertificateItem> GetHealthCertificatesForHostedCompetition(
            int competitionId
        )
        {
            if (competitionId <= 0)
            {
                throw new ArgumentException("מזהה תחרות לא תקין");
            }

            HorseDAL dal = new HorseDAL();

            return dal.GetHealthCertificatesForHostedCompetition(competitionId);
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

        // Returns true only when the certificate was actually eligible and got
        // approved (see HorseDAL.ApproveHealthCertificate / repo file 186). No
        // eligibility logic is duplicated here - the stored procedure is the sole
        // source of truth for what counts as an approvable row.
        public static bool ApproveHealthCertificate(ApproveHealthCertificateRequest request, int approverSystemUserId)
        {
            if (request.HorseId <= 0 || request.CompetitionId <= 0)
                throw new ArgumentException("מזהה סוס או תחרות לא תקין");

            HorseDAL dal = new HorseDAL();
            return dal.ApproveHealthCertificate(request.HorseId, request.CompetitionId, approverSystemUserId);
        }

        // Returns true only when the certificate was actually eligible and got
        // rejected (see HorseDAL.RejectHealthCertificate / repo file 245). No
        // eligibility logic is duplicated here - the stored procedure is the sole
        // source of truth for what counts as a rejectable row, matching
        // ApproveHealthCertificate above.
        //
        // The reason is validated and trimmed here, not in SQL - the same
        // division of responsibility this class already uses for its other
        // argument checks (SaveHealthCertificate's HcPath check above). The
        // table's CHECK constraint (ck_horseparticipationincompetition_
        // approvalconsistency) also requires a non-blank reason, but that is
        // defense-in-depth, not the primary gate a caller is expected to hit.
        public static bool RejectHealthCertificate(RejectHealthCertificateRequest request, int rejectedBySystemUserId)
        {
            if (request.HorseId <= 0 || request.CompetitionId <= 0)
                throw new ArgumentException("מזהה סוס או תחרות לא תקין");

            if (string.IsNullOrWhiteSpace(request.Reason))
                throw new ArgumentException("יש להזין סיבת דחייה");

            HorseDAL dal = new HorseDAL();
            return dal.RejectHealthCertificate(
                request.HorseId,
                request.CompetitionId,
                rejectedBySystemUserId,
                request.Reason.Trim());
        }
    }
}
