using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;

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
                if (UserAccessValidator.IsSuperUser(User))
                {
                    List<ClassType> superUserList = ClassType.GetAllClassTypes(fieldId);
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בסוגי מקצים");
                }

                List<ClassType> list = ClassType.GetAllClassTypes(fieldId);
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
        public IActionResult Create([FromBody] ClassType classType)
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
                        return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה ליצור סוג מקצה");
                    }
                }

                int id = ClassType.CreateClassType(
                    classType.FieldId,
                    classType.ClassName,
                    classType.JudgingSheetFormat,
                    classType.QualificationDescription
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
        public IActionResult Update([FromBody] ClassType classType)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                ClassType.UpdateClassType(
                    classType.ClassTypeId,
                    classType.FieldId,
                    classType.ClassName,
                    classType.JudgingSheetFormat,
                    classType.QualificationDescription
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
        public IActionResult Delete(short id)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                ClassType.DeleteClassType(id);
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