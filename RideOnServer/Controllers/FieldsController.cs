using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FieldsController : ControllerBase
    {
        // GET ALL
        [Authorize]
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                var list = Field.GetAllFields();
                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // CREATE
        [Authorize]
        [HttpPost]
        public IActionResult Create([FromBody] Field field)
        {
            try
            {
                int id = Field.CreateField(field.FieldName);
                return Ok(id);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // UPDATE
        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] Field field)
        {
            try
            {
                Field.UpdateField(field.FieldId, field.FieldName);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE
        [Authorize]
        [HttpDelete("{id}")]
        public IActionResult Delete(short id)
        {
            try
            {
                Field.DeleteField(id);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}