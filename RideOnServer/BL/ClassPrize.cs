namespace RideOnServer.BL
{
    public class ClassPrize
    {
        public int ClassInCompId { get; set; }

        public byte PrizeTypeId { get; set; }

        public decimal? PrizeAmount { get; set; }

        public string? PrizeTypeName { get; set; }
    }
}