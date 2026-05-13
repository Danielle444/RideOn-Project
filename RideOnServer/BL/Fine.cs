using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Fine
    {
        public int FineId { get; set; }

        public string FineName { get; set; } = string.Empty;

        public string FineDescription { get; set; } = string.Empty;

        public decimal FineAmount { get; set; }

        public string? FineReason { get; set; }

        public string? TriggerMode { get; set; }

        public string? StartEvent { get; set; }

        public string? EndEvent { get; set; }

        public bool IsActive { get; set; } = true;

        internal static List<Fine> GetAllFines()
        {
            FineDAL dal = new FineDAL();
            return dal.GetAllFines();
        }

        internal static void UpdateFine(
            int fineId,
            string fineName,
            string fineDescription,
            decimal fineAmount,
            string? fineReason,
            string? triggerMode,
            string? startEvent,
            string? endEvent,
            bool isActive
        )
        {
            ValidateFine(fineName, fineAmount);

            FineDAL dal = new FineDAL();

            dal.UpdateFine(
                fineId,
                fineName.Trim(),
                fineDescription?.Trim() ?? string.Empty,
                fineAmount,
                fineReason,
                triggerMode,
                startEvent,
                endEvent,
                isActive
            );
        }

        private static void ValidateFine(
            string fineName,
            decimal fineAmount
        )
        {
            if (string.IsNullOrWhiteSpace(fineName))
            {
                throw new Exception("Fine name is required");
            }

            if (fineAmount < 0)
            {
                throw new Exception("Fine amount cannot be negative");
            }
        }
    }
}