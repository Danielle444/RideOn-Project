using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.ChangeEntryRequest;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChangeEntryRequestsController : ControllerBase
    {
        [HttpPost]
        public IActionResult Create(
            [FromBody]
            CreateChangeEntryRequestDTO dto
        )
        {
            try
            {
                Competition? competition =
                    Competition.GetCompetitionById(
                        dto.CompetitionId
                    );

                if (competition == null)
                {
                    return NotFound(
                        "Competition not found"
                    );
                }

                int requestId =
                    ChangeEntryRequest.CreateRequest(
                        competition,
                        dto.OriginalEntryId,
                        dto.NewEntryId,
                        dto.IsCancelled
                    );

                return Ok(requestId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(
                    StatusCodes.Status403Forbidden,
                    ex.Message
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine(
                    $"Error creating change request: {ex.Message}"
                );

                return BadRequest(
                    "אירעה שגיאה ביצירת בקשת שינוי"
                );
            }
        }
    }
}