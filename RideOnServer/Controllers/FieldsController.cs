using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class FieldsController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                if (UserAccessValidator.IsSuperUser(User))
                {
                    var superUserList = Field.GetAllFields();
                    return Ok(superUserList);
                }

                int personId = UserAccessValidator.GetPersonIdFromClaims(User);

                List<ApprovedRoleRanch> approvedRoles =
                    SystemUser.GetApprovedPersonRanchesAndRoles(personId);

                bool hasSecretaryRole = approvedRoles.Any(item =>
                    !string.IsNullOrWhiteSpace(item.RoleName) &&
                    item.RoleName.Trim().Equals(
                        RoleNames.HostSecretary,
                        StringComparison.OrdinalIgnoreCase
                    )
                );

                if (!hasSecretaryRole)
                {
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בענפים");
                }

                var list = Field.GetAllFields();
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAll Fields: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת ענפים");
            }
        }

        [HttpPost]
        public IActionResult Create([FromBody] Field field)
        {
            try
            {
                if (field == null)
                {
                    return BadRequest("Invalid request");
                }

                UserAccessValidator.EnsureSuperUser(User);

                int id = Field.CreateField(field.FieldName);
                return Ok(id);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Create Field: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת ענף");
            }
        }

        [HttpPut]
        public IActionResult Update([FromBody] Field field)
        {
            try
            {
                if (field == null)
                {
                    return BadRequest("Invalid request");
                }

                UserAccessValidator.EnsureSuperUser(User);

                Field.UpdateField(field.FieldId, field.FieldName);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Update Field: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון ענף");
            }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(short id)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                Field.DeleteField(id);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Delete Field: {ex.Message}");
                return BadRequest("אירעה שגיאה במחיקת ענף");
            }
        }
    }
}