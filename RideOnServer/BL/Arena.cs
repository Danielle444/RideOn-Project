namespace RideOnServer.BL
{
    public class Arena
    {
        public int RanchId { get; set; }

        public short ArenaId { get; set; }

        public string ArenaName { get; set; }

        public short? ArenaLength { get; set; }

        public short? ArenaWidth { get; set; }

        public bool? IsCovered { get; set; }
    }
}