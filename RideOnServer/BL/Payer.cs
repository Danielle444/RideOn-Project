using RideOnServer.DAL;
using RideOnServer.BL.DTOs.Payers;

namespace RideOnServer.BL
{
    public class Payer
    {
        internal static List<ManagedPayerListItem> GetManagedPayersBySystemUser(
            int systemUserId,
            GetManagedPayersFiltersRequest filters)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            PayerDAL dal = new PayerDAL();
            return dal.GetManagedPayersBySystemUser(systemUserId, filters);
        }

        internal static PotentialPayerLookupResponse? FindPotentialPayerByContact(string? email, string? cellPhone)
        {
            if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(cellPhone))
            {
                throw new Exception("Email or CellPhone is required");
            }

            PayerDAL dal = new PayerDAL();
            return dal.FindPotentialPayerByContact(email, cellPhone);
        }

        internal static int RequestManagedPayer(int systemUserId, RequestManagedPayerRequest request)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                throw new Exception("FirstName is required");
            }

            if (string.IsNullOrWhiteSpace(request.LastName))
            {
                throw new Exception("LastName is required");
            }

            if (string.IsNullOrWhiteSpace(request.Email) && string.IsNullOrWhiteSpace(request.CellPhone))
            {
                throw new Exception("Email or CellPhone is required");
            }

            PayerDAL dal = new PayerDAL();
            return dal.RequestManagedPayer(systemUserId, request);
        }

        internal static void UpdateManagedPayerBasicDetails(int systemUserId, UpdateManagedPayerRequest request)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (string.IsNullOrWhiteSpace(request.FirstName))
            {
                throw new Exception("FirstName is required");
            }

            if (string.IsNullOrWhiteSpace(request.LastName))
            {
                throw new Exception("LastName is required");
            }

            PayerDAL dal = new PayerDAL();
            dal.UpdateManagedPayerBasicDetails(systemUserId, request);
        }

        internal static void RemoveManagedPayer(int systemUserId, int personId)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (personId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            PayerDAL dal = new PayerDAL();
            dal.RemoveManagedPayer(systemUserId, personId);
        }

        internal static List<CompetitionPayerListItem> GetCompetitionPayersBySystemUser(int systemUserId,GetCompetitionPayersFiltersRequest filters)
        {
            if (systemUserId <= 0)
            {
                throw new Exception("Invalid SystemUserId");
            }

            if (filters == null)
            {
                throw new Exception("Filters are required");
            }

            if (filters.CompetitionId <= 0)
            {
                throw new Exception("Invalid CompetitionId");
            }

            PayerDAL dal = new PayerDAL();
            return dal.GetCompetitionPayersBySystemUser(systemUserId, filters);
        }

        internal static List<PayerManagerItem> GetPayerManagers(int personId)
        {
            if (personId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            PayerDAL dal = new PayerDAL();
            return dal.GetPayerManagers(personId);
        }

        internal static List<AvailablePayerManagerItem> GetAvailablePayerManagers(int personId, string? searchText)
        {
            if (personId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            PayerDAL dal = new PayerDAL();
            return dal.GetAvailablePayerManagers(personId, searchText);
        }

        internal static void AddPayerManager(int currentPersonId, AddPayerManagerRequest request)
        {
            if (currentPersonId <= 0)
            {
                throw new Exception("Invalid current PersonId");
            }

            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (request.AdminPersonId <= 0)
            {
                throw new Exception("Invalid AdminPersonId");
            }

            if (currentPersonId != request.PersonId)
            {
                throw new UnauthorizedAccessException("You can only update your own managing admins");
            }

            PayerDAL dal = new PayerDAL();
            dal.AddPayerManager(request.PersonId, request.AdminPersonId);
        }

        internal static void RemovePayerManager(int currentPersonId, RemovePayerManagerRequest request)
        {
            if (currentPersonId <= 0)
            {
                throw new Exception("Invalid current PersonId");
            }

            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (request.AdminPersonId <= 0)
            {
                throw new Exception("Invalid AdminPersonId");
            }

            if (currentPersonId != request.PersonId)
            {
                throw new UnauthorizedAccessException("You can only update your own managing admins");
            }

            PayerDAL dal = new PayerDAL();
            dal.RemovePayerManager(request.PersonId, request.AdminPersonId);
        }

    }
}