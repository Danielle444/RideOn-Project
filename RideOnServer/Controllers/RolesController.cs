using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RolesController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetAllRoles()
        {
            try
            {
                List<Role> roles = Role.GetAllRoles();
                return Ok(roles);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}