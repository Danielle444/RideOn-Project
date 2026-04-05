using RideOnServer.BL.DTOs.Competition;
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
            List<Competition> list = dal.GetCompetitionsByHostRanch(filters);

            foreach (Competition item in list)
            {
                item.CompetitionStatus = CalculateEffectiveStatus(item);
            }

            return list;
        }

        internal static Competition? GetCompetitionById(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            CompetitionDAL dal = new CompetitionDAL();
            Competition? competition = dal.GetCompetitionById(competitionId);

            if (competition != null)
            {
                competition.CompetitionStatus = CalculateEffectiveStatus(competition);
            }

            return competition;
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
                CompetitionStatus = CompetitionStatuses.Draft,
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

            string? normalizedStatus = NormalizeManualStatus(request.CompetitionStatus);

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
                CompetitionStatus = normalizedStatus,
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

        private static string? NormalizeManualStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status))
            {
                return null;
            }

            string trimmed = status.Trim();

            if (trimmed == CompetitionStatuses.Draft)
            {
                return CompetitionStatuses.Draft;
            }

            if (trimmed == CompetitionStatuses.Cancelled)
            {
                return CompetitionStatuses.Cancelled;
            }

            return null;
        }

        private static string CalculateEffectiveStatus(Competition competition)
        {
            string savedStatus = competition.CompetitionStatus?.Trim() ?? string.Empty;
            DateTime today = DateTime.Today;

            if (savedStatus == CompetitionStatuses.Draft)
            {
                return CompetitionStatuses.Draft;
            }

            if (savedStatus == CompetitionStatuses.Cancelled)
            {
                return CompetitionStatuses.Cancelled;
            }

            if (today > competition.CompetitionEndDate.Date)
            {
                return CompetitionStatuses.Finished;
            }

            if (today >= competition.CompetitionStartDate.Date &&
                today <= competition.CompetitionEndDate.Date)
            {
                return CompetitionStatuses.Current;
            }

            if (competition.RegistrationOpenDate.HasValue)
            {
                if (today < competition.RegistrationOpenDate.Value.Date)
                {
                    return CompetitionStatuses.Future;
                }

                if (today >= competition.RegistrationOpenDate.Value.Date &&
                    today < competition.CompetitionStartDate.Date)
                {
                    return CompetitionStatuses.Active;
                }
            }

            if (today < competition.CompetitionStartDate.Date)
            {
                return CompetitionStatuses.Future;
            }

            return CompetitionStatuses.Future;
        }
    }
}