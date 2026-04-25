using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Competition.Entry;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class EntriesController : ControllerBase
    {
        [HttpPost]
        public IActionResult CreateEntry([FromBody] CreateEntryRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.RanchAdmin
                );

                request.OrderedBySystemUserId = personId;

                int entryId = Entry.CreateEntry(request);

                return Ok(new
                {
                    EntryId = entryId,
                    Message = "Entry created successfully"
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CreateEntry: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת הרשמה למקצה");
            }
        }
    }
}