using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PatternManeuversController : ControllerBase
    {
        [Authorize]
        [HttpGet("{patternNumber}")]
        public IActionResult GetByPattern(short patternNumber)
        {
            try
            {
                PatternManeuverDAL dal = new PatternManeuverDAL();
                return Ok(dal.GetPatternManeuvers(patternNumber));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut("{patternNumber}")]
        public IActionResult Replace(short patternNumber, [FromBody] List<PatternManeuver> items)
        {
            try
            {
                PatternManeuverDAL dal = new PatternManeuverDAL();
                dal.ReplacePatternManeuvers(patternNumber, items ?? new List<PatternManeuver>());
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}