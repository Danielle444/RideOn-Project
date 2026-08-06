using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using RideOnServer.RateLimiting;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PersonsController : ControllerBase
    {
        [HttpGet("by-national-id")]
        [EnableRateLimiting(RegistrationLookupRateLimiting.PolicyName)]
        public IActionResult GetPersonByNationalIdForRegistration([FromQuery] string nationalId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(nationalId))
                {
                    return BadRequest("NationalId is required");
                }

                string normalizedNationalId = nationalId.Trim();

                PersonRegistrationLookupResponse? person =
                    Person.GetPersonByNationalIdForRegistration(normalizedNationalId);

                if (person == null)
                {
                    return NotFound("Person not found");
                }

                return Ok(person);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetPersonByNationalIdForRegistration: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת פרטי אדם להרשמה");
            }
        }
    }
}