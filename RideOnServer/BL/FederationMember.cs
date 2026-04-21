using RideOnServer.BL.DTOs.FederationMembers;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class FederationMember : Person
    {
        public bool? HasValidMembership { get; set; }

        public DateTime? MedicalCheckValidUntil { get; set; }

        public string? CertificationLevel { get; set; }

        internal static List<CompetitionFederationMemberListItem> GetCompetitionRidersByRanch(
            GetCompetitionFederationMembersFiltersRequest filters)
        {
            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (filters.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            FederationMemberDAL dal = new FederationMemberDAL();
            return dal.GetCompetitionRidersByRanch(filters);
        }

        internal static List<CompetitionFederationMemberListItem> GetCompetitionTrainersByRanch(
            GetCompetitionFederationMembersFiltersRequest filters)
        {
            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (filters.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            FederationMemberDAL dal = new FederationMemberDAL();
            return dal.GetCompetitionTrainersByRanch(filters);
        }

        internal static List<CompetitionFederationMemberListItem> GetRidersByRanch(
            GetRanchFederationMembersFiltersRequest filters)
        {
            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            FederationMemberDAL dal = new FederationMemberDAL();
            return dal.GetRidersByRanch(filters);
        }

        internal static List<CompetitionFederationMemberListItem> GetTrainersByRanch(
            GetRanchFederationMembersFiltersRequest filters)
        {
            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            FederationMemberDAL dal = new FederationMemberDAL();
            return dal.GetTrainersByRanch(filters);
        }
    }
}