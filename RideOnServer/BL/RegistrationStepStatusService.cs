using RideOnServer.BL.DTOs.RegistrationStepStatus;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public static class RegistrationStepStatusService
    {
        internal static RegistrationStepStatus? GetRegistrationStepStatus(int competitionId, int ranchId, int adminPersonId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            if (ranchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            if (adminPersonId <= 0)
            {
                throw new Exception("AdminPersonId is invalid");
            }

            RegistrationStepStatusDAL dal = new RegistrationStepStatusDAL();
            return dal.GetRegistrationStepStatus(competitionId, ranchId, adminPersonId);
        }
    }
}
