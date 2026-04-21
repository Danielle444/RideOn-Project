using RideOnServer.BL.DTOs.Horses;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Horse
    {
        public int HorseId { get; set; }

        public int RanchId { get; set; }

        public string HorseName { get; set; }

        public string? BarnName { get; set; }

        public string? FederationNumber { get; set; }

        public string? ChipNumber { get; set; }

        public short? BirthYear { get; set; }

        public string? Gender { get; set; }


        internal static List<HorseListItem> GetHorsesByRanch(GetHorsesFiltersRequest filters)
        {
            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            HorseDAL dal = new HorseDAL();
            return dal.GetHorsesByRanch(filters);
        }

        internal static void UpdateHorseBarnName(UpdateHorseBarnNameRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.HorseId <= 0)
            {
                throw new Exception("Invalid HorseId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            HorseDAL dal = new HorseDAL();
            dal.UpdateHorseBarnName(request);
        }

        internal static List<CompetitionHorseListItem> GetHorsesForCompetition(GetCompetitionHorsesFiltersRequest filters)
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

            HorseDAL dal = new HorseDAL();
            return dal.GetHorsesForCompetition(filters);
        }




    }
}