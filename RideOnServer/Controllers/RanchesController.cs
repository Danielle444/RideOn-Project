using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Profile;

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

        [HttpGet("for-registration")]
        public IActionResult GetRanchesForRegistration()
        {
            try
            {
                List<Ranch> ranches = Ranch.GetRanchesForRegistration();
                return Ok(ranches);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{ranchId}")]
        public IActionResult GetRanchById(int ranchId)
        {
            try
            {
                RanchProfile ranch = Ranch.GetRanchById(ranchId);
                return Ok(ranch);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{ranchId}")]
        public IActionResult UpdateRanchProfile(int ranchId, [FromBody] UpdateRanchProfileRequest request)
        {
            if (ranchId != request.RanchId)
            {
                return BadRequest("RanchId in URL does not match body.");
            }

            try
            {
                Ranch.UpdateRanchProfile(request);
                return Ok("Ranch profile updated successfully");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}