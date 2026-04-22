using RideOnServer.BL.DTOs.Competition.PaidTimeRequests;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class PaidTimeRequest : ServiceRequest
    {
        public int CatalogItemId { get; set; }

        public int RequestedCompSlotId { get; set; }

        public int? AssignedCompSlotId { get; set; }

        public DateTime? AssignedStartTime { get; set; }

        public string? Status { get; set; }

        public string? Notes { get; set; }

        internal static int CreatePaidTimeRequest(CreatePaidTimeRequestRequest request)
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

            PaidTimeRequestDAL dal = new PaidTimeRequestDAL();
            return dal.CreatePaidTimeRequest(request);
        }
    }
}