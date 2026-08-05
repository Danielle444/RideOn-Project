namespace RideOnServer.BL.DTOs.Competition.PaidTimeSlotInCompetition
{
    public class SetPaidTimeSlotPublishStateRequest
    {
        public int HostRanchId { get; set; }
        public bool IsPublished { get; set; }
    }
}
