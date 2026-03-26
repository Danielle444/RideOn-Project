using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RanchesController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetAllRanchesNames()
        {
            try
            {
                List<Ranch> ranches = Ranch.GetAllRanchesNames();
                return Ok(ranches);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}