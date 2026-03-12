namespace RideOnServer.BL
{
    public class Fine
    {
        public int FineId { get; set; }

        public int FineTypeId { get; set; }

        public decimal FineAmount { get; set; }

        public DateTime Date { get; set; }
    }
}