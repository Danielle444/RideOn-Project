using RideOnServer.BL.DTOs.ServicePrices;
using RideOnServer.DAL;

namespace RideOnServer.BL
{
    public class ServicePriceManager
    {
        internal static List<ServicePriceCategorySection> GetDashboard(int ranchId)
        {
            if (ranchId <= 0)
                throw new Exception("RanchId is required");

            ServicePriceDAL dal = new ServicePriceDAL();
            List<ServicePriceRow> rows = dal.GetServicePricingDashboard(ranchId);

            return rows
                .GroupBy(x => new { x.CategoryId, x.CategoryName })
                .Select(group => new ServicePriceCategorySection
                {
                    CategoryId = group.Key.CategoryId,
                    CategoryName = group.Key.CategoryName,
                    Items = group.OrderBy(x => x.ProductId).ToList()
                })
                .OrderBy(x => x.CategoryId)
                .ToList();
        }

        internal static int CreateProduct(CreateServiceProductRequest request)
        {
            if (request == null)
                throw new Exception("Request is required");

            if (request.RanchId <= 0)
                throw new Exception("RanchId is required");

            if (request.CategoryId < 1 || request.CategoryId > 3)
                throw new Exception("Invalid category");

            if (string.IsNullOrWhiteSpace(request.ProductName))
                throw new Exception("Product name is required");

            if (request.ItemPrice < 0)
                throw new Exception("Item price must be zero or greater");

            if (request.CategoryId == 1 && (!request.DurationMinutes.HasValue || request.DurationMinutes.Value <= 0))
                throw new Exception("Duration minutes is required for paid time");

            ServicePriceDAL dal = new ServicePriceDAL();

            return dal.InsertServiceProduct(
                request.CategoryId,
                request.ProductName.Trim(),
                request.DurationMinutes,
                request.RanchId,
                request.ItemPrice
            );
        }

        internal static void UpdateProduct(UpdateServiceProductRequest request)
        {
            if (request == null)
                throw new Exception("Request is required");

            if (request.ProductId <= 0)
                throw new Exception("ProductId is required");

            if (request.RanchId <= 0)
                throw new Exception("RanchId is required");

            if (string.IsNullOrWhiteSpace(request.ProductName))
                throw new Exception("Product name is required");

            if (request.ItemPrice < 0)
                throw new Exception("Item price must be zero or greater");

            ServicePriceDAL dal = new ServicePriceDAL();

            dal.UpdateServiceProduct(
                request.ProductId,
                request.ProductName.Trim(),
                request.DurationMinutes,
                request.RanchId,
                request.ItemPrice
            );
        }

        internal static void DeleteProduct(short productId)
        {
            if (productId <= 0)
                throw new Exception("ProductId is required");

            ServicePriceDAL dal = new ServicePriceDAL();
            dal.DeleteServiceProduct(productId);
        }

        internal static void DeactivateProduct(short productId, int ranchId)
        {
            if (productId <= 0)
                throw new Exception("ProductId is required");

            if (ranchId <= 0)
                throw new Exception("RanchId is required");

            ServicePriceDAL dal = new ServicePriceDAL();
            dal.DeactivateServiceProductPrice(productId, ranchId);
        }

        internal static void ActivateProduct(short productId, int ranchId)
        {
            if (productId <= 0)
                throw new Exception("ProductId is required");

            if (ranchId <= 0)
                throw new Exception("RanchId is required");

            ServicePriceDAL dal = new ServicePriceDAL();
            dal.ActivateServiceProductPrice(productId, ranchId);
        }

        internal static List<ServicePriceHistoryRow> GetPriceHistory(short productId, int ranchId)
        {
            if (productId <= 0)
                throw new Exception("ProductId is required");

            if (ranchId <= 0)
                throw new Exception("RanchId is required");

            ServicePriceDAL dal = new ServicePriceDAL();
            return dal.GetPriceHistoryForProduct(productId, ranchId);
        }

        internal static void ActivateHistoryItem(int catalogItemId, int ranchId)
        {
            if (catalogItemId <= 0)
                throw new Exception("CatalogItemId is required");

            if (ranchId <= 0)
                throw new Exception("RanchId is required");

            ServicePriceDAL dal = new ServicePriceDAL();
            dal.ActivateSpecificPriceHistoryItem(catalogItemId, ranchId);
        }



    }
}