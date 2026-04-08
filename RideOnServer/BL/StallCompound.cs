using RideOnServer.BL.DTOs.StallCompounds;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class StallCompound
    {
        public int RanchId { get; set; }
        public byte CompoundId { get; set; }
        public string CompoundName { get; set; } = string.Empty;

        internal static List<StallCompoundSummary> GetCompoundsSummaryByRanchId(int ranchId)
        {
            if (ranchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            StallCompoundDAL dal = new StallCompoundDAL();
            return dal.GetCompoundsSummaryByRanchId(ranchId);
        }

        internal static int CreateCompoundWithStalls(CreateCompoundWithStallsRequest request)
        {
            if (request == null)
            {
                throw new Exception("Request is required");
            }

            if (request.RanchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            if (string.IsNullOrWhiteSpace(request.CompoundName))
            {
                throw new Exception("Compound name is required");
            }

            if (request.StallTypeProductId <= 0)
            {
                throw new Exception("Stall type is required");
            }

            if (string.IsNullOrWhiteSpace(request.NumberingPattern))
            {
                throw new Exception("Numbering pattern is required");
            }

            StallCompoundDAL dal = new StallCompoundDAL();

            return dal.CreateCompoundWithStallsByPattern(
                request.RanchId,
                request.CompoundName.Trim(),
                request.StallTypeProductId,
                request.NumberingPattern.Trim()
            );
        }

        internal static void UpdateCompoundName(int ranchId, short compoundId, string compoundName)
        {
            if (ranchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            if (compoundId <= 0)
            {
                throw new Exception("CompoundId is invalid");
            }

            if (string.IsNullOrWhiteSpace(compoundName))
            {
                throw new Exception("Compound name is required");
            }

            StallCompoundDAL dal = new StallCompoundDAL();
            dal.UpdateCompoundName(ranchId, compoundId, compoundName.Trim());
        }

        internal static void DeleteCompound(int ranchId, short compoundId)
        {
            if (ranchId <= 0)
            {
                throw new Exception("RanchId is invalid");
            }

            if (compoundId <= 0)
            {
                throw new Exception("CompoundId is invalid");
            }

            StallCompoundDAL dal = new StallCompoundDAL();
            dal.DeleteCompound(ranchId, compoundId);
        }
    }
}