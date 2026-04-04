using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Fine
    {
        public int FineId { get; set; }
        public string FineName { get; set; } = string.Empty;
        public string FineDescription { get; set; } = string.Empty;
        public decimal FineAmount { get; set; }

        internal static List<Fine> GetAllFines()
        {
            FineDAL dal = new FineDAL();
            return dal.GetAllFines();
        }

        internal static int CreateFine(string fineName, string fineDescription, decimal fineAmount)
        {
            ValidateFine(fineName, fineAmount);

            FineDAL dal = new FineDAL();
            return dal.InsertFine(
                fineName.Trim(),
                fineDescription?.Trim() ?? string.Empty,
                fineAmount
            );
        }

        internal static void UpdateFine(int fineId, string fineName, string fineDescription, decimal fineAmount)
        {
            ValidateFine(fineName, fineAmount);

            FineDAL dal = new FineDAL();
            dal.UpdateFine(
                fineId,
                fineName.Trim(),
                fineDescription?.Trim() ?? string.Empty,
                fineAmount
            );
        }

        internal static void DeleteFine(int fineId)
        {
            FineDAL dal = new FineDAL();
            dal.DeleteFine(fineId);
        }

        private static void ValidateFine(string fineName, decimal fineAmount)
        {
            if (string.IsNullOrWhiteSpace(fineName))
                throw new Exception("Fine name is required");

            if (fineAmount < 0)
                throw new Exception("Fine amount cannot be negative");
        }
    }
}