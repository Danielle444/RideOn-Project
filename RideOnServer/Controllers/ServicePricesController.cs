using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ServicePrices;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ServicePricesController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetDashboard([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasAnyRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary,
                    RoleNames.RanchAdmin,
                    RoleNames.Payer
                );

                var list = ServicePriceManager.GetDashboard(ranchId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetDashboard: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מחירון השירותים");
            }
        }

        [HttpPost("products")]
        public IActionResult CreateProduct([FromBody] CreateServiceProductRequest request)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                int id = ServicePriceManager.CreateProduct(request);
                return Ok(id);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateProduct: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת שירות");
            }
        }

        [HttpPut("products")]
        public IActionResult UpdateProduct([FromBody] UpdateServiceProductRequest request)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                ServicePriceManager.UpdateProduct(request);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateProduct: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון שירות");
            }
        }

        [HttpDelete("products/{id}")]
        public IActionResult DeleteProduct(short id, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                ServicePriceManager.DeleteProduct(id);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeleteProduct: {ex.Message}");
                return BadRequest("אירעה שגיאה במחיקת שירות");
            }
        }

        [HttpPut("products/{id}/deactivate")]
        public IActionResult DeactivateProduct(short id, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                ServicePriceManager.DeactivateProduct(id, ranchId);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in DeactivateProduct: {ex.Message}");
                return BadRequest("אירעה שגיאה בכיבוי שירות");
            }
        }

        [HttpPut("products/{id}/activate")]
        public IActionResult ActivateProduct(short id, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                ServicePriceManager.ActivateProduct(id, ranchId);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ActivateProduct: {ex.Message}");
                return BadRequest("אירעה שגיאה בהפעלת שירות");
            }
        }

        [HttpGet("products/{id}/history")]
        public IActionResult GetPriceHistory(short id, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                var list = ServicePriceManager.GetPriceHistory(id, ranchId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPriceHistory: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת היסטוריית מחירים");
            }
        }

        [HttpPut("history/{priceCatalogId}/activate")]
        public IActionResult ActivateHistoryItem(int PriceCatalogId, [FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                ServicePriceManager.ActivateHistoryItem(PriceCatalogId, ranchId);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in ActivateHistoryItem: {ex.Message}");
                return BadRequest("אירעה שגיאה בהפעלת מחיר היסטורי");
            }
        }
    }
}