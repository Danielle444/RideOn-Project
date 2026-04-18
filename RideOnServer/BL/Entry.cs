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
    }
}