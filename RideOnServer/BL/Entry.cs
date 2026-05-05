using RideOnServer.BL.DTOs.Competition.Entry;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Entry : ServiceRequest
    {
        public int ClassInCompId { get; set; }

        public int? FineId { get; set; }

        public string? PrizeRecipientName { get; set; }

        public byte? DrawOrder { get; set; }

        public static int CreateEntry(CreateEntryRequest request)
        {
            EntryDAL dal = new EntryDAL();
            return dal.InsertEntry(request);
        }

        public static List<PaidTimeCandidateItem> GetPaidTimeCandidatesByRanch(int competitionId, int ranchId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }
            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            EntryDAL dal = new EntryDAL();
            return dal.GetPaidTimeCandidatesByRanch(competitionId, ranchId);
        }
    }
}