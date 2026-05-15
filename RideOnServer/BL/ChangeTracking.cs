using RideOnServer.BL.DTOs.ChangeTracking;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class ChangeTracking
    {
        public static List<SecretaryChangeRequestItem>
            GetSecretaryCompetitionChangeRequests(
                int competitionId,
                int ranchId,
                string? status)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                string normalizedStatus = status.Trim();

                if (
                    normalizedStatus != "Pending" &&
                    normalizedStatus != "Approved" &&
                    normalizedStatus != "Rejected"
                )
                {
                    throw new Exception("Invalid status");
                }
            }

            ChangeTrackingDAL dal = new ChangeTrackingDAL();

            return dal.GetSecretaryCompetitionChangeRequests(
                competitionId,
                ranchId,
                status
            );
        }

        public static int GetHostSecretaryPendingChangeRequestsCount(
            int ranchId)
        {
            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            ChangeTrackingDAL dal = new ChangeTrackingDAL();

            return dal.GetHostSecretaryPendingChangeRequestsCount(
                ranchId
            );
        }
    }
}