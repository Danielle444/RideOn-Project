namespace RideOnServer.BL.DTOs.ChangeEntryRequest
{
    public class CreateChangeEntryRequestDTO
    {
        public int CompetitionId { get; set; }

        public int OriginalEntryId { get; set; }

        public int? NewEntryId { get; set; }

        public bool IsCancelled { get; set; }
    }
}