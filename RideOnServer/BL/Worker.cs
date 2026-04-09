using RideOnServer.DAL;
using RideOnServer.BL.DTOs.Workers;

namespace RideOnServer.BL
{
    public class Worker
    {
        internal static List<WorkerListItem> GetWorkersByRanch(GetWorkersFiltersRequest filters)
        {
            if (filters.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            WorkerDAL dal = new WorkerDAL();
            return dal.GetWorkersByRanch(filters);
        }

        internal static WorkerDetails GetWorkerById(int personId, int ranchId)
        {
            if (personId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (ranchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            WorkerDAL dal = new WorkerDAL();
            WorkerDetails? worker = dal.GetWorkerById(personId, ranchId);

            if (worker == null)
            {
                throw new Exception("Worker not found");
            }

            return worker;
        }

        internal static void UpdateWorker(UpdateWorkerRequest request)
        {
            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
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

            WorkerDAL dal = new WorkerDAL();
            dal.UpdateWorker(request);
        }

        internal static void UpdateWorkerRoleStatus(UpdateWorkerRoleStatusRequest request)
        {
            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (string.IsNullOrWhiteSpace(request.RoleStatus))
            {
                throw new Exception("RoleStatus is required");
            }

            string normalizedStatus = request.RoleStatus.Trim();

            if (
                normalizedStatus != "Pending" &&
                normalizedStatus != "Approved" &&
                normalizedStatus != "Rejected"
            )
            {
                throw new Exception("Invalid RoleStatus");
            }

            WorkerDAL dal = new WorkerDAL();
            dal.UpdateWorkerRoleStatus(request.PersonId, request.RanchId, normalizedStatus);
        }

        internal static void RemoveWorkerFromRanch(RemoveWorkerFromRanchRequest request)
        {
            if (request.PersonId <= 0)
            {
                throw new Exception("Invalid PersonId");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            WorkerDAL dal = new WorkerDAL();
            dal.RemoveWorkerFromRanch(request.PersonId, request.RanchId);
        }
    }
}