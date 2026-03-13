namespace RideOnServer.BL
{
    public class Fine
    {
        public int FineId { get; set; }

        public string FineName { get; set; }

        public string? FineDescription { get; set; }

        public decimal FineAmount { get; set; }
    }
}