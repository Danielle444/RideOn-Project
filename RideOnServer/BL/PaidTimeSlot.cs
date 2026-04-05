using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class PaidTimeSlot
    {
        public int PaidTimeSlotId { get; set; }
        public string DayOfWeek { get; set; } = string.Empty;
        public string TimeOfDay { get; set; } = string.Empty;

        internal static List<PaidTimeSlot> GetAllPaidTimeBaseSlots()
        {
            PaidTimeSlotInCompetitionDAL dal = new PaidTimeSlotInCompetitionDAL();
            return dal.GetAllPaidTimeBaseSlots();
        }
    }
}