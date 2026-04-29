using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class PaidTimeRequest : ServiceRequest
    {
        public int PriceCatalogId { get; set; }
        public int RequestedCompSlotId { get; set; }
        public int? AssignedCompSlotId { get; set; }
        public DateTime? AssignedStartTime { get; set; }
        public string? Status { get; set; }
        public string? Notes { get; set; }

        internal static int CreatePaidTimeRequest(CreatePaidTimeRequestRequest request)
        {
            ValidateCreateRequest(request);

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.CreatePaidTimeRequest(request);
        }

        internal static List<PaidTimeAssignmentItemResponse> GetPaidTimeRequestsForAssignment(
            int competitionId,
            int[] selectedCompSlotIds,
            bool includeAllPending)
        {
            if (competitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            if (selectedCompSlotIds == null || selectedCompSlotIds.Length == 0)
            {
                throw new Exception("At least one selected slot is required");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.GetPaidTimeRequestsForAssignment(
                competitionId,
                selectedCompSlotIds,
                includeAllPending
            );
        }

        internal static void AssignPaidTimeRequest(AssignPaidTimeRequestRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.PaidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }

            if (request.AssignedCompSlotId <= 0)
            {
                throw new Exception("Invalid AssignedCompSlotId");
            }

            if (request.AssignedStartTime == default)
            {
                throw new Exception("Invalid AssignedStartTime");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.AssignPaidTimeRequest(request);
        }

        internal static void UnassignPaidTimeRequest(UnassignPaidTimeRequestRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.PaidTimeRequestId <= 0)
            {
                throw new Exception("Invalid PaidTimeRequestId");
            }

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            dal.UnassignPaidTimeRequest(request);
        }

        private static void ValidateCreateRequest(CreatePaidTimeRequestRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.OrderedBySystemUserId <= 0)
            {
                throw new Exception("Invalid OrderedBySystemUserId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.HorseId <= 0)
            {
                throw new Exception("Invalid HorseId");
            }

            if (request.RiderFederationMemberId <= 0)
            {
                throw new Exception("Invalid RiderFederationMemberId");
            }

            if (request.CoachFederationMemberId <= 0)
            {
                throw new Exception("Invalid CoachFederationMemberId");
            }

            if (request.PaidByPersonId <= 0)
            {
                throw new Exception("Invalid PaidByPersonId");
            }

            if (request.PriceCatalogId <= 0)
            {
                throw new Exception("Invalid PriceCatalogId");
            }

            if (request.RequestedCompSlotId <= 0)
            {
                throw new Exception("Invalid RequestedCompSlotId");
            }
        }
    }
}