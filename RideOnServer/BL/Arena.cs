namespace RideOnServer.BL
{
    public class Arena
    {
        public int RanchId { get; set; }

        public byte ArenaId { get; set; }

        public string ArenaName { get; set; } = string.Empty;

        public short? ArenaLength { get; set; }

        public short? ArenaWidth { get; set; }

        public bool? IsCovered { get; set; }
    }
}