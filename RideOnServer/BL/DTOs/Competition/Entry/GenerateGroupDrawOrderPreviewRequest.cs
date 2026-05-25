namespace RideOnServer.BL.DTOs.Competition.Entry
{
    public class GenerateGroupDrawOrderPreviewRequest
    {
        public int CompetitionId { get; set; }

        public int RanchId { get; set; }

        public DateTime ClassDate { get; set; }

        public short OrderInDay { get; set; }

        public short MinimumGap { get; set; } = 7;
    }
}