using RideOnServer.BL.DTOs;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Competition
    {
        public int CompetitionId { get; set; }
        public int HostRanchId { get; set; }
        public byte FieldId { get; set; }
        public int CreatedBySystemUserId { get; set; }
        public string CompetitionName { get; set; } = string.Empty;
        public DateTime CompetitionStartDate { get; set; }
        public DateTime CompetitionEndDate { get; set; }
        public DateTime? RegistrationOpenDate { get; set; }
        public DateTime? RegistrationEndDate { get; set; }
        public DateTime? PaidTimeRegistrationDate { get; set; }
        public DateTime? PaidTimePublicationDate { get; set; }
        public string? CompetitionStatus { get; set; }
        public string? Notes { get; set; }
        public string? StallMapUrl { get; set; }
        public string? FieldName { get; set; }

        internal static List<Competition> GetCompetitionsByHostRanch(CompetitionFiltersRequest filters)
        {
            if (filters.RanchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            CompetitionDAL dal = new CompetitionDAL();
            return dal.GetCompetitionsByHostRanch(filters);
        }

        internal static Competition? GetCompetitionById(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            CompetitionDAL dal = new CompetitionDAL();
            return dal.GetCompetitionById(competitionId);
        }

        internal static int CreateCompetition(CreateCompetitionRequest request, int createdBySystemUserId)
        {
            ValidateCompetitionRequest(
                request.CompetitionName,
                request.FieldId,
                request.CompetitionStartDate,
                request.CompetitionEndDate,
                request.RegistrationOpenDate,
                request.RegistrationEndDate
            );

            if (request.HostRanchId <= 0)
            {
                throw new Exception("HostRanchId is invalid");
            }

            CompetitionDAL dal = new CompetitionDAL();

            Competition competition = new Competition
            {
                HostRanchId = request.HostRanchId,
                FieldId = request.FieldId,
                CreatedBySystemUserId = createdBySystemUserId,
                CompetitionName = request.CompetitionName.Trim(),
                CompetitionStartDate = request.CompetitionStartDate,
                CompetitionEndDate = request.CompetitionEndDate,
                RegistrationOpenDate = request.RegistrationOpenDate,
                RegistrationEndDate = request.RegistrationEndDate,
                PaidTimeRegistrationDate = request.PaidTimeRegistrationDate,
                PaidTimePublicationDate = request.PaidTimePublicationDate,
                CompetitionStatus = string.IsNullOrWhiteSpace(request.CompetitionStatus)
                    ? "Draft"
                    : request.CompetitionStatus.Trim(),
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
            };

            return dal.InsertCompetition(competition);
        }

        internal static void UpdateCompetition(UpdateCompetitionRequest request)
        {
            if (request.CompetitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            ValidateCompetitionRequest(
                request.CompetitionName,
                request.FieldId,
                request.CompetitionStartDate,
                request.CompetitionEndDate,
                request.RegistrationOpenDate,
                request.RegistrationEndDate
            );

            CompetitionDAL dal = new CompetitionDAL();

            Competition competition = new Competition
            {
                CompetitionId = request.CompetitionId,
                HostRanchId = request.HostRanchId,
                FieldId = request.FieldId,
                CompetitionName = request.CompetitionName.Trim(),
                CompetitionStartDate = request.CompetitionStartDate,
                CompetitionEndDate = request.CompetitionEndDate,
                RegistrationOpenDate = request.RegistrationOpenDate,
                RegistrationEndDate = request.RegistrationEndDate,
                PaidTimeRegistrationDate = request.PaidTimeRegistrationDate,
                PaidTimePublicationDate = request.PaidTimePublicationDate,
                CompetitionStatus = string.IsNullOrWhiteSpace(request.CompetitionStatus)
                    ? null
                    : request.CompetitionStatus.Trim(),
                Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim()
            };

            dal.UpdateCompetition(competition);
        }

        private static void ValidateCompetitionRequest(
            string competitionName,
            byte fieldId,
            DateTime competitionStartDate,
            DateTime competitionEndDate,
            DateTime? registrationOpenDate,
            DateTime? registrationEndDate)
        {
            if (string.IsNullOrWhiteSpace(competitionName))
            {
                throw new Exception("Competition name is required");
            }

            if (fieldId <= 0)
            {
                throw new Exception("FieldId is invalid");
            }

            if (competitionEndDate < competitionStartDate)
            {
                throw new Exception("Competition end date cannot be earlier than start date");
            }

            if (registrationOpenDate.HasValue && registrationEndDate.HasValue &&
                registrationEndDate.Value < registrationOpenDate.Value)
            {
                throw new Exception("Registration end date cannot be earlier than registration open date");
            }
        }
    }
}