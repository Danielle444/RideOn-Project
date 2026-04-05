using RideOnServer.DAL;

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

        internal static List<Arena> GetArenasByRanchId(int ranchId)
        {
            if (ranchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            ArenaDAL dal = new ArenaDAL();
            return dal.GetArenasByRanchId(ranchId);
        }
    }
}