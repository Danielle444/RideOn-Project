using RideOnServer.BL.DTOs.Financial;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public static class FinancialConfigService
    {
        internal static FinancialConfig? GetFinancialConfigForCompetition(int competitionId)
        {
            if (competitionId <= 0)
            {
                throw new Exception("CompetitionId is invalid");
            }

            FinancialConfigDAL dal = new FinancialConfigDAL();
            return dal.GetFinancialConfigForCompetition(competitionId);
        }
    }
}
