using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            try
            {
                return Ok(Role.GetAllRoles());
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}