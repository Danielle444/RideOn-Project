using RideOnServer.BL.DTOs.Arenas;
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

        internal static int CreateArena(UpsertArenaRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            if (string.IsNullOrWhiteSpace(request.ArenaName))
            {
                throw new Exception("Arena name is required");
            }

            ArenaDAL dal = new ArenaDAL();

            return dal.InsertArena(
                request.RanchId,
                request.ArenaName.Trim(),
                request.ArenaLength,
                request.ArenaWidth,
                request.IsCovered
            );
        }

        internal static void UpdateArena(UpsertArenaRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            if (!request.ArenaId.HasValue || request.ArenaId.Value <= 0)
            {
                throw new Exception("ArenaId is required");
            }

            if (string.IsNullOrWhiteSpace(request.ArenaName))
            {
                throw new Exception("Arena name is required");
            }

            ArenaDAL dal = new ArenaDAL();

            dal.UpdateArena(
                request.RanchId,
                request.ArenaId.Value,
                request.ArenaName.Trim(),
                request.ArenaLength,
                request.ArenaWidth,
                request.IsCovered
            );
        }

        internal static void DeleteArena(int ranchId, short arenaId)
        {
            if (ranchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            if (arenaId <= 0)
            {
                throw new Exception("ArenaId is invalid");
            }

            ArenaDAL dal = new ArenaDAL();
            dal.DeleteArena(ranchId, arenaId);
        }
    }
}