namespace RideOnServer.BL.DTOs.Horses
{
    public class UpdateHorseBarnNameRequest
    {
        public int HorseId { get; set; }

        public int RanchId { get; set; }

        public string? BarnName { get; set; }
    }
}