using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.StallCompounds;
using RideOnServer.BL.DTOs.StallMap;
using RideOnServer.DAL;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StallCompoundsController : ControllerBase
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

                var list = StallCompound.GetCompoundsSummaryByRanchId(ranchId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetByRanchId: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת מתחמי תאים");
            }
        }

        [HttpPost]
        public IActionResult Create([FromBody] CreateCompoundWithStallsRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request");

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                int id = StallCompound.CreateCompoundWithStalls(request);
                return Ok(id);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Create: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת מתחם תאים");
            }
        }

        [HttpPut]
        public IActionResult UpdateName(
            [FromQuery] int ranchId,
            [FromQuery] short compoundId,
            [FromQuery] string compoundName)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                StallCompound.UpdateCompoundName(ranchId, compoundId, compoundName);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateName: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון שם המתחם");
            }
        }

        [HttpDelete]
        public IActionResult Delete([FromQuery] int ranchId, [FromQuery] short compoundId)
        {
            try
            {
                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    ranchId,
                    RoleNames.HostSecretary
                );

                StallCompound.DeleteCompound(ranchId, compoundId);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Delete: {ex.Message}");
                return BadRequest("אירעה שגיאה במחיקת מתחם תאים");
            }
        }

        [HttpPost("layout")]
        public IActionResult SaveLayout([FromBody] SaveLayoutRequest request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Invalid request");

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                UserAccessValidator.EnsureUserHasRoleInRanch(
                    personId,
                    request.RanchId,
                    RoleNames.HostSecretary
                );

                var dal = new StallAssignmentDAL();
                dal.SaveCompoundLayout(request.RanchId, request.CompoundId, request.LayoutJson);

                return Ok("Layout saved");
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in SaveLayout: {ex.Message}");
                return BadRequest("אירעה שגיאה בשמירת פריסת המתחם");
            }
        }
    }
}