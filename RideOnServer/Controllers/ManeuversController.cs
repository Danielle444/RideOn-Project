using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ManeuversController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                ManeuverDAL dal = new ManeuverDAL();
                return Ok(dal.GetAllManeuvers());
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAll Maneuvers: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת תרגילים");
            }
        }

        [HttpPost]
        public IActionResult Create([FromBody] Maneuver maneuver)
        {
            try
            {
                if (maneuver == null)
                {
                    return BadRequest("Invalid request");
                }

                UserAccessValidator.EnsureSuperUser(User);

                ManeuverDAL dal = new ManeuverDAL();
                short id = dal.InsertManeuver(
                    maneuver.ManeuverName,
                    maneuver.ManeuverDescription
                );

                return Ok(id);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Create Maneuver: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת תרגיל");
            }
        }

        [HttpPut]
        public IActionResult Update([FromBody] Maneuver maneuver)
        {
            try
            {
                if (maneuver == null)
                {
                    return BadRequest("Invalid request");
                }

                UserAccessValidator.EnsureSuperUser(User);

                ManeuverDAL dal = new ManeuverDAL();
                dal.UpdateManeuver(
                    maneuver.ManeuverId,
                    maneuver.ManeuverName,
                    maneuver.ManeuverDescription
                );

                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Update Maneuver: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון תרגיל");
            }
        }

        [HttpDelete("{maneuverId}")]
        public IActionResult Delete(short maneuverId)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                ManeuverDAL dal = new ManeuverDAL();
                dal.DeleteManeuver(maneuverId);

                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Delete Maneuver: {ex.Message}");
                return BadRequest("אירעה שגיאה במחיקת תרגיל");
            }
        }
    }
}