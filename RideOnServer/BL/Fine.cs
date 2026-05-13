using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class Fine
    {
        public int FineId { get; set; }

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
            decimal fineAmount,
            string? fineReason,
            string? triggerMode,
            string? startEvent,
            string? endEvent,
            bool isActive
        )
        {
            ValidateFine(fineAmount);

            FineDAL dal = new FineDAL();

            dal.UpdateFine(
                fineId,
                fineAmount,
                fineReason,
                triggerMode,
                startEvent,
                endEvent,
                isActive
            );
        }

        private static void ValidateFine(decimal fineAmount)
        {
            if (fineAmount < 0)
            {
                throw new Exception("Fine amount cannot be negative");
            }
        }

        internal static List<Fine> GetActiveFinePolicies()
        {
            FineDAL dal = new FineDAL();

            return dal.GetActiveFinePolicies();
        }
    }
}