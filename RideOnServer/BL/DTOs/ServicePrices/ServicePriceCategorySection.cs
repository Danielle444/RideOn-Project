namespace RideOnServer.BL.DTOs.ServicePrices
{
    public class ServicePriceCategorySection
    {
        public short CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public List<ServicePriceRow> Items { get; set; } = new List<ServicePriceRow>();
    }
}