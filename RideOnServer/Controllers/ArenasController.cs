using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Arenas;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ArenasController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetByRanchId([FromQuery] int ranchId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                List<Arena> list = Arena.GetArenasByRanchId(ranchId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetByRanchId Arenas: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מגרשים");
            }
        }

        [HttpPost]
        public IActionResult Create([FromBody] UpsertArenaRequest request)
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
                    RoleNames.HostSecretary
                );

                int id = Arena.CreateArena(request);
                return Ok(id);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Create Arena: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת מגרש");
            }
        }

        [HttpPut]
        public IActionResult Update([FromBody] UpsertArenaRequest request)
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
                    RoleNames.HostSecretary
                );

                Arena.UpdateArena(request);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Update Arena: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון מגרש");
            }
        }

        [HttpDelete]
        public IActionResult Delete([FromQuery] int ranchId, [FromQuery] short arenaId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                Arena.DeleteArena(ranchId, arenaId);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Delete Arena: {ex.Message}");
                return BadRequest("אירעה שגיאה במחיקת מגרש");
            }
        }
    }
}