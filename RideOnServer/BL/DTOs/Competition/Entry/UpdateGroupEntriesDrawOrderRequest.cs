namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class UpdateGroupEntriesDrawOrderRequest
    {
        public int CompetitionId { get; set; }

        public DateTime ClassDate { get; set; }

        public short OrderInDay { get; set; }

        public int RanchId { get; set; }

        public List<UpdateGroupEntryDrawOrderItem> Entries { get; set; } =
            new List<UpdateGroupEntryDrawOrderItem>();
    }

    public class UpdateGroupEntryDrawOrderItem
    {
        public int EntryId { get; set; }

        public short DrawOrder { get; set; }
    }
}