namespace RideOnServer.BL.DTOs.Competition
{
    public class RescheduleCompetitionResponse
    {
        public int OffsetDays { get; set; }
        public int ClassesMoved { get; set; }
        public int PaidTimeSlotsMoved { get; set; }
        public int PaidTimeAssignmentsMoved { get; set; }
        public int StallBookingsMoved { get; set; }
        public int ShavingsOrdersMoved { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
