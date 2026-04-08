namespace RideOnServer.BL.DTOs.ServicePrices
{
    public class CreateServiceProductRequest
    {
        public short CategoryId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int? DurationMinutes { get; set; }
        public int RanchId { get; set; }
        public decimal ItemPrice { get; set; }
    }
}