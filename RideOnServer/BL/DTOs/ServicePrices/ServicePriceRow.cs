namespace RideOnServer.BL.DTOs.ServicePrices
{
    public class ServicePriceRow
    {
        public short CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;

        public short ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;

        public int? DurationMinutes { get; set; }

        public int? CatalogItemId { get; set; }
        public decimal? ItemPrice { get; set; }
        public DateTime? CreationDate { get; set; }

        public bool IsActive { get; set; }
    }
}