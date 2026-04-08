using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ManeuversController : ControllerBase
    {
        [Authorize]
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                ManeuverDAL dal = new ManeuverDAL();
                return Ok(dal.GetAllManeuvers());
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult Create([FromBody] Maneuver maneuver)
        {
            try
            {
                ManeuverDAL dal = new ManeuverDAL();
                short id = dal.InsertManeuver(maneuver.ManeuverName, maneuver.ManeuverDescription);
                return Ok(id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] Maneuver maneuver)
        {
            try
            {
                ManeuverDAL dal = new ManeuverDAL();
                dal.UpdateManeuver(maneuver.ManeuverId, maneuver.ManeuverName, maneuver.ManeuverDescription);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpDelete("{maneuverId}")]
        public IActionResult Delete(short maneuverId)
        {
            try
            {
                ManeuverDAL dal = new ManeuverDAL();
                dal.DeleteManeuver(maneuverId);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}