namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class UpdateClassEntriesDrawOrderRequest
    {
        public int CompetitionId { get; set; }

        public int ClassInCompId { get; set; }

        public int RanchId { get; set; }

        public List<UpdateEntryDrawOrderItem> Entries { get; set; } =
            new List<UpdateEntryDrawOrderItem>();
    }

    public class UpdateEntryDrawOrderItem
    {
        public int EntryId { get; set; }

        public short DrawOrder { get; set; }
    }
}