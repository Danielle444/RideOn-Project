using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrizeTypesController : ControllerBase
    {
        [Authorize]
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                List<PrizeType> list = PrizeType.GetAllPrizeTypes();
                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult Create([FromBody] PrizeType prizeType)
        {
            try
            {
                int id = PrizeType.CreatePrizeType(
                    prizeType.PrizeTypeName,
                    prizeType.PrizeDescription
                );

                return Ok(id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] PrizeType prizeType)
        {
            try
            {
                PrizeType.UpdatePrizeType(
                    prizeType.PrizeTypeId,
                    prizeType.PrizeTypeName,
                    prizeType.PrizeDescription
                );

                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpDelete("{id}")]
        public IActionResult Delete(byte id)
        {
            try
            {
                PrizeType.DeletePrizeType(id);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}