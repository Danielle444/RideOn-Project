using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ServicePrices;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ServicePricesController : ControllerBase
    {
        [Authorize]
        [HttpGet]
        public IActionResult GetDashboard([FromQuery] int ranchId)
        {
            try
            {
                var list = ServicePriceManager.GetDashboard(ranchId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost("products")]
        public IActionResult CreateProduct([FromBody] CreateServiceProductRequest request)
        {
            try
            {
                int id = ServicePriceManager.CreateProduct(request);
                return Ok(id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("products")]
        public IActionResult UpdateProduct([FromBody] UpdateServiceProductRequest request)
        {
            try
            {
                ServicePriceManager.UpdateProduct(request);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpDelete("products/{id}")]
        public IActionResult DeleteProduct(short id)
        {
            try
            {
                ServicePriceManager.DeleteProduct(id);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("products/{id}/deactivate")]
        public IActionResult DeactivateProduct(short id, [FromQuery] int ranchId)
        {
            try
            {
                ServicePriceManager.DeactivateProduct(id, ranchId);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("products/{id}/activate")]
        public IActionResult ActivateProduct(short id, [FromQuery] int ranchId)
        {
            try
            {
                ServicePriceManager.ActivateProduct(id, ranchId);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }


    }
}