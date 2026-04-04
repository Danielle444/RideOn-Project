using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ClassTypesController : ControllerBase
    {
        [Authorize]
        [HttpGet]
        public IActionResult GetAll([FromQuery] byte? fieldId = null)
        {
            try
            {
                List<ClassType> list = ClassType.GetAllClassTypes(fieldId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult Create([FromBody] ClassType classType)
        {
            try
            {
                int id = ClassType.CreateClassType(
                    classType.FieldId,
                    classType.ClassName,
                    classType.JudgingSheetFormat,
                    classType.QualificationDescription
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
        public IActionResult Update([FromBody] ClassType classType)
        {
            try
            {
                ClassType.UpdateClassType(
                    classType.ClassTypeId,
                    classType.FieldId,
                    classType.ClassName,
                    classType.JudgingSheetFormat,
                    classType.QualificationDescription
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
        public IActionResult Delete(short id)
        {
            try
            {
                ClassType.DeleteClassType(id);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}