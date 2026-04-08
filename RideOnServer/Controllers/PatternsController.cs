using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PatternsController : ControllerBase
    {
        [Authorize]
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                PatternDAL dal = new PatternDAL();
                return Ok(dal.GetAllPatterns());
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("with-maneuvers")]
        public IActionResult GetAllWithManeuvers()
        {
            try
            {
                PatternDAL dal = new PatternDAL();
                return Ok(dal.GetAllPatternsWithManeuvers());
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult Create([FromBody] Pattern pattern)
        {
            try
            {
                PatternDAL dal = new PatternDAL();
                dal.InsertPattern(pattern.PatternNumber);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] PatternUpdateRequest request)
        {
            try
            {
                PatternDAL dal = new PatternDAL();
                dal.UpdatePattern(request.OldPatternNumber, request.NewPatternNumber);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpDelete("{patternNumber}")]
        public IActionResult Delete(short patternNumber)
        {
            try
            {
                PatternDAL dal = new PatternDAL();
                dal.DeletePattern(patternNumber);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }

    public class PatternUpdateRequest
    {
        public short OldPatternNumber { get; set; }
        public short NewPatternNumber { get; set; }
    }
}