using System.Text.Json.Serialization;

namespace RideOnServer.BL.DTOs.StallBookings
{
    public class CreateStallBookingPayerItem
    {
        [JsonPropertyName("payerPersonId")]
        public int PayerPersonId { get; set; }
    }
}