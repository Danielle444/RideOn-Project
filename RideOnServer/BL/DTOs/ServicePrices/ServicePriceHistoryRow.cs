namespace RideOnServer.BL.DTOs.ServicePrices
{
    public class ServicePriceHistoryRow
    {
        public int CatalogItemId { get; set; }
        public DateTime? CreationDate { get; set; }
        public decimal? ItemPrice { get; set; }
        public bool IsActive { get; set; }
    }
}