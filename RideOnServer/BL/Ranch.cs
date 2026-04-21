using RideOnServer.DAL;
using RideOnServer.BL.DTOs.Profile;

namespace RideOnServer.BL
{
    public class Ranch
    {
        public int RanchId { get; set; }

        public string RanchName { get; set; } = string.Empty;

        public string? ContactEmail { get; set; }

        public string? ContactPhone { get; set; }

        public string? WebsiteUrl { get; set; }

        public string? Location { get; set; }

        public string? RanchStatus { get; set; }

        public double? Latitude { get; set; }

        public double? Longitude { get; set; }

        internal static List<Ranch> GetAllRanchesNames()
        {
            RanchDAL dal = new RanchDAL();
            return dal.GetAllRanchesNames();
        }

        internal static List<Ranch> GetRanchesForRegistration()
        {
            RanchDAL dal = new RanchDAL();
            return dal.GetRanchesForRegistration();
        }

        internal static RanchProfile GetRanchById(int ranchId)
        {
            RanchDAL dal = new RanchDAL();
            RanchProfile? ranch = dal.GetRanchById(ranchId);

            if (ranch == null)
            {
                throw new Exception("Ranch not found");
            }

            return ranch;
        }

        internal static void UpdateRanchProfile(UpdateRanchProfileRequest request)
        {
            if (request.RanchId <= 0)
            {
                throw new Exception("Invalid RanchId");
            }

            if (string.IsNullOrWhiteSpace(request.RanchName))
            {
                throw new Exception("RanchName is required");
            }

            RanchDAL dal = new RanchDAL();
            dal.UpdateRanch(request);
        }
    }
}