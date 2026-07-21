namespace RideOnServer.BL.DTOs.Schedule
{
    public class ScheduleConfig
    {
        public decimal? MinutesPerEntryMin { get; set; }
        public decimal? MinutesPerEntryMax { get; set; }
        public decimal? BetweenClassGapMinutes { get; set; }
        public decimal? LateFinishYellowHour { get; set; }
        public decimal? LateFinishOrangeHour { get; set; }
        public decimal? LateFinishRedHour { get; set; }
        public decimal? DefaultFirstClassStartHour { get; set; }
    }
}
