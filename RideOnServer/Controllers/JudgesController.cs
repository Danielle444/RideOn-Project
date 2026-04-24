using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RideOnServer.BL;
using RideOnServer.BL.DTOs.Auth;
using RideOnServer.BL.DTOs.Auth.SuperUser;

namespace RideOnServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class JudgesController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetAll([FromQuery] byte? fieldId = null)
        {
            try
            {
                if (UserAccessValidator.IsSuperUser(User))
                {
                    List<Judge> superUserList = Judge.GetAllJudges(fieldId);
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
                    return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה לצפות בשופטים");
                }

                List<Judge> list = Judge.GetAllJudges(fieldId);
                return Ok(list);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAll Judges: {ex.Message}");
                return BadRequest("אירעה שגיאה בשליפת שופטים");
            }
        }

        [HttpPost]
        public IActionResult Create([FromBody] UpsertJudgeRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                if (!UserAccessValidator.IsSuperUser(User))
                {
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
                        return StatusCode(StatusCodes.Status403Forbidden, "אין לך הרשאה ליצור שופט");
                    }
                }

                int judgeId = Judge.CreateJudge(
                    request.FirstNameHebrew,
                    request.LastNameHebrew,
                    request.FirstNameEnglish,
                    request.LastNameEnglish,
                    request.Country,
                    request.FieldIdsCsv
                );

                return Ok(judgeId);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Create Judge: {ex.Message}");
                return BadRequest("אירעה שגיאה ביצירת שופט");
            }
        }

        [HttpPut]
        public IActionResult Update([FromBody] UpsertJudgeRequest request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Invalid request");
                }

                UserAccessValidator.EnsureSuperUser(User);

                Judge.UpdateJudge(
                    request.JudgeId,
                    request.FirstNameHebrew,
                    request.LastNameHebrew,
                    request.FirstNameEnglish,
                    request.LastNameEnglish,
                    request.Country,
                    request.FieldIdsCsv
                );

                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Update Judge: {ex.Message}");
                return BadRequest("אירעה שגיאה בעדכון שופט");
            }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                UserAccessValidator.EnsureSuperUser(User);

                Judge.DeleteJudge(id);
                return Ok();
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in Delete Judge: {ex.Message}");
                return BadRequest("אירעה שגיאה במחיקת שופט");
            }
        }
    }
}