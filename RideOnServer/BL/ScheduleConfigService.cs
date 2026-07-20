using RideOnServer.BL.DTOs.Schedule;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public static class ScheduleConfigService
    {
        internal static ScheduleConfig? GetScheduleConfigByFieldId(short fieldId)
        {
            if (fieldId <= 0)
            {
                throw new Exception("FieldId is invalid");
            }

            ScheduleConfigDAL dal = new ScheduleConfigDAL();
            return dal.GetScheduleConfigByFieldId(fieldId);
        }
    }
}
