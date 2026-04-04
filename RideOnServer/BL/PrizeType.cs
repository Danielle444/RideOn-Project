using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class PrizeType
    {
        public byte PrizeTypeId { get; set; }
        public string PrizeTypeName { get; set; } = string.Empty;
        public string PrizeDescription { get; set; } = string.Empty;

        internal static List<PrizeType> GetAllPrizeTypes()
        {
            PrizeTypeDAL dal = new PrizeTypeDAL();
            return dal.GetAllPrizeTypes();
        }

        internal static int CreatePrizeType(string prizeTypeName, string prizeDescription)
        {
            if (string.IsNullOrWhiteSpace(prizeTypeName))
                throw new Exception("Prize type name is required");

            PrizeTypeDAL dal = new PrizeTypeDAL();
            return dal.InsertPrizeType(
                prizeTypeName.Trim(),
                prizeDescription?.Trim() ?? string.Empty
            );
        }

        internal static void UpdatePrizeType(byte prizeTypeId, string prizeTypeName, string prizeDescription)
        {
            if (string.IsNullOrWhiteSpace(prizeTypeName))
                throw new Exception("Prize type name is required");

            PrizeTypeDAL dal = new PrizeTypeDAL();
            dal.UpdatePrizeType(
                prizeTypeId,
                prizeTypeName.Trim(),
                prizeDescription?.Trim() ?? string.Empty
            );
        }

        internal static void DeletePrizeType(byte prizeTypeId)
        {
            PrizeTypeDAL dal = new PrizeTypeDAL();
            dal.DeletePrizeType(prizeTypeId);
        }
    }
}