using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FinesController : ControllerBase
    {
        [Authorize]
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                if (UserAccessValidator.IsSuperUser(User))
                {
                    List<Fine> superUserList = Fine.GetAllFines();
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בקנסות");
                }

                List<Fine> list = Fine.GetAllFines();
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
        public IActionResult Create([FromBody] Fine fine)
        {
            try
            {
                if (!UserAccessValidator.IsSuperUser(User))
                {
                    int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                    List<ApprovedRoleRanch> approvedRoles =
                        SystemUser.GetApprovedPersonRanchesAndRoles(personId);

                    bool hasSecretaryRole = approvedRoles.Any(item =>
                        !string.IsNullOrWhiteSpace(item.RoleName) &&
                        item.RoleName.Trim().Equals(RoleNames.HostSecretary, StringComparison.OrdinalIgnoreCase));

                    if (!hasSecretaryRole)
                    {
                        return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה ליצור קנס");
                    }
                }

                int id = Fine.CreateFine(
                    fine.FineName,
                    fine.FineDescription,
                    fine.FineAmount
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
        public IActionResult Update([FromBody] Fine fine)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                Fine.UpdateFine(
                    fine.FineId,
                    fine.FineName,
                    fine.FineDescription,
                    fine.FineAmount
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
        public IActionResult Delete(int id)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                Fine.DeleteFine(id);
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