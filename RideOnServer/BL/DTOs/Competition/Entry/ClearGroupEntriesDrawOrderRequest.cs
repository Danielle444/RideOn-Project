namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class ClearGroupEntriesDrawOrderRequest
    {
        public int CompetitionId { get; set; }

        public DateTime ClassDate { get; set; }

        public short OrderInDay { get; set; }

        public int RanchId { get; set; }
    }
}