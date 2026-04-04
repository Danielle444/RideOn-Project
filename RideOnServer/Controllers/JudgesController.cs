using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class JudgesController : ControllerBase
    {
        [Authorize]
        [HttpGet]
        public IActionResult GetAll([FromQuery] byte? fieldId = null)
        {
            try
            {
                List<Judge> list = Judge.GetAllJudges(fieldId);
                return Ok(list);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult Create([FromBody] UpsertJudgeRequest request)
        {
            try
            {
                int judgeId = Judge.CreateJudge(
                    request.FirstNameHebrew,
                    request.LastNameHebrew,
                    request.FirstNameEnglish,
                    request.LastNameEnglish,
                    request.Country,
                    request.FieldIdsCsv
                );

                return Ok(judgeId);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] UpsertJudgeRequest request)
        {
            try
            {
                Judge.UpdateJudge(
                    request.JudgeId,
                    request.FirstNameHebrew,
                    request.LastNameHebrew,
                    request.FirstNameEnglish,
                    request.LastNameEnglish,
                    request.Country,
                    request.FieldIdsCsv
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
        public IActionResult Delete(int id)
        {
            try
            {
                Judge.DeleteJudge(id);
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}