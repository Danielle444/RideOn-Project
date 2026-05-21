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

        public static int AnswerSecretaryChangeRequest(
            AnswerChangeRequestRequest request)
        {
            if (request == null)
            {
                throw new Exception("Invalid request");
            }

            if (request.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.RequestId <= 0)
            {
                throw new Exception("Invalid RequestId");
            }

            if (
                request.RequestSource != "Entry" &&
                request.RequestSource != "Product"
            )
            {
                throw new Exception("Invalid RequestSource");
            }

            if (
                request.AnswerStatus != "Approved" &&
                request.AnswerStatus != "Rejected"
            )
            {
                throw new Exception("Invalid AnswerStatus");
            }

            if (request.AnsweredBySystemUserId <= 0)
            {
                throw new Exception("Invalid AnsweredBySystemUserId");
            }

            ChangeTrackingDAL dal = new ChangeTrackingDAL();

            return dal.AnswerSecretaryChangeRequest(request);
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

        public static List<PendingChangeRequestsByCompetitionItem>
            GetHostSecretaryPendingChangeRequestsByCompetition(int ranchId)
        {
            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            ChangeTrackingDAL dal = new ChangeTrackingDAL();

            return dal.GetHostSecretaryPendingChangeRequestsByCompetition(
                ranchId
            );
        }
    }
}