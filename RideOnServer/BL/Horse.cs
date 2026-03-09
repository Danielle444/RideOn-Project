namespace RideOnServer.BL
{
    public class Horse
    {
        public int HorseId { get; set; }

        public string HorseName { get; set; }

        public string BarnName { get; set; }

        public string FederationNumber { get; set; }

        public string ChipNumber { get; set; }

        public short? BirthYear { get; set; }

        public string Gender { get; set; }

        public int RanchId { get; set; }
    }
}