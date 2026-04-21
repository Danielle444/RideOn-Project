using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;

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
                if (UserAccessValidator.IsSuperUser(User))
                {
                    List<PrizeType> superUserList = PrizeType.GetAllPrizeTypes();
                    return Ok(superUserList);
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                List<ApprovedRoleRanch> approvedRoles =
                    SystemUser.GetApprovedPersonRanchesAndRoles(personId);

                bool hasSecretaryRole = approvedRoles.Any(item =>
                    !string.IsNullOrWhiteSpace(item.RoleName) &&
                    item.RoleName.Trim().Equals(RoleNames.HostSecretary, StringComparison.OrdinalIgnoreCase));

                if (!hasSecretaryRole)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בסוגי פרסים");
                }

                List<PrizeType> list = PrizeType.GetAllPrizeTypes();
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
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
                UserAccessValidator.EnsureSuperUser(User);

                int id = PrizeType.CreatePrizeType(
                    prizeType.PrizeTypeName,
                    prizeType.PrizeDescription
                );

                return Ok(id);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
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
                UserAccessValidator.EnsureSuperUser(User);

                PrizeType.UpdatePrizeType(
                    prizeType.PrizeTypeId,
                    prizeType.PrizeTypeName,
                    prizeType.PrizeDescription
                );

                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
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
                UserAccessValidator.EnsureSuperUser(User);

                PrizeType.DeletePrizeType(id);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}