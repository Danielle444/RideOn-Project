using RideOnServer.DAL;

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
    }
}