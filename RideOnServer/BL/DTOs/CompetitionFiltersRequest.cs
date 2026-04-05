namespace RideOnServer.BL.DTOs
{
    public class CompetitionFiltersRequest
    {
        public int RanchId { get; set; }
        public string? SearchText { get; set; }
        public string? Status { get; set; }
        public byte? FieldId { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }
}