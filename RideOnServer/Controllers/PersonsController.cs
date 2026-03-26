using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PersonsController : ControllerBase
    {
        [HttpGet("by-national-id")]
        public IActionResult GetPersonByNationalIdForRegistration([FromQuery] string nationalId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(nationalId))
                {
                    return BadRequest("NationalId is required");
                }

                PersonRegistrationLookupResponse? person =
                    Person.GetPersonByNationalIdForRegistration(nationalId);

                if (person == null)
                {
                    return NotFound("Person not found");
                }

                return Ok(person);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}