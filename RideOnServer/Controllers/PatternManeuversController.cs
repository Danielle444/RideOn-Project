using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PatternManeuversController : ControllerBase
    {
        [HttpGet("{patternNumber}")]
        public IActionResult GetByPattern(short patternNumber)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                PatternManeuverDAL dal = new PatternManeuverDAL();
                return Ok(dal.GetPatternManeuvers(patternNumber));
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetByPattern: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת תרגילי הפטרן");
            }
        }

        [HttpPut("{patternNumber}")]
        public IActionResult Replace(short patternNumber, [FromBody] List<PatternManeuver> items)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                PatternManeuverDAL dal = new PatternManeuverDAL();
                dal.ReplacePatternManeuvers(
                    patternNumber,
                    items ?? new List<PatternManeuver>()
                );

                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Replace PatternManeuvers: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון תרגילי הפטרן");
            }
        }
    }
}