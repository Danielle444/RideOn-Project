namespace RideOnServer.BL.DTOs.Competition
{
    public class DuplicateCompetitionSelectionPaidTimeSlotItem
    {
        public int SourcePaidTimeSlotInCompId { get; set; }

        public bool CopyPaidTimeSlot { get; set; } = true;
    }
}